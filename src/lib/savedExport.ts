import type { LetterboxdExport } from './letterboxd.ts'

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

// localStorage holds whatever was written there, possibly by an older version
// of the app, so check the shape before trusting it.
function isSavedExport(value: unknown): value is SavedExport {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const { data, savedAt } = value as Partial<SavedExport>
  return (
    typeof savedAt === 'string' &&
    Array.isArray(data?.ratings) &&
    Array.isArray(data?.watched) &&
    Array.isArray(data?.diary)
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
