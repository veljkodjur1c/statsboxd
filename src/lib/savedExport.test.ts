import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LetterboxdExport } from './letterboxd.ts'
import { forgetExport, loadSavedExport, saveExport } from './savedExport.ts'

const DATA: LetterboxdExport = {
  ratings: [
    {
      date: '2025-01-01',
      name: 'Heat',
      year: 1995,
      letterboxdUri: 'https://boxd.it/a',
      rating: 4.5,
    },
  ],
  watched: [
    { date: '2025-01-01', name: 'Heat', year: 1995, letterboxdUri: 'https://boxd.it/a' },
  ],
  diary: [{ letterboxdUri: 'https://boxd.it/a', watchedDate: '2025-01-01' }],
}

/** Puts `value` into localStorage as a saved export, like an older visit would. */
function store(value: unknown) {
  localStorage.setItem('statsboxd:export:v1', JSON.stringify(value))
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

describe('saved export', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is null before anything was saved', () => {
    expect(loadSavedExport()).toBeNull()
  })

  it('comes back as it was saved, with the day it was saved', () => {
    const saved = saveExport(DATA)
    expect(saved?.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(loadSavedExport()).toEqual(saved)
  })

  it('is gone after forgetting it', () => {
    saveExport(DATA)
    forgetExport()
    expect(loadSavedExport()).toBeNull()
  })

  it('ignores something that is not a saved export', () => {
    localStorage.setItem('statsboxd:export:v1', '{"data":{"ratings":[]}}')
    expect(loadSavedExport()).toBeNull()
    localStorage.setItem('statsboxd:export:v1', 'not json')
    expect(loadSavedExport()).toBeNull()
  })

  it('ignores an export with a link that is not a Letterboxd page', () => {
    const evil = { ...DATA.watched[0], letterboxdUri: 'javascript:alert(1)' }
    store({ savedAt: '2025-01-01', data: { ...DATA, watched: [evil] } })
    expect(loadSavedExport()).toBeNull()
  })

  it('ignores an export with an item of the wrong shape', () => {
    const stored = (data: unknown) => store({ savedAt: '2025-01-01', data })
    stored({ ...DATA, ratings: [{ ...DATA.ratings[0], rating: 'five' }] })
    expect(loadSavedExport()).toBeNull()
    stored({ ...DATA, ratings: [{ ...DATA.ratings[0], rating: 9 }] })
    expect(loadSavedExport()).toBeNull()
    stored({ ...DATA, watched: [null] })
    expect(loadSavedExport()).toBeNull()
    stored({ ...DATA, diary: [{ letterboxdUri: DATA.diary[0].letterboxdUri }] })
    expect(loadSavedExport()).toBeNull()
    stored({ ...DATA, ratings: { length: 0 } })
    expect(loadSavedExport()).toBeNull()
  })

  it('ignores an export with a date that is not a date', () => {
    const stored = (data: unknown) => store({ savedAt: '2025-01-01', data })
    stored({ ...DATA, diary: [{ ...DATA.diary[0], watchedDate: 'abc' }] })
    expect(loadSavedExport()).toBeNull()
    stored({ ...DATA, watched: [{ ...DATA.watched[0], date: 'abc' }] })
    expect(loadSavedExport()).toBeNull()
  })

  it('ignores JSON that is not an object at all', () => {
    for (const value of [null, 42, 'text', [], [DATA]]) {
      store(value)
      expect(loadSavedExport()).toBeNull()
    }
  })

  it('reports a full or blocked storage instead of throwing', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('quota exceeded')
      },
    })
    expect(saveExport(DATA)).toBeNull()
    expect(loadSavedExport()).toBeNull()
  })
})
