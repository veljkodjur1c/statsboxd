import { describe, expect, it } from 'vitest'
import {
  fitFontSize,
  shareFileName,
  shareImageAlt,
  shareTitle,
  truncateToWidth,
} from './shareImage.ts'
import type { GroupStat, ShareSummary } from './stats.ts'

// A pretend font where every character is 10px wide.
const measure = (text: string) => Array.from(text).length * 10

function group(label: string, average: number | null): GroupStat {
  return { key: label, label, films: 3, rated: 3, average, filmList: [] }
}

const summary: ShareSummary = {
  year: 2025,
  filmsWatched: 1234,
  filmsRated: 98,
  averageRating: 3.6178,
  hours: 210,
  topGenre: group('Drama', 4.1),
  topActor: group('Tilda Swinton', 4.333),
  topDirector: group('Agnès Varda', 4.5),
}

describe('shareFileName', () => {
  it('names the file after the year, or all time', () => {
    expect(shareFileName(2025)).toBe('statsboxd-2025.png')
    expect(shareFileName(null)).toBe('statsboxd-all-time.png')
  })
})

describe('shareTitle', () => {
  it('names the year, or all time', () => {
    expect(shareTitle(2025)).toBe('My 2025 in film')
    expect(shareTitle(null)).toBe('My all-time stats')
  })
})

describe('shareImageAlt', () => {
  it('reads out the numbers and the top picks', () => {
    expect(shareImageAlt(summary)).toBe(
      'My 2025 in film: 1,234 films watched, 98 rated, average rating 3.62 stars, ' +
        '210 hours of watch time. Top genre: Drama, 4.10 stars. ' +
        'Top actor: Tilda Swinton, 4.33 stars. Top director: Agnès Varda, 4.50 stars.',
    )
  })

  it('leaves out what the image shows as a dash', () => {
    const empty: ShareSummary = {
      ...summary,
      year: null,
      filmsWatched: 1,
      filmsRated: 0,
      averageRating: null,
      hours: 0,
      topGenre: null,
      topActor: group('Unrated', null),
      topDirector: null,
    }
    expect(shareImageAlt(empty)).toBe('My all-time stats: 1 film watched, 0 rated.')
  })
})

describe('truncateToWidth', () => {
  it('keeps text that fits', () => {
    expect(truncateToWidth('Drama', 50, measure)).toBe('Drama')
  })

  it('cuts text that is too wide and adds an ellipsis', () => {
    // 8 characters fit in 80px: 7 letters and "…".
    expect(truncateToWidth('Science Fiction', 80, measure)).toBe('Science…')
  })

  it('drops the space before the ellipsis', () => {
    // "Paul T…" would be 7 characters; the cut lands right after "Paul ".
    expect(truncateToWidth('Paul Thomas Anderson', 60, measure)).toBe('Paul…')
  })

  it('never splits a character in two', () => {
    expect(truncateToWidth('🎬🎬🎬🎬', 30, measure)).toBe('🎬🎬…')
  })
})

describe('fitFontSize', () => {
  it('keeps the largest size when the text fits', () => {
    expect(fitFontSize(400, 500, 48, 32)).toBe(48)
  })

  it('shrinks the size in step with the width', () => {
    expect(fitFontSize(600, 500, 48, 32)).toBe(40)
  })

  it('never goes below the smallest size', () => {
    expect(fitFontSize(2000, 500, 48, 32)).toBe(32)
  })
})
