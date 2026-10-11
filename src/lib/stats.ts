import type { EnrichResult } from './enrich.ts'
import { isIsoDate, type Film, type LetterboxdExport } from './letterboxd.ts'
import type { Person, TmdbFilm } from './tmdb.ts'

/** A film as listed in a group's detail view. */
export type GroupFilm = {
  letterboxdUri: string
  name: string
  year: number | null
  rating: number | null // null if you watched it without rating it
}

/** One row of a statistic, e.g. one genre or one director. */
export type GroupStat = {
  key: string
  label: string
  films: number // films you watched in this group
  rated: number // how many of those you rated
  average: number | null // average of your ratings; null if none were rated
  filmList: GroupFilm[] // the films themselves
}

export type Stats = {
  genres: GroupStat[]
  actors: GroupStat[]
  directors: GroupStat[]
  decades: GroupStat[]
  runtimes: GroupStat[] // shortest first
  averageRating: number | null // over all your ratings; null if none
  matchedFilms: number // films found on TMDB
  totalFilms: number
}

/**
 * Every film once. Rated films are normally in watched.csv too, so this is
 * watched ∪ ratings with one entry per Letterboxd URI.
 */
function uniqueFilms(data: LetterboxdExport): Film[] {
  const films = new Map<string, Film>()
  for (const film of [...data.watched, ...data.ratings]) {
    if (!films.has(film.letterboxdUri)) {
      films.set(film.letterboxdUri, film)
    }
  }
  return [...films.values()]
}

/** How many different films the export has (watched ∪ rated). */
export function countFilms(data: LetterboxdExport): number {
  return uniqueFilms(data).length
}

const ratingsByUri = (data: LetterboxdExport) =>
  new Map(data.ratings.map((film) => [film.letterboxdUri, film.rating]))

/** The average of some numbers; null if there are none. */
const mean = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null

/** One bar of the rating histogram, e.g. { rating: 3.5, count: 41 }. */
export type RatingBin = {
  rating: number
  count: number
}

/**
 * How many films got each rating, from ½★ to 5★. Every half-star step is
 * included, even with a count of 0, so the chart's x-axis never skips one.
 */
export function ratingDistribution(ratings: { rating: number }[]): RatingBin[] {
  const bins: RatingBin[] = Array.from({ length: 10 }, (_, index) => ({
    rating: (index + 1) / 2,
    count: 0,
  }))
  for (const { rating } of ratings) {
    const index = Math.round(rating * 2) - 1
    if (index >= 0 && index < bins.length) {
      bins[index].count++
    }
  }
  return bins
}

// 0 (never a real year) for anything that isn't a "YYYY-MM-DD" date.
const yearOf = (date: string) => (isIsoDate(date) ? Number(date.slice(0, 4)) : 0)

/** Years you logged a film in your diary, newest first. */
export function diaryYears(data: LetterboxdExport): number[] {
  const years = new Set(data.diary.map((entry) => yearOf(entry.watchedDate)))
  return [...years].filter((year) => year > 0).sort((a, b) => b - a)
}

/**
 * The export narrowed to the films you logged in your diary in `year`. Only
 * the diary has watch dates, so films that were never logged drop out. A film
 * watched in several years counts in each of them. Ratings stay your current
 * ones (from ratings.csv), not the rating you gave on that day.
 */
export function filterByYear(
  data: LetterboxdExport,
  year: number,
): LetterboxdExport {
  const diary = data.diary.filter((entry) => yearOf(entry.watchedDate) === year)
  const uris = new Set(diary.map((entry) => entry.letterboxdUri))
  return {
    ratings: data.ratings.filter((film) => uris.has(film.letterboxdUri)),
    watched: data.watched.filter((film) => uris.has(film.letterboxdUri)),
    diary,
  }
}

/** A film in a "latest" list, with the day that put it there. */
export type DatedFilm = GroupFilm & {
  date: string // "YYYY-MM-DD"
}

// Dates are "YYYY-MM-DD", so comparing them as strings orders them by time.
const newestFirst = (a: DatedFilm, b: DatedFilm) => b.date.localeCompare(a.date)

/**
 * The films you rated most recently. The date is the last time the rating
 * was set or changed, so re-rating an old film brings it back to the top.
 */
export function latestRatings(data: LetterboxdExport, count: number): DatedFilm[] {
  // A copy, because sort() reorders the array it's called on.
  return [...data.ratings].sort(newestFirst).slice(0, count)
}

/**
 * The films you watched most recently, by your diary: one row per diary
 * entry (a rewatch can appear twice), dated by the day you watched it, with
 * the rating the film has now.
 */
export function latestDiaryEntries(
  data: LetterboxdExport,
  count: number,
): DatedFilm[] {
  const films = new Map(uniqueFilms(data).map((film) => [film.letterboxdUri, film]))
  const ratingByUri = ratingsByUri(data)

  const entries: DatedFilm[] = []
  for (const entry of data.diary) {
    const film = films.get(entry.letterboxdUri)
    if (film !== undefined) {
      entries.push({
        letterboxdUri: film.letterboxdUri,
        name: film.name,
        year: film.year,
        rating: ratingByUri.get(film.letterboxdUri) ?? null,
        date: entry.watchedDate,
      })
    }
  }
  // The diary is in the order you logged it; reversed first, so entries
  // watched on the same day keep the last-logged one on top (sort is stable).
  return entries.reverse().sort(newestFirst).slice(0, count)
}

// A group needs this many rated films to be listed, so that a single 5★ film
// doesn't make someone your top actor.
export const MIN_RATED = {
  genres: 1,
  actors: 3,
  directors: 2,
}

export type SortKey = 'name' | 'films' | 'rated' | 'average'
export type SortDirection = 'asc' | 'desc'

/** The direction a column sorts in when it is first clicked. */
export const DEFAULT_DIRECTION: Record<SortKey, SortDirection> = {
  name: 'asc',
  films: 'desc',
  rated: 'desc',
  average: 'desc',
}

type Compare = (a: GroupStat, b: GroupStat) => number

// numeric: true sorts "1990s" before "2000s" and "Film 2" before "Film 10".
const byName: Compare = (a, b) =>
  a.label.localeCompare(b.label, undefined, { numeric: true })

// Each of these compares in ascending order; sortGroups flips them for 'desc'.
const ascending: Record<SortKey, Compare> = {
  name: byName,
  films: (a, b) => a.films - b.films,
  rated: (a, b) => a.rated - b.rated,
  average: (a, b) => (a.average ?? 0) - (b.average ?? 0),
}

// Used when the sort column is equal: best average, then most rated, then name.
// A comparison that returns 0 is falsy, so `||` moves on to the next rule.
const tieBreak: Compare = (a, b) =>
  (b.average ?? -1) - (a.average ?? -1) || b.rated - a.rated || byName(a, b)

/** Returns a sorted copy of the groups. */
export function sortGroups(
  groups: GroupStat[],
  key: SortKey,
  direction: SortDirection,
): GroupStat[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...groups].sort((a, b) => {
    // Groups with no rated films have no average: keep them last either way.
    if (key === 'average' && (a.average === null) !== (b.average === null)) {
      return a.average === null ? 1 : -1
    }
    return sign * ascending[key](a, b) || tieBreak(a, b)
  })
}

type FilmEntry = {
  film: Film
  rating: number | null
  tmdb: TmdbFilm | null
}

type Group = {
  key: string
  label: string
}

/**
 * Counts films and averages ratings per group. `groupsOf` says which groups a
 * film belongs to (its genres, its actors, its decade…).
 */
function aggregate(
  entries: FilmEntry[],
  groupsOf: (entry: FilmEntry) => Group[],
): GroupStat[] {
  const totals = new Map<
    string,
    { label: string; rated: number; sum: number; filmList: GroupFilm[] }
  >()

  for (const entry of entries) {
    // A film can list the same person twice (e.g. an actor playing two roles);
    // it should still count once for them.
    const seen = new Set<string>()
    for (const { key, label } of groupsOf(entry)) {
      if (seen.has(key)) {
        continue
      }
      seen.add(key)

      let total = totals.get(key)
      if (total === undefined) {
        total = { label, rated: 0, sum: 0, filmList: [] }
        totals.set(key, total)
      }
      total.filmList.push({
        letterboxdUri: entry.film.letterboxdUri,
        name: entry.film.name,
        year: entry.film.year,
        rating: entry.rating,
      })
      if (entry.rating !== null) {
        total.rated++
        total.sum += entry.rating
      }
    }
  }

  return [...totals].map(([key, total]) => ({
    key,
    label: total.label,
    films: total.filmList.length,
    rated: total.rated,
    average: total.rated > 0 ? total.sum / total.rated : null,
    filmList: total.filmList,
  }))
}

// People are keyed by TMDB id, so two people with the same name stay apart.
const personGroup = (person: Person): Group => ({
  key: String(person.id),
  label: person.name,
})

function decadeOf(year: number): Group {
  const start = Math.floor(year / 10) * 10
  return { key: String(start), label: `${start}s` }
}

// Runtime groups start at these minutes: under 90, 90–119, 120–149, 150–179
// and 180+. Half-hour steps are easy to picture.
const RUNTIME_STEPS = [90, 120, 150, 180]

function runtimeGroupOf(minutes: number): Group {
  const start = RUNTIME_STEPS.findLast((step) => minutes >= step)
  if (start === undefined) {
    // "<" sorts before digits, so sorting the labels by name keeps the
    // groups shortest first, like the decades.
    return { key: '0', label: `< ${RUNTIME_STEPS[0]} min` }
  }
  const next = RUNTIME_STEPS.find((step) => step > start)
  return {
    key: String(start),
    label: next === undefined ? `${start}+ min` : `${start}–${next - 1} min`,
  }
}

const atLeast = (groups: GroupStat[], minRated: number) =>
  groups.filter((group) => group.rated >= minRated)

export function computeStats(
  data: LetterboxdExport,
  tmdb: EnrichResult,
): Stats {
  const ratingByUri = ratingsByUri(data)
  const entries: FilmEntry[] = uniqueFilms(data).map((film) => ({
    film,
    rating: ratingByUri.get(film.letterboxdUri) ?? null,
    tmdb: tmdb.byUri[film.letterboxdUri] ?? null,
  }))

  // Films not found on TMDB have no genres or people, so they simply don't
  // show up in those stats. Decades use the year from Letterboxd instead.
  const genres = aggregate(entries, (entry) =>
    (entry.tmdb?.genres ?? []).map((name) => ({ key: name, label: name })),
  )
  const actors = aggregate(entries, (entry) =>
    (entry.tmdb?.cast ?? []).map(personGroup),
  )
  const directors = aggregate(entries, (entry) =>
    (entry.tmdb?.directors ?? []).map(personGroup),
  )
  const decades = aggregate(entries, (entry) =>
    entry.film.year === null ? [] : [decadeOf(entry.film.year)],
  )
  // Runtimes come from TMDB as well; an unknown runtime (null) is left out.
  const runtimes = aggregate(entries, (entry) => {
    const runtime = entry.tmdb?.runtime ?? null
    return runtime === null ? [] : [runtimeGroupOf(runtime)]
  })

  return {
    genres: sortGroups(atLeast(genres, MIN_RATED.genres), 'average', 'desc'),
    actors: sortGroups(atLeast(actors, MIN_RATED.actors), 'average', 'desc'),
    directors: sortGroups(
      atLeast(directors, MIN_RATED.directors),
      'average',
      'desc',
    ),
    decades: sortGroups(decades, 'name', 'asc'),
    runtimes: sortGroups(runtimes, 'name', 'asc'),
    averageRating: mean(data.ratings.map((film) => film.rating)),
    matchedFilms: entries.filter((entry) => entry.tmdb !== null).length,
    totalFilms: entries.length,
  }
}

/**
 * Minutes of film you watched, by TMDB runtime. Each film counts once (so
 * rewatches don't add up), and films without a runtime count as 0, so this
 * is a lower bound.
 */
export function watchTime(data: LetterboxdExport, tmdb: EnrichResult): number {
  let minutes = 0
  for (const film of uniqueFilms(data)) {
    minutes += tmdb.byUri[film.letterboxdUri]?.runtime ?? 0
  }
  return minutes
}

// A film needs this many TMDB votes before its average counts as "the
// crowd": with a handful of votes the average is mostly noise.
export const MIN_CROWD_VOTES = 50

/** A film you rated, next to what TMDB users gave it. */
export type CrowdFilm = GroupFilm & {
  rating: number // always rated here
  crowd: number // TMDB users' average, halved to the 0–5 star scale
  difference: number // rating − crowd: positive means you liked it more
}

export type CrowdComparison = {
  films: CrowdFilm[] // you-liked-it-more first, you-liked-it-less last
  yourAverage: number | null // over these films only; null if there are none
  crowdAverage: number | null
}

/**
 * Your ratings against TMDB's, for the rated films TMDB users voted on
 * enough. TMDB rates out of 10, so its average is halved to compare it with
 * stars.
 */
export function crowdComparison(
  data: LetterboxdExport,
  tmdb: EnrichResult,
): CrowdComparison {
  const films: CrowdFilm[] = []
  for (const film of data.ratings) {
    const match = tmdb.byUri[film.letterboxdUri]
    if (
      match === undefined ||
      match.voteAverage === null ||
      match.voteCount < MIN_CROWD_VOTES
    ) {
      continue
    }
    const crowd = match.voteAverage / 2
    films.push({
      letterboxdUri: film.letterboxdUri,
      name: film.name,
      year: film.year,
      rating: film.rating,
      crowd,
      difference: film.rating - crowd,
    })
  }
  films.sort((a, b) => b.difference - a.difference || a.name.localeCompare(b.name))

  return {
    films,
    yourAverage: mean(films.map((film) => film.rating)),
    crowdAverage: mean(films.map((film) => film.crowd)),
  }
}

// A genre needs this many rated films to be called your "top genre" in the
// summary: one lucky 5★ film shouldn't decide it.
export const SUMMARY_MIN_GENRE_RATED = 3

/** The few headline facts shown on the shareable summary image. */
export type ShareSummary = {
  year: number | null // null = all time
  filmsWatched: number
  filmsRated: number
  averageRating: number | null
  hours: number // rounded watch time
  topGenre: GroupStat | null
  topActor: GroupStat | null
  topDirector: GroupStat | null
}

/**
 * Picks the headline facts for the summary image from the same data the
 * results page shows (pass the year-filtered export for a year). The "top"
 * ones are the best-rated groups; a group is null when nothing qualifies.
 */
export function shareSummary(
  data: LetterboxdExport,
  tmdb: EnrichResult,
  year: number | null,
): ShareSummary {
  const stats = computeStats(data, tmdb)
  return {
    year,
    filmsWatched: stats.totalFilms,
    filmsRated: data.ratings.length,
    averageRating: stats.averageRating,
    hours: Math.round(watchTime(data, tmdb) / 60),
    topGenre:
      stats.genres.find((genre) => genre.rated >= SUMMARY_MIN_GENRE_RATED) ?? null,
    topActor: stats.actors[0] ?? null,
    topDirector: stats.directors[0] ?? null,
  }
}
