import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchTmdbFilm,
  isTmdbFilm,
  isTokenFormat,
  TmdbAuthError,
  type TmdbFilm,
} from './tmdb.ts'

const FILM: TmdbFilm = {
  tmdbId: 949,
  title: 'Heat',
  genres: ['Crime', 'Drama'],
  cast: [{ id: 1158, name: 'Al Pacino' }],
  directors: [{ id: 1, name: 'Michael Mann' }],
  voteAverage: 7.9,
  voteCount: 7000,
  runtime: 170,
}

describe('isTmdbFilm', () => {
  it('accepts a well-formed film', () => {
    expect(isTmdbFilm(FILM)).toBe(true)
    expect(isTmdbFilm({ ...FILM, voteAverage: null, runtime: null })).toBe(true)
  })

  it('rejects anything that is not a film', () => {
    for (const value of [null, undefined, 42, 'text', [], {}]) {
      expect(isTmdbFilm(value)).toBe(false)
    }
  })

  it('rejects a film with a damaged field', () => {
    expect(isTmdbFilm({ ...FILM, genres: 'Drama' })).toBe(false)
    expect(isTmdbFilm({ ...FILM, genres: [1] })).toBe(false)
    expect(isTmdbFilm({ ...FILM, cast: [{ id: '1', name: 'X' }] })).toBe(false)
    expect(isTmdbFilm({ ...FILM, directors: null })).toBe(false)
    expect(isTmdbFilm({ ...FILM, runtime: '170' })).toBe(false)
    expect(isTmdbFilm({ ...FILM, voteCount: undefined })).toBe(false)
  })

  it('rejects a film from the old cache version (no runtime or votes)', () => {
    const { runtime: _runtime, voteCount: _voteCount, voteAverage: _voteAverage, ...old } = FILM
    expect(isTmdbFilm(old)).toBe(false)
  })
})

// --- fetchTmdbFilm -------------------------------------------------------

const HEAT = { date: '', name: 'Heat', year: 1995, letterboxdUri: 'https://boxd.it/a' }
const LONG_TOKEN = 'x'.repeat(60)
const SHORT_TOKEN = 'a'.repeat(32)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

const MOVIE = {
  id: 949,
  title: 'Heat',
  genres: [
    { id: 1, name: 'Crime' },
    { id: 2, name: 'Drama' },
  ],
  vote_average: 7.9,
  vote_count: 7000,
  runtime: 170,
  credits: {
    cast: [{ id: 1158, name: 'Al Pacino' }],
    crew: [
      { id: 1, name: 'Michael Mann', job: 'Director' },
      { id: 2, name: 'Someone', job: 'Editor' },
    ],
  },
}

/** Answers search requests with `results` and movie requests with `movie`. */
function stubTmdb(results: unknown, movie: unknown) {
  const fetchMock = vi.fn(async (input: URL | string) => {
    const path = new URL(input).pathname
    return path.endsWith('/search/movie') ? json({ results }) : json(movie)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('fetchTmdbFilm', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('turns a TMDB movie into a TmdbFilm', async () => {
    stubTmdb([{ id: 949, release_date: '1995-12-15' }], MOVIE)
    expect(await fetchTmdbFilm(HEAT, LONG_TOKEN)).toEqual(FILM)
  })

  it('copes with parts missing from the movie page', async () => {
    stubTmdb([{ id: 949 }], { id: 949, title: 'Heat', genres: null, credits: null })
    const film = await fetchTmdbFilm(HEAT, LONG_TOKEN)
    expect(film).toEqual({
      tmdbId: 949,
      title: 'Heat',
      genres: [],
      cast: [],
      directors: [],
      voteAverage: null,
      voteCount: 0,
      runtime: null,
    })
    expect(isTmdbFilm(film)).toBe(true)
  })

  it('drops cast members and genres of the wrong shape', async () => {
    stubTmdb([{ id: 949 }], {
      ...MOVIE,
      genres: [{ id: 1, name: 'Crime' }, null, { id: 2 }],
      credits: { cast: [{ id: 'x', name: 'Bad' }, null, { id: 5, name: 'Good' }], crew: null },
    })
    const film = await fetchTmdbFilm(HEAT, LONG_TOKEN)
    expect(film?.genres).toEqual(['Crime'])
    expect(film?.cast).toEqual([{ id: 5, name: 'Good' }])
  })

  it('stores 0 votes and 0 minutes as unknown', async () => {
    stubTmdb([{ id: 949 }], { ...MOVIE, vote_count: 0, vote_average: 0, runtime: 0 })
    const film = await fetchTmdbFilm(HEAT, LONG_TOKEN)
    expect(film).toMatchObject({ voteAverage: null, voteCount: 0, runtime: null })
  })

  it('returns null when TMDB has no match', async () => {
    stubTmdb([], MOVIE)
    expect(await fetchTmdbFilm(HEAT, LONG_TOKEN)).toBeNull()
  })

  it('returns null when the search answer has no results list', async () => {
    stubTmdb(undefined, MOVIE)
    expect(await fetchTmdbFilm(HEAT, LONG_TOKEN)).toBeNull()
  })

  it('accepts a release year one off, but not two', async () => {
    const calls = (year: string) => {
      const fetchMock = vi.fn(async (input: URL | string) => {
        const url = new URL(input)
        if (url.pathname.endsWith('/search/movie')) {
          // The search with a year finds nothing; the one without finds a film.
          const results = url.searchParams.has('primary_release_year')
            ? []
            : [{ id: 949, release_date: year }]
          return json({ results })
        }
        return json(MOVIE)
      })
      vi.stubGlobal('fetch', fetchMock)
    }
    calls('1996-01-01')
    expect(await fetchTmdbFilm(HEAT, LONG_TOKEN)).not.toBeNull()
    calls('1997-01-01')
    expect(await fetchTmdbFilm(HEAT, LONG_TOKEN)).toBeNull()
  })

  it('sends a long token as a header and a short one in the URL', async () => {
    const fetchMock = stubTmdb([], MOVIE)
    await fetchTmdbFilm(HEAT, LONG_TOKEN)
    const [longUrl, longInit] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(new Headers(longInit.headers).get('Authorization')).toBe(`Bearer ${LONG_TOKEN}`)
    expect(longUrl.searchParams.has('api_key')).toBe(false)

    fetchMock.mockClear()
    await fetchTmdbFilm(HEAT, SHORT_TOKEN)
    const [shortUrl] = fetchMock.mock.calls[0] as unknown as [URL]
    expect(shortUrl.searchParams.get('api_key')).toBe(SHORT_TOKEN)
  })

  it('throws TmdbAuthError when the key is rejected', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({}, 401)))
    await expect(fetchTmdbFilm(HEAT, LONG_TOKEN)).rejects.toBeInstanceOf(TmdbAuthError)
  })

  it('retries after a 429 and then succeeds', async () => {
    vi.useFakeTimers()
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: URL | string) => {
        calls++
        if (calls <= 2) {
          return json({}, 429)
        }
        const path = new URL(input).pathname
        return path.endsWith('/search/movie') ? json({ results: [{ id: 949 }] }) : json(MOVIE)
      }),
    )
    const promise = fetchTmdbFilm(HEAT, LONG_TOKEN)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(await promise).toEqual(FILM)
    expect(calls).toBe(4) // 2 rate-limited, then the search and the movie page
  })

  it('retries a network error, then gives up with it', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    vi.stubGlobal('fetch', fetchMock)
    const outcome = expect(fetchTmdbFilm(HEAT, LONG_TOKEN)).rejects.toThrow('Failed to fetch')
    await vi.advanceTimersByTimeAsync(10_000)
    await outcome
    expect(fetchMock).toHaveBeenCalledTimes(4) // first try + 3 retries
  })

  it('fails on a server error without retrying', async () => {
    const fetchMock = vi.fn(async () => json({}, 500))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchTmdbFilm(HEAT, LONG_TOKEN)).rejects.toThrow('500')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('isTokenFormat', () => {
  it('accepts real-looking keys and rejects pasted junk', () => {
    expect(isTokenFormat('a'.repeat(32))).toBe(true)
    expect(isTokenFormat('eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJ4In0.c2lnbmF0dXJl')).toBe(true)
    expect(isTokenFormat('')).toBe(false)
    expect(isTokenFormat('short')).toBe(false)
    expect(isTokenFormat('has a space in it 1234567890')).toBe(false)
    expect(isTokenFormat('"quoted-key-1234567890abcdef"')).toBe(false)
    expect(isTokenFormat('ključ-ključ-ključ-ključ')).toBe(false)
  })
})

describe('isTmdbFilm with impossible numbers', () => {
  it('rejects negative runtimes and vote counts, and averages outside 0–10', () => {
    expect(isTmdbFilm({ ...FILM, runtime: -90 })).toBe(false)
    expect(isTmdbFilm({ ...FILM, voteCount: -1 })).toBe(false)
    expect(isTmdbFilm({ ...FILM, voteAverage: 11 })).toBe(false)
    expect(isTmdbFilm({ ...FILM, voteAverage: NaN })).toBe(false)
    expect(isTmdbFilm({ ...FILM, runtime: Infinity })).toBe(false)
  })
})
