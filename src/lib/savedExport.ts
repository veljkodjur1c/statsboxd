import {
  isIsoDate,
  isLetterboxdUrl,
  type DiaryEntry,
  type Film,
  type LetterboxdExport,
  type RatedFilm,
} from './letterboxd.ts'

// Bump the version when the shape of LetterboxdExport changes, so an old
// saved export is ignored instead of breaking the stats.
const SAVED_KEY = 'statsboxd:export:v1'

/** The last parsed export, kept in this browser so it needn't be uploaded again. */
export type SavedExport = {
  data: LetterboxdExport
  savedAt: string // "YYYY-MM-DD", the day it was uploaded
}

function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

type Fields = Record<string, unknown>

const isObject = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function isFilm(value: unknown): value is Film {
  return (
    isObject(value) &&
    typeof value.name === 'string' &&
    (value.date === '' || isIsoDate(value.date)) &&
    (value.year === null || Number.isFinite(value.year)) &&
    // The link ends up in <a href>, so it must be a Letterboxd page.
    isLetterboxdUrl(value.letterboxdUri)
  )
}

function isRatedFilm(value: unknown): value is RatedFilm {
  return (
    isFilm(value) &&
    typeof (value as Fields).rating === 'number' &&
    (value as RatedFilm).rating > 0 &&
    (value as RatedFilm).rating <= 5
  )
}

function isDiaryEntry(value: unknown): value is DiaryEntry {
  return (
    isObject(value) &&
    isLetterboxdUrl(value.letterboxdUri) &&
    isIsoDate(value.watchedDate)
  )
}

// localStorage holds whatever was written there, possibly by an older version
// of the app (or by someone with access to this browser), so check every
// item's shape before trusting it. One bad item rejects the whole export:
// the user just uploads the ZIP again.
function isSavedExport(value: unknown): value is SavedExport {
  if (!isObject(value) || typeof value.savedAt !== 'string') {
    return false
  }
  const { data } = value
  return (
    isObject(data) &&
    Array.isArray(data.ratings) &&
    data.ratings.every(isRatedFilm) &&
    Array.isArray(data.watched) &&
    data.watched.every(isFilm) &&
    Array.isArray(data.diary) &&
    data.diary.every(isDiaryEntry)
  )
}

/** The saved export, or null if there is none (or it can't be read). */
export function loadSavedExport(): SavedExport | null {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    const value: unknown = raw === null ? null : JSON.parse(raw)
    return isSavedExport(value) ? value : null
  } catch {
    return null // storage blocked or corrupted
  }
}

/** Saves the export; returns what was saved, or null if storage failed. */
export function saveExport(data: LetterboxdExport): SavedExport | null {
  const saved: SavedExport = { data, savedAt: today() }
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved))
    return saved
  } catch {
    // Storage full or blocked: it just won't be remembered. An older saved
    // export must not stay behind and be offered as the "last" one.
    forgetExport()
    return null
  }
}

export function forgetExport() {
  try {
    localStorage.removeItem(SAVED_KEY)
  } catch {
    // nothing to forget if storage is unavailable
  }
}
