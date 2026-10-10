import { describe, expect, it } from 'vitest'
import type { EnrichResult } from './enrich.ts'
import type { Film, LetterboxdExport, RatedFilm } from './letterboxd.ts'
import {
  computeStats,
  diaryYears,
  filterByYear,
  ratingDistribution,
  sortGroups,
  type GroupStat,
} from './stats.ts'
import type { Person, TmdbFilm } from './tmdb.ts'

// --- Test data helpers -------------------------------------------------------

function film(id: string, year: number | null = 2000): Film {
  return { date: '2024-01-01', name: `Film ${id}`, year, letterboxdUri: id }
}

function rated(id: string, rating: number, year: number | null = 2000): RatedFilm {
  return { ...film(id, year), rating }
}

/** An export with only the parts a test cares about; the rest are empty. */
function exportOf(parts: Partial<LetterboxdExport>): LetterboxdExport {
  return { ratings: [], watched: [], diary: [], ...parts }
}

function tmdbFilm(
  genres: string[],
  cast: Person[] = [],
  directors: Person[] = [],
): TmdbFilm {
  return { tmdbId: 1, title: '', genres, cast, directors }
}

const ana: Person = { id: 1, name: 'Ana' }
const bob: Person = { id: 2, name: 'Bob' }

function enriched(byUri: Record<string, TmdbFilm>): EnrichResult {
  return { byUri, unmatched: [], failed: [] }
}

function group(label: string, average: number | null, rated = 1): GroupStat {
  return { key: label, label, films: rated, rated, average, filmList: [] }
}

const labels = (groups: GroupStat[]) => groups.map((g) => g.label)

// --- ratingDistribution ------------------------------------------------------

describe('ratingDistribution', () => {
  it('has one bin per half star, empty ones included', () => {
    const bins = ratingDistribution([{ rating: 0.5 }, { rating: 4 }, { rating: 4 }])
    expect(bins).toHaveLength(10)
    expect(bins[0]).toEqual({ rating: 0.5, count: 1 })
    expect(bins[7]).toEqual({ rating: 4, count: 2 })
    expect(bins[9]).toEqual({ rating: 5, count: 0 })
  })
})

// --- sortGroups --------------------------------------------------------------

describe('sortGroups', () => {
  it('sorts names numerically, so 1990s comes before 2000s', () => {
    const groups = [group('2000s', 3), group('1990s', 4), group('1920s', 2)]
    expect(labels(sortGroups(groups, 'name', 'asc'))).toEqual(['1920s', '1990s', '2000s'])
  })

  it('keeps groups without an average last in both directions', () => {
    const groups = [group('None', null, 0), group('Low', 2), group('High', 4)]
    expect(labels(sortGroups(groups, 'average', 'desc'))).toEqual(['High', 'Low', 'None'])
    expect(labels(sortGroups(groups, 'average', 'asc'))).toEqual(['Low', 'High', 'None'])
  })

  it('breaks ties by average, then rated, then name', () => {
    const groups = [
      { ...group('B', 3, 2), films: 5 },
      { ...group('A', 3, 2), films: 5 },
      { ...group('C', 4, 1), films: 5 },
    ]
    expect(labels(sortGroups(groups, 'films', 'desc'))).toEqual(['C', 'A', 'B'])
  })

  it('does not change the original array', () => {
    const groups = [group('B', 1), group('A', 2)]
    sortGroups(groups, 'name', 'asc')
    expect(labels(groups)).toEqual(['B', 'A'])
  })
})

// --- Years -------------------------------------------------------------------

describe('diaryYears', () => {
  it('lists each year once, newest first', () => {
    const data = exportOf({
      diary: [
        { letterboxdUri: 'a', watchedDate: '2024-05-01' },
        { letterboxdUri: 'b', watchedDate: '2026-01-02' },
        { letterboxdUri: 'c', watchedDate: '2024-12-31' },
      ],
    })
    expect(diaryYears(data)).toEqual([2026, 2024])
  })

  it('is empty without a diary', () => {
    expect(diaryYears(exportOf({ watched: [film('a')] }))).toEqual([])
  })
})

describe('filterByYear', () => {
  const data = exportOf({
    ratings: [rated('a', 4), rated('b', 2)],
    watched: [film('a'), film('b'), film('c'), film('never-logged')],
    diary: [
      { letterboxdUri: 'a', watchedDate: '2025-03-01' },
      { letterboxdUri: 'b', watchedDate: '2026-07-01' },
      { letterboxdUri: 'c', watchedDate: '2025-11-20' },
      { letterboxdUri: 'a', watchedDate: '2026-02-14' }, // a rewatch
    ],
  })

  it('keeps only films logged in that year', () => {
    const year = filterByYear(data, 2025)
    expect(year.watched.map((f) => f.letterboxdUri)).toEqual(['a', 'c'])
    expect(year.ratings.map((f) => f.letterboxdUri)).toEqual(['a'])
    expect(year.diary).toHaveLength(2)
  })

  it('counts a rewatched film in each year', () => {
    expect(filterByYear(data, 2026).watched.map((f) => f.letterboxdUri)).toEqual(['a', 'b'])
  })

  it('is empty for a year with no diary entries', () => {
    expect(filterByYear(data, 1999)).toEqual(exportOf({}))
  })
})

// --- computeStats ------------------------------------------------------------

describe('computeStats', () => {
  it('counts each film once, even if it is both watched and rated', () => {
    const data = exportOf({
      ratings: [rated('a', 4)],
      watched: [film('a'), film('b')],
    })
    const stats = computeStats(data, enriched({}))
    expect(stats.totalFilms).toBe(2)
    expect(stats.matchedFilms).toBe(0)
    expect(stats.averageRating).toBe(4)
  })

  it('averages only rated films', () => {
    const data = exportOf({
      ratings: [rated('a', 4), rated('b', 2)],
      watched: [film('a'), film('b'), film('c')],
    })
    const drama = tmdbFilm(['Drama'])
    const stats = computeStats(data, enriched({ a: drama, b: drama, c: drama }))

    expect(stats.genres).toHaveLength(1)
    expect(stats.genres[0]).toMatchObject({ label: 'Drama', films: 3, rated: 2, average: 3 })
    expect(stats.genres[0].filmList.map((f) => f.rating)).toEqual([4, 2, null])
  })

  it('leaves films not found on TMDB out of genres, but not out of decades', () => {
    const data = exportOf({ ratings: [rated('a', 5, 1995), rated('b', 3, 2004)] })
    const stats = computeStats(data, enriched({ a: tmdbFilm(['Crime']) }))

    expect(labels(stats.genres)).toEqual(['Crime'])
    expect(labels(stats.decades)).toEqual(['1990s', '2000s'])
  })

  it('skips films without a year in the decades', () => {
    const data = exportOf({ ratings: [rated('a', 3, null)] })
    expect(computeStats(data, enriched({})).decades).toEqual([])
  })

  it('lists actors only with at least 3 rated films', () => {
    const data = exportOf({ ratings: [rated('a', 5), rated('b', 4), rated('c', 3)] })
    const stats = computeStats(
      data,
      enriched({
        a: tmdbFilm([], [ana, bob]),
        b: tmdbFilm([], [ana, bob]),
        c: tmdbFilm([], [ana]),
      }),
    )
    expect(labels(stats.actors)).toEqual(['Ana'])
    expect(stats.actors[0].average).toBe(4)
  })

  it('counts a person once per film, even if listed twice', () => {
    const data = exportOf({ ratings: [rated('a', 5), rated('b', 3)] })
    const stats = computeStats(
      data,
      enriched({ a: tmdbFilm([], [], [bob, bob]), b: tmdbFilm([], [], [bob]) }),
    )
    expect(stats.directors[0]).toMatchObject({ label: 'Bob', films: 2, average: 4 })
  })

  it('has no average rating without ratings', () => {
    const data = exportOf({ watched: [film('a')] })
    expect(computeStats(data, enriched({})).averageRating).toBeNull()
  })
})
