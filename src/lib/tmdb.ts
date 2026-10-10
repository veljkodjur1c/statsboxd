import type { Film } from './letterboxd.ts'

export type Person = {
  id: number
  name: string
}

export type TmdbFilm = {
  tmdbId: number
  title: string
  genres: string[]
  cast: Person[] // top-billed actors first
  directors: Person[]
  voteAverage: number | null // TMDB users' average, 0–10; null if nobody voted
  voteCount: number
  runtime: number | null // minutes; null if TMDB doesn't know
}

const API_BASE = 'https://api.themoviedb.org/3'
const USER_TOKEN_KEY = 'statsboxd:tmdbToken'
const CAST_LIMIT = 15
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 500

/** Thrown when TMDB answers 401: the API key is missing or invalid. */
export class TmdbAuthError extends Error {
  constructor() {
    super('TMDB rejected the API key.')
    this.name = 'TmdbAuthError'
  }
}

// --- API key -------------------------------------------------------------

export function getUserToken(): string | null {
  try {
    return localStorage.getItem(USER_TOKEN_KEY)
  } catch {
    return null // storage blocked
  }
}

/** Returns false if the browser refused to store the key. */
export function saveUserToken(token: string): boolean {
  try {
    localStorage.setItem(USER_TOKEN_KEY, token.trim())
    return true
  } catch {
    return false
  }
}

export function clearUserToken() {
  try {
    localStorage.removeItem(USER_TOKEN_KEY)
  } catch {
    // nothing to clear if storage is unavailable
  }
}

/** The user's own key wins; otherwise the one built into the app (if any). */
export function getTmdbToken(): string | null {
  const builtIn = import.meta.env.VITE_TMDB_TOKEN?.trim()
  return getUserToken() ?? (builtIn ? builtIn : null)
}

// TMDB has two credential types. The long "Read Access Token" (a JWT) goes in
// an Authorization header; the old 32-character "API key" goes in the URL.
function isReadAccessToken(token: string): boolean {
  return token.length > 40
}

// --- HTTP ----------------------------------------------------------------

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function tmdbGet<T>(
  path: string,
  params: Record<string, string>,
  token: string,
): Promise<T> {
  const url = new URL(API_BASE + path)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const headers: Record<string, string> = {}
  if (isReadAccessToken(token)) {
    headers['Authorization'] = `Bearer ${token}`
  } else {
    url.searchParams.set('api_key', token)
  }

  for (let attempt = 0; ; attempt++) {
    let response: Response
    try {
      response = await fetch(url, { headers })
    } catch (error) {
      // When TMDB rate-limits the browser's automatic CORS preflight request,
      // its 429 has no CORS headers, so fetch reports a generic network error
      // instead of a status code. Treat it like a 429: wait and retry.
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * (attempt + 1))
        continue
      }
      throw error
    }
    if (response.status === 401) {
      throw new TmdbAuthError()
    }
    if (response.status === 429 && attempt < MAX_RETRIES) {
      // Rate limited: wait a little longer after every attempt, then retry.
      await sleep(RETRY_DELAY_MS * (attempt + 1))
      continue
    }
    if (!response.ok) {
      throw new Error(`TMDB request failed (${response.status}).`)
    }
    return (await response.json()) as T
  }
}

// --- Films ---------------------------------------------------------------

type SearchResponse = {
  results: { id: number; release_date?: string }[]
}

type MovieResponse = {
  id: number
  title: string
  genres: { id: number; name: string }[]
  vote_average: number
  vote_count: number
  runtime: number | null
  credits: {
    cast: { id: number; name: string }[]
    crew: { id: number; name: string; job: string }[]
  }
}

async function searchMovies(
  params: Record<string, string>,
  token: string,
): Promise<SearchResponse['results']> {
  const response = await tmdbGet<SearchResponse>('/search/movie', params, token)
  return response.results
}

function releaseYear(result: { release_date?: string }): number | null {
  const year = parseInt(result.release_date ?? '', 10)
  return Number.isNaN(year) ? null : year
}

async function findMovieId(film: Film, token: string): Promise<number | null> {
  if (film.year !== null) {
    const exact = await searchMovies(
      { query: film.name, primary_release_year: String(film.year) },
      token,
    )
    if (exact.length > 0) {
      return exact[0].id
    }
  }

  // Letterboxd and TMDB sometimes disagree on the year by one (festival vs.
  // theatrical release), so retry without a year and accept ±1.
  const loose = await searchMovies({ query: film.name }, token)
  if (film.year === null) {
    return loose[0]?.id ?? null
  }
  const filmYear = film.year
  const close = loose.find((result) => {
    const year = releaseYear(result)
    return year !== null && Math.abs(year - filmYear) <= 1
  })
  return close?.id ?? null
}

/** Looks a film up on TMDB. Returns null if TMDB has no match. */
export async function fetchTmdbFilm(
  film: Film,
  token: string,
): Promise<TmdbFilm | null> {
  const id = await findMovieId(film, token)
  if (id === null) {
    return null
  }

  const movie = await tmdbGet<MovieResponse>(
    `/movie/${id}`,
    { append_to_response: 'credits' },
    token,
  )

  const directors = new Map<number, string>()
  for (const member of movie.credits.crew) {
    if (member.job === 'Director') {
      directors.set(member.id, member.name)
    }
  }

  return {
    tmdbId: movie.id,
    title: movie.title,
    genres: movie.genres.map((genre) => genre.name),
    cast: movie.credits.cast
      .slice(0, CAST_LIMIT)
      .map((actor) => ({ id: actor.id, name: actor.name })),
    directors: [...directors].map(([id, name]) => ({ id, name })),
    // TMDB sends 0 (not null) when there are no votes or no runtime.
    voteAverage: movie.vote_count > 0 ? movie.vote_average : null,
    voteCount: movie.vote_count,
    runtime: movie.runtime ? movie.runtime : null,
  }
}
