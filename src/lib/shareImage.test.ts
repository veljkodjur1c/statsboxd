import { describe, expect, it } from 'vitest'
import { fitFontSize, shareFileName, truncateToWidth } from './shareImage.ts'

// A pretend font where every character is 10px wide.
const measure = (text: string) => Array.from(text).length * 10

describe('shareFileName', () => {
  it('names the file after the year, or all time', () => {
    expect(shareFileName(2025)).toBe('statsboxd-2025.png')
    expect(shareFileName(null)).toBe('statsboxd-all-time.png')
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
