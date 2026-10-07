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

export type LetterboxdExport = {
  ratings: RatedFilm[]
  watched: Film[]
}

type CsvRow = Record<string, string>

const FILM_COLUMNS = ['Date', 'Name', 'Year', 'Letterboxd URI']

export async function parseLetterboxdExport(
  file: Blob,
): Promise<LetterboxdExport> {
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

  const ratings = parseCsv(ratingsCsv, 'ratings.csv', [...FILM_COLUMNS, 'Rating'])
    .map(toRatedFilm)
    .filter((film) => film !== null)

  const watched =
    watchedCsv === null
      ? []
      : parseCsv(watchedCsv, 'watched.csv', FILM_COLUMNS).map(toFilm)

  return { ratings, watched }
}

async function readZipFile(zip: JSZip, path: string): Promise<string | null> {
  const entry = zip.file(path)
  return entry ? entry.async('string') : null
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

function toFilm(row: CsvRow): Film {
  const year = parseInt(row['Year'], 10)
  return {
    date: row['Date'],
    name: row['Name'],
    year: Number.isNaN(year) ? null : year,
    letterboxdUri: row['Letterboxd URI'],
  }
}

function toRatedFilm(row: CsvRow): RatedFilm | null {
  const rating = Number(row['Rating'])
  // Skip rows with a missing or invalid rating (NaN fails both comparisons).
  if (!(rating > 0 && rating <= 5)) {
    return null
  }
  return { ...toFilm(row), rating }
}
