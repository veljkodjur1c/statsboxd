import { describe, expect, it } from 'vitest'
import type { EnrichResult } from './enrich.ts'
import type { Film, LetterboxdExport, RatedFilm } from './letterboxd.ts'
import {
  computeStats,
  countFilms,
  crowdComparison,
  diaryYears,
  filterByYear,
  latestDiaryEntries,
  latestRatings,
  MIN_CROWD_VOTES,
  ratingDistribution,
  shareSummary,
  sortGroups,
  watchTime,
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
  extra: Partial<TmdbFilm> = {},
): TmdbFilm {
  return {
    tmdbId: 1,
    title: '',
    genres,
    cast,
    directors,
    voteAverage: null,
    voteCount: 0,
    runtime: null,
    ...extra,
  }
}

/** A TMDB match that only matters for its votes or runtime. */
const tmdbWith = (extra: Partial<TmdbFilm>) => tmdbFilm([], [], [], extra)

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

// --- Latest lists ------------------------------------------------------------

describe('latestRatings', () => {
  it('lists the newest ratings first', () => {
    const data = exportOf({
      ratings: [
        { ...rated('a', 4), date: '2025-01-01' },
        { ...rated('b', 3), date: '2026-05-24' },
        { ...rated('c', 5), date: '2025-08-10' },
      ],
    })
    expect(latestRatings(data, 2).map((f) => f.letterboxdUri)).toEqual(['b', 'c'])
  })
})

describe('latestDiaryEntries', () => {
  it('dates films by the day they were watched, not rated', () => {
    // Watched in 2025, re-rated in 2026: the 2025 view must say 2025.
    const data = exportOf({
      ratings: [{ ...rated('a', 4), date: '2026-05-24' }],
      watched: [film('a'), film('b')],
      diary: [
        { letterboxdUri: 'a', watchedDate: '2025-03-01' },
        { letterboxdUri: 'b', watchedDate: '2025-06-01' },
      ],
    })
    expect(latestDiaryEntries(data, 5)).toEqual([
      { letterboxdUri: 'b', name: 'Film b', year: 2000, rating: null, date: '2025-06-01' },
      { letterboxdUri: 'a', name: 'Film a', year: 2000, rating: 4, date: '2025-03-01' },
    ])
  })

  it('puts the last-logged entry first when two share a day', () => {
    const data = exportOf({
      watched: [film('a'), film('b')],
      diary: [
        { letterboxdUri: 'a', watchedDate: '2025-03-01' },
        { letterboxdUri: 'b', watchedDate: '2025-03-01' },
      ],
    })
    expect(latestDiaryEntries(data, 5).map((f) => f.letterboxdUri)).toEqual(['b', 'a'])
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

  it('groups films by runtime in half-hour steps, shortest first', () => {
    const minutes = { a: 89, b: 90, c: 119, d: 120, e: 179, f: 180, g: 240 }
    const data = exportOf({
      ratings: Object.keys(minutes).map((id, i) => rated(id, (i % 5) + 1)),
    })
    const tmdb = enriched(
      Object.fromEntries(
        Object.entries(minutes).map(([id, runtime]) => [id, tmdbWith({ runtime })]),
      ),
    )
    const { runtimes } = computeStats(data, tmdb)

    expect(labels(runtimes)).toEqual([
      '< 90 min',
      '90–119 min',
      '120–149 min',
      '150–179 min',
      '180+ min',
    ])
    expect(runtimes.map((group) => group.films)).toEqual([1, 2, 1, 1, 2])
    // a 1★; b 2★ and c 3★; d 4★; e 5★; f 1★ and g 2★
    expect(runtimes.map((group) => group.average)).toEqual([1, 2.5, 4, 5, 1.5])
  })

  it('leaves films with an unknown runtime out of the runtimes', () => {
    const data = exportOf({ ratings: [rated('a', 4), rated('b', 3), rated('c', 2)] })
    const tmdb = enriched({ a: tmdbWith({ runtime: 100 }), b: tmdbWith({ runtime: null }) })
    const { runtimes } = computeStats(data, tmdb)

    expect(runtimes).toHaveLength(1)
    expect(runtimes[0]).toMatchObject({ label: '90–119 min', films: 1, average: 4 })
  })

  it('keeps the runtimes in order when sorted by name', () => {
    const data = exportOf({ ratings: [rated('a', 3), rated('b', 3), rated('c', 3)] })
    const tmdb = enriched({
      a: tmdbWith({ runtime: 200 }),
      b: tmdbWith({ runtime: 60 }),
      c: tmdbWith({ runtime: 130 }),
    })
    const { runtimes } = computeStats(data, tmdb)

    expect(labels(sortGroups(runtimes, 'name', 'desc'))).toEqual([
      '180+ min',
      '120–149 min',
      '< 90 min',
    ])
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

// --- Watch time and the crowd ------------------------------------------------

describe('watchTime', () => {
  it('adds up runtimes, each film once, skipping unknown ones', () => {
    const data = exportOf({
      ratings: [rated('a', 4)],
      watched: [film('a'), film('b'), film('c'), film('d')],
    })
    const tmdb = enriched({
      a: tmdbWith({ runtime: 120 }),
      b: tmdbWith({ runtime: 95 }),
      c: tmdbWith({ runtime: null }),
      // d: not found on TMDB
    })
    expect(watchTime(data, tmdb)).toBe(215)
  })
})

describe('crowdComparison', () => {
  const data = exportOf({
    ratings: [rated('loved', 5), rated('hated', 1), rated('same', 3.5), rated('obscure', 5)],
  })
  const tmdb = enriched({
    loved: tmdbWith({ voteAverage: 6, voteCount: 1000 }), // 3★ → +2
    hated: tmdbWith({ voteAverage: 8, voteCount: 1000 }), // 4★ → −3
    same: tmdbWith({ voteAverage: 7, voteCount: 1000 }), // 3.5★ → 0
    obscure: tmdbWith({ voteAverage: 2, voteCount: MIN_CROWD_VOTES - 1 }), // too few votes
  })

  it('halves TMDB averages and sorts by how much more you liked a film', () => {
    const { films } = crowdComparison(data, tmdb)
    expect(films.map((f) => [f.letterboxdUri, f.crowd, f.difference])).toEqual([
      ['loved', 3, 2],
      ['same', 3.5, 0],
      ['hated', 4, -3],
    ])
  })

  it('averages both sides over the same films', () => {
    const { yourAverage, crowdAverage } = crowdComparison(data, tmdb)
    expect(yourAverage).toBeCloseTo((5 + 1 + 3.5) / 3)
    expect(crowdAverage).toBeCloseTo((3 + 4 + 3.5) / 3)
  })

  it('has no averages when no film qualifies', () => {
    expect(crowdComparison(data, enriched({}))).toEqual({
      films: [],
      yourAverage: null,
      crowdAverage: null,
    })
  })
})

// --- shareSummary ------------------------------------------------------------

describe('shareSummary', () => {
  const data = exportOf({
    ratings: [rated('a', 5), rated('b', 4), rated('c', 4), rated('d', 5)],
    watched: [film('a'), film('b'), film('c'), film('d'), film('e')],
  })
  const tmdb = enriched({
    a: tmdbFilm(['Drama', 'Crime'], [ana], [bob], { runtime: 120 }),
    b: tmdbFilm(['Drama'], [ana], [bob], { runtime: 60 }),
    c: tmdbFilm(['Drama'], [ana], [], { runtime: 60 }),
    d: tmdbFilm(['Crime'], [], [], { runtime: 0 }),
  })

  it('collects the headline numbers', () => {
    const summary = shareSummary(data, tmdb, 2025)
    expect(summary).toMatchObject({
      year: 2025,
      filmsWatched: 5,
      filmsRated: 4,
      hours: 4,
    })
    expect(summary.averageRating).toBeCloseTo(4.5)
  })

  it('picks the top actor and director, and needs 3 rated films for a genre', () => {
    const summary = shareSummary(data, tmdb, null)
    expect(summary.topActor?.label).toBe('Ana')
    expect(summary.topDirector?.label).toBe('Bob')
    // Crime has 2 rated films (avg 5), Drama has 3 (avg 4.33): only Drama qualifies.
    expect(summary.topGenre?.label).toBe('Drama')
  })

  it('has nothing to show without TMDB matches', () => {
    const summary = shareSummary(data, enriched({}), null)
    expect(summary.topGenre).toBeNull()
    expect(summary.topActor).toBeNull()
    expect(summary.topDirector).toBeNull()
    expect(summary.hours).toBe(0)
  })
})

// --- Edge cases --------------------------------------------------------------

describe('an export with nothing in it', () => {
  const empty = exportOf({})

  it('gives empty statistics instead of NaN or errors', () => {
    const stats = computeStats(empty, enriched({}))
    expect(stats).toMatchObject({
      genres: [],
      actors: [],
      directors: [],
      decades: [],
      runtimes: [],
      averageRating: null,
      matchedFilms: 0,
      totalFilms: 0,
    })
  })

  it('has no years, no latest films, no crowd, no watch time', () => {
    expect(diaryYears(empty)).toEqual([])
    expect(latestRatings(empty, 5)).toEqual([])
    expect(latestDiaryEntries(empty, 5)).toEqual([])
    expect(crowdComparison(empty, enriched({}))).toEqual({
      films: [],
      yourAverage: null,
      crowdAverage: null,
    })
    expect(watchTime(empty, enriched({}))).toBe(0)
    expect(countFilms(empty)).toBe(0)
  })

  it('has a summary with nothing in it', () => {
    expect(shareSummary(empty, enriched({}), null)).toEqual({
      year: null,
      filmsWatched: 0,
      filmsRated: 0,
      averageRating: null,
      hours: 0,
      topGenre: null,
      topActor: null,
      topDirector: null,
    })
  })

  it('sorts an empty list', () => {
    expect(sortGroups([], 'average', 'desc')).toEqual([])
  })
})

describe('an export without ratings', () => {
  const data = exportOf({ watched: [film('a', 1995), film('b', 2004)] })
  const tmdb = enriched({
    a: tmdbFilm(['Drama'], [ana], [bob], { runtime: 100 }),
    b: tmdbFilm(['Drama'], [ana], [bob], { runtime: 80 }),
  })

  it('lists no genre, actor or director, since none has a rated film', () => {
    const stats = computeStats(data, tmdb)
    expect(stats.genres).toEqual([])
    expect(stats.actors).toEqual([])
    expect(stats.directors).toEqual([])
    expect(stats.averageRating).toBeNull()
  })

  it('still lists the decades, with no average', () => {
    const { decades } = computeStats(data, tmdb)
    expect(labels(decades)).toEqual(['1990s', '2000s'])
    expect(decades.every((decade) => decade.average === null && decade.rated === 0)).toBe(true)
  })

  it('still counts films and watch time', () => {
    expect(countFilms(data)).toBe(2)
    expect(watchTime(data, tmdb)).toBe(180)
  })
})

describe('countFilms', () => {
  it('counts rated films even when watched.csv is missing', () => {
    expect(countFilms(exportOf({ ratings: [rated('a', 4), rated('b', 3)] }))).toBe(2)
  })

  it('counts a film listed twice once', () => {
    const data = exportOf({ watched: [film('a'), film('a')], ratings: [rated('a', 4)] })
    expect(countFilms(data)).toBe(1)
  })
})

describe('odd dates in the diary', () => {
  const entry = (watchedDate: string) => ({ letterboxdUri: 'a', watchedDate })
  const data = exportOf({
    ratings: [rated('a', 4)],
    watched: [film('a')],
    diary: [entry('2025-03-04'), entry(''), entry('abc'), entry('0000-00-00'), entry('25')],
  })

  it('lists only real years', () => {
    expect(diaryYears(data)).toEqual([2025])
  })

  it('does not put entries with odd dates into a listed year', () => {
    expect(filterByYear(data, 2025).diary).toHaveLength(1)
  })
})

describe('a single rating', () => {
  it('works as a one-film export', () => {
    const data = exportOf({ ratings: [rated('a', 5, 2019)], watched: [film('a', 2019)] })
    const tmdb = enriched({ a: tmdbFilm(['Drama'], [ana], [bob]) })
    const stats = computeStats(data, tmdb)
    expect(stats.averageRating).toBe(5)
    expect(labels(stats.genres)).toEqual(['Drama'])
    expect(stats.actors).toEqual([]) // needs 3 rated films
    expect(stats.directors).toEqual([]) // needs 2
    expect(labels(stats.decades)).toEqual(['2010s'])
  })
})

describe('ratingDistribution with bad values', () => {
  it('ignores ratings outside ½★–5★', () => {
    const bins = ratingDistribution([{ rating: 0 }, { rating: 6 }, { rating: NaN }, { rating: 3 }])
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(1)
  })
})
