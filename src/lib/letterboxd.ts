import JSZip from 'jszip'
import Papa from 'papaparse'

/** A film entry as it appears in the Letterboxd export. */
export type Film = {
  date: string // when the entry was logged, "YYYY-MM-DD"
  name: string
  year: number | null
  letterboxdUri: string
}

export type RatedFilm = Film & {
  rating: number // 0.5–5 in half-star steps
}

/** One diary log: which film you watched, and when. */
export type DiaryEntry = {
  letterboxdUri: string // the film's URI, as in watched.csv (see parseDiary)
  watchedDate: string // "YYYY-MM-DD"
}

export type LetterboxdExport = {
  ratings: RatedFilm[]
  watched: Film[]
  diary: DiaryEntry[]
}

type CsvRow = Record<string, string>

const FILM_COLUMNS = ['Date', 'Name', 'Year', 'Letterboxd URI']

// Real exports are well below these: a 20,000-film ratings.csv is ~2 MB.
export const MAX_ZIP_BYTES = 50 * 1024 * 1024
export const MAX_CSV_BYTES = 25 * 1024 * 1024

/**
 * True for a "YYYY-MM-DD" date. Dates are compared as strings to order them,
 * so a stray "abc" would otherwise sort as newer than every real date.
 */
export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)
}

const LETTERBOXD_HOSTS = ['letterboxd.com', 'boxd.it']

/**
 * True for an http(s) link to Letterboxd. Film URIs end up in <a href>, and
 * the CSV (or localStorage) is data we don't control: a "javascript:" link
 * there would run code in this page when clicked. So only Letterboxd links
 * are accepted, anything else drops the row.
 */
export function isLetterboxdUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false
  }
  try {
    const { protocol, hostname } = new URL(value)
    return (
      (protocol === 'https:' || protocol === 'http:') &&
      LETTERBOXD_HOSTS.some((host) => hostname === host || hostname.endsWith('.' + host))
    )
  } catch {
    return false // not a URL at all
  }
}

export async function parseLetterboxdExport(
  file: Blob,
): Promise<LetterboxdExport> {
  if (file.size > MAX_ZIP_BYTES) {
    throw new Error('This file is too large to be a Letterboxd export (limit 50 MB).')
  }
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer())
  } catch {
    throw new Error("This file isn't a valid ZIP archive.")
  }

  // Only read files at the root of the archive: the export also has
  // deleted/ and orphaned/ folders that contain files with the same names.
  const ratingsCsv = await readZipFile(zip, 'ratings.csv')
  if (ratingsCsv === null) {
    throw new Error('No ratings.csv found — is this a Letterboxd export?')
  }
  const watchedCsv = await readZipFile(zip, 'watched.csv')
  const diaryCsv = await readZipFile(zip, 'diary.csv')

  const ratings = parseCsv(ratingsCsv, 'ratings.csv', [...FILM_COLUMNS, 'Rating'])
    .map(toRatedFilm)
    .filter((film) => film !== null)

  const watched =
    watchedCsv === null
      ? []
      : parseCsv(watchedCsv, 'watched.csv', FILM_COLUMNS)
          .map(toFilm)
          .filter((film) => film !== null)

  const diary =
    diaryCsv === null ? [] : parseDiary(diaryCsv, [...watched, ...ratings])

  return { ratings, watched, diary }
}

const titleKey = (name: string, year: number | null) => `${name}|${year}`

/**
 * In diary.csv, "Letterboxd URI" links to the diary entry, not to the film,
 * so it never matches watched.csv. Name + year does, so each entry gets the
 * URI of the film with the same name and year. Entries for a film that isn't
 * in watched.csv or ratings.csv are dropped.
 */
function parseDiary(text: string, films: Film[]): DiaryEntry[] {
  const uriByTitle = new Map(
    films.map((film) => [titleKey(film.name, film.year), film.letterboxdUri]),
  )
  const entries: DiaryEntry[] = []
  for (const row of parseCsv(text, 'diary.csv', [...FILM_COLUMNS, 'Watched Date'])) {
    const letterboxdUri = uriByTitle.get(titleKey(row['Name']?.trim(), parseYear(row)))
    // Watched Date is the day you saw it; Date (the day you logged it) is
    // only a fallback for a row without a usable one.
    const watchedDate = [row['Watched Date'], row['Date']].find(isIsoDate)
    if (letterboxdUri !== undefined && watchedDate !== undefined) {
      entries.push({ letterboxdUri, watchedDate })
    }
  }
  return entries
}

/**
 * The decompressed size JSZip read from the archive's directory, without
 * inflating anything. It's an internal field (not in JSZip's types), so
 * undefined is handled: the size is then checked after reading instead.
 */
function declaredSize(entry: JSZip.JSZipObject): number | undefined {
  return (entry as unknown as { _data?: { uncompressedSize?: number } })._data
    ?.uncompressedSize
}

async function readZipFile(zip: JSZip, path: string): Promise<string | null> {
  const entry = zip.file(path)
  if (entry === null) {
    return null
  }
  // A "ZIP bomb" is a tiny archive that inflates to gigabytes. Looking at the
  // declared size first stops it before the browser tab runs out of memory.
  const tooLarge = new Error(`${path} is too large to be a Letterboxd export file.`)
  if ((declaredSize(entry) ?? 0) > MAX_CSV_BYTES) {
    throw tooLarge
  }
  const text = await entry.async('string')
  if (text.length > MAX_CSV_BYTES) {
    throw tooLarge
  }
  return text
}

function parseCsv(
  text: string,
  fileName: string,
  requiredColumns: string[],
): CsvRow[] {
  const result = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true })
  const columns = result.meta.fields ?? []
  const missing = requiredColumns.find((column) => !columns.includes(column))
  if (missing) {
    throw new Error(`${fileName} is missing the "${missing}" column.`)
  }
  return result.data
}

// The first films are from the 1870s; anything outside this is a typo, and
// would otherwise make a decade like "99990s".
const MIN_YEAR = 1850
const MAX_YEAR = 2100

function parseYear(row: CsvRow): number | null {
  const year = parseInt(row['Year'], 10)
  return year >= MIN_YEAR && year <= MAX_YEAR ? year : null // NaN fails both
}

/** A film row, or null if it has no name or no Letterboxd link. */
function toFilm(row: CsvRow): Film | null {
  const name = row['Name']?.trim()
  const letterboxdUri = row['Letterboxd URI']?.trim()
  if (!name || !isLetterboxdUrl(letterboxdUri)) {
    return null
  }
  // An unusable date becomes '' (shown as nothing, sorted as oldest).
  const date = isIsoDate(row['Date']) ? row['Date'] : ''
  return { date, name, year: parseYear(row), letterboxdUri }
}

function toRatedFilm(row: CsvRow): RatedFilm | null {
  const rating = Number(row['Rating'])
  // Skip rows with a missing or invalid rating (NaN fails both comparisons).
  const film = toFilm(row)
  if (film === null || !(rating > 0 && rating <= 5)) {
    return null
  }
  return { ...film, rating }
}
