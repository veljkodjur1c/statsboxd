import type { EnrichResult } from './enrich.ts'
import type { Film, LetterboxdExport } from './letterboxd.ts'
import type { Person, TmdbFilm } from './tmdb.ts'

/** One row of a statistic, e.g. one genre or one director. */
export type GroupStat = {
  key: string
  label: string
  films: number // films you watched in this group
  rated: number // how many of those you rated
  average: number | null // average of your ratings; null if none were rated
}

export type Stats = {
  genres: GroupStat[]
  actors: GroupStat[]
  directors: GroupStat[]
  decades: GroupStat[]
  matchedFilms: number // films found on TMDB
  totalFilms: number
}

// A group needs this many rated films to be listed, so that a single 5★ film
// doesn't make someone your top actor.
export const MIN_RATED = {
  genres: 1,
  actors: 3,
  directors: 2,
}

export type SortKey = 'name' | 'films' | 'rated' | 'average'

type Compare = (a: GroupStat, b: GroupStat) => number

// numeric: true sorts "1990s" before "2000s" and "Film 2" before "Film 10".
const byName: Compare = (a, b) =>
  a.label.localeCompare(b.label, undefined, { numeric: true })

// Groups without any rating (average === null) go last.
const byAverage: Compare = (a, b) =>
  (b.average ?? -1) - (a.average ?? -1) || b.rated - a.rated || byName(a, b)

/**
 * How to order rows for each sort column. Ties fall back to the next rule:
 * a comparison that returns 0 is falsy, so `||` moves on to the next one.
 */
export const comparators: Record<SortKey, Compare> = {
  name: byName,
  films: (a, b) => b.films - a.films || byAverage(a, b),
  rated: (a, b) => b.rated - a.rated || byAverage(a, b),
  average: byAverage,
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
    { label: string; films: number; rated: number; sum: number }
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
        total = { label, films: 0, rated: 0, sum: 0 }
        totals.set(key, total)
      }
      total.films++
      if (entry.rating !== null) {
        total.rated++
        total.sum += entry.rating
      }
    }
  }

  return [...totals].map(([key, total]) => ({
    key,
    label: total.label,
    films: total.films,
    rated: total.rated,
    average: total.rated > 0 ? total.sum / total.rated : null,
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

const atLeast = (groups: GroupStat[], minRated: number) =>
  groups.filter((group) => group.rated >= minRated)

export function computeStats(
  data: LetterboxdExport,
  tmdb: EnrichResult,
): Stats {
  // Rated films are normally in watched.csv too: keep one entry per film.
  const films = new Map<string, Film>()
  for (const film of [...data.watched, ...data.ratings]) {
    if (!films.has(film.letterboxdUri)) {
      films.set(film.letterboxdUri, film)
    }
  }
  const ratingByUri = new Map(
    data.ratings.map((film) => [film.letterboxdUri, film.rating]),
  )

  const entries: FilmEntry[] = [...films.values()].map((film) => ({
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

  return {
    genres: atLeast(genres, MIN_RATED.genres).sort(byAverage),
    actors: atLeast(actors, MIN_RATED.actors).sort(byAverage),
    directors: atLeast(directors, MIN_RATED.directors).sort(byAverage),
    decades: decades.sort(byName),
    matchedFilms: entries.filter((entry) => entry.tmdb !== null).length,
    totalFilms: entries.length,
  }
}
