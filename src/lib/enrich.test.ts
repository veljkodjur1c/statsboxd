import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enrichFilms } from './enrich.ts'
import type { Film } from './letterboxd.ts'
import { TmdbAuthError } from './tmdb.ts'

const TOKEN = 'x'.repeat(60)
const CACHE_KEY = 'statsboxd:tmdb:v2'

const film = (n: number): Film => ({
  date: '',
  name: `Film ${n}`,
  year: 2000,
  letterboxdUri: `https://boxd.it/${n}`,
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

/** Film N is found with TMDB id N; the name is "Film N". */
function movieFor(id: number) {
  return {
    id,
    title: `Film ${id}`,
    genres: [{ id: 1, name: 'Drama' }],
    vote_average: 7,
    vote_count: 100,
    runtime: 90,
    credits: { cast: [], crew: [] },
  }
}

// Returns a Response to answer the request itself, or undefined to let the
// default fake answer it.
type Handler = (url: URL) => Response | undefined

/** A fake TMDB: searches find "Film N" as id N unless `missing` has N. */
function fakeTmdb(options: { missing?: number[]; handler?: Handler } = {}) {
  const fetchMock = vi.fn(async (input: URL | string) => {
    const url = new URL(input)
    if (options.handler) {
      const custom = options.handler(url)
      if (custom) {
        return custom
      }
    }
    if (url.pathname.endsWith('/search/movie')) {
      const id = Number(url.searchParams.get('query')?.replace('Film ', ''))
      return json({ results: options.missing?.includes(id) ? [] : [{ id, release_date: '2000-01-01' }] })
    }
    return json(movieFor(Number(url.pathname.split('/').pop())))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** A stand-in for the browser's localStorage, backed by a Map. */
function memoryStorage() {
  const items = new Map<string, string>()
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  }
}

const noProgress = () => {}

describe('enrichFilms', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('looks every film up once and reports progress', async () => {
    fakeTmdb()
    const progress: [number, number][] = []
    const result = await enrichFilms([film(1), film(2), film(2)], TOKEN, (done, total) =>
      progress.push([done, total]),
    )
    expect(Object.keys(result.byUri).sort()).toEqual(['https://boxd.it/1', 'https://boxd.it/2'])
    expect(result.unmatched).toEqual([])
    expect(result.failed).toEqual([])
    expect(progress.at(-1)).toEqual([2, 2]) // the duplicate counted once
  })

  it('uses the cache on the second run, without any request', async () => {
    const fetchMock = fakeTmdb()
    await enrichFilms([film(1), film(2)], TOKEN, noProgress)
    fetchMock.mockClear()
    const result = await enrichFilms([film(1), film(2)], TOKEN, noProgress)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(Object.keys(result.byUri)).toHaveLength(2)
  })

  it('reports films TMDB does not know, and remembers that', async () => {
    const fetchMock = fakeTmdb({ missing: [2] })
    const first = await enrichFilms([film(1), film(2)], TOKEN, noProgress)
    expect(first.unmatched.map((f) => f.name)).toEqual(['Film 2'])

    fetchMock.mockClear()
    const second = await enrichFilms([film(1), film(2)], TOKEN, noProgress)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(second.unmatched.map((f) => f.name)).toEqual(['Film 2'])
  })

  it('collects failed films, does not cache them, and retries them later', async () => {
    fakeTmdb({
      handler: (url) =>
        url.pathname.endsWith('/movie/2') ? json({}, 500) : undefined,
    })
    const first = await enrichFilms([film(1), film(2), film(3)], TOKEN, noProgress)
    expect(first.failed.map((f) => f.name)).toEqual(['Film 2'])
    expect(Object.keys(first.byUri)).toHaveLength(2)

    // TMDB recovers: only the failed film is requested again.
    const fetchMock = fakeTmdb()
    const second = await enrichFilms([film(1), film(2), film(3)], TOKEN, noProgress)
    expect(second.failed).toEqual([])
    const paths = fetchMock.mock.calls.map(([input]) => new URL(input).pathname)
    expect(paths.every((path) => path.endsWith('/2') || path.endsWith('/search/movie'))).toBe(true)
    expect(Object.keys(second.byUri)).toHaveLength(3)
  })

  it('throws TmdbAuthError when the key is rejected, keeping nothing wrong', async () => {
    fakeTmdb({ handler: () => json({}, 401) })
    await expect(enrichFilms([film(1), film(2)], TOKEN, noProgress)).rejects.toBeInstanceOf(
      TmdbAuthError,
    )
  })

  it('gives up after 8 failures in a row; unfinished films count as failed', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    vi.stubGlobal('fetch', fetchMock)
    const films = Array.from({ length: 30 }, (_, index) => film(index + 1))

    const promise = enrichFilms(films, TOKEN, noProgress)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.failed).toHaveLength(30)
    expect(result.byUri).toEqual({})
    // Without giving up: 30 films x 4 attempts = 120 requests.
    expect(fetchMock.mock.calls.length).toBeLessThan(60)
  })

  it('ignores damaged cache entries and fetches those films again', async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        'https://boxd.it/1': { tmdbId: 'oops', genres: 'Drama' },
        'https://boxd.it/2': null,
      }),
    )
    const fetchMock = fakeTmdb()
    const result = await enrichFilms([film(1), film(2)], TOKEN, noProgress)
    expect(result.byUri['https://boxd.it/1']?.title).toBe('Film 1') // refetched
    expect(result.unmatched.map((f) => f.name)).toEqual(['Film 2']) // cached null
    const searched = fetchMock.mock.calls.map(([input]) => new URL(input).searchParams.get('query'))
    expect(searched).not.toContain('Film 2')
  })

  it('survives a cache that is not an object, or not JSON', async () => {
    for (const raw of ['[1,2]', '42', 'not json', 'null']) {
      localStorage.setItem(CACHE_KEY, raw)
      fakeTmdb()
      const result = await enrichFilms([film(1)], TOKEN, noProgress)
      expect(Object.keys(result.byUri)).toEqual(['https://boxd.it/1'])
    }
  })

  it('works when localStorage is blocked', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    })
    fakeTmdb()
    const result = await enrichFilms([film(1)], TOKEN, noProgress)
    expect(Object.keys(result.byUri)).toHaveLength(1)
  })

  it('handles an empty film list', async () => {
    const fetchMock = fakeTmdb()
    const result = await enrichFilms([], TOKEN, noProgress)
    expect(result).toEqual({ byUri: {}, unmatched: [], failed: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
