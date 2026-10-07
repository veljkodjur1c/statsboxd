import type { Film } from './letterboxd.ts'
import { fetchTmdbFilm, TmdbAuthError, type TmdbFilm } from './tmdb.ts'

// Bump the version when the shape of TmdbFilm changes, so old entries are ignored.
const CACHE_KEY = 'statsboxd:tmdb:v1'
// Each film takes 2 TMDB calls, and the browser sends an extra preflight
// request before each of them. 4 workers stays close to TMDB's rate limit.
const CONCURRENCY = 4
// Give up early (e.g. when offline) instead of failing every film slowly.
const MAX_CONSECUTIVE_FAILURES = 8

// Keyed by Letterboxd URI. null means "TMDB has no match", which we remember
// too, so we don't search for the same film again on every upload.
type Cache = Record<string, TmdbFilm | null>

export type EnrichResult = {
  byUri: Record<string, TmdbFilm>
  unmatched: Film[] // TMDB has no match
  failed: Film[] // request failed (network, server); not cached, can be retried
}

function loadCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Cache) : {}
  } catch {
    return {} // storage blocked or corrupted: start with an empty cache
  }
}

function saveCache(cache: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Storage full or blocked: we just fetch everything again next time.
  }
}

const byName = (a: Film, b: Film) => a.name.localeCompare(b.name)

/**
 * Fetches TMDB details for every film (once per unique Letterboxd URI),
 * using the browser cache where possible. Throws TmdbAuthError if the key
 * is rejected.
 */
export async function enrichFilms(
  films: Film[],
  token: string,
  onProgress: (done: number, total: number) => void,
): Promise<EnrichResult> {
  const unique = [...new Map(films.map((film) => [film.letterboxdUri, film])).values()]
  const total = unique.length
  const cache = loadCache()
  const result: EnrichResult = { byUri: {}, unmatched: [], failed: [] }

  function record(film: Film, tmdb: TmdbFilm | null) {
    if (tmdb === null) {
      result.unmatched.push(film)
    } else {
      result.byUri[film.letterboxdUri] = tmdb
    }
  }

  const pending: Film[] = []
  for (const film of unique) {
    const cached = cache[film.letterboxdUri]
    if (cached === undefined) {
      pending.push(film)
    } else {
      record(film, cached)
    }
  }

  let done = total - pending.length
  onProgress(done, total)

  // A "worker" repeatedly takes the next film from the shared queue. Running
  // several workers at once means several requests in flight, but never more
  // than CONCURRENCY. JavaScript is single-threaded, so `next++` is safe.
  let next = 0
  let consecutiveFailures = 0
  const abort: { error: TmdbAuthError | null; gaveUp: boolean } = {
    error: null,
    gaveUp: false,
  }

  async function worker() {
    while (abort.error === null && !abort.gaveUp) {
      const film = pending[next++]
      if (film === undefined) {
        return
      }
      try {
        const tmdb = await fetchTmdbFilm(film, token)
        cache[film.letterboxdUri] = tmdb
        record(film, tmdb)
        consecutiveFailures = 0
      } catch (error) {
        if (error instanceof TmdbAuthError) {
          abort.error = error
          return
        }
        result.failed.push(film)
        consecutiveFailures++
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          abort.gaveUp = true
        }
      }
      done++
      onProgress(done, total)
    }
  }

  try {
    const workerCount = Math.min(CONCURRENCY, pending.length)
    await Promise.all(Array.from({ length: workerCount }, worker))
  } finally {
    saveCache(cache) // keep what we got, even if we stopped halfway
  }

  if (abort.error !== null) {
    throw abort.error
  }
  // Films we never got to count as failed, so "Retry" picks them up.
  result.failed.push(...pending.slice(next))

  result.unmatched.sort(byName)
  result.failed.sort(byName)
  return result
}
