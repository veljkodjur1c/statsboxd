import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import {
  isLetterboxdUrl,
  MAX_CSV_BYTES,
  MAX_ZIP_BYTES,
  parseLetterboxdExport,
} from './letterboxd.ts'

const RATINGS_CSV = `Date,Name,Year,Letterboxd URI,Rating
2024-01-05,Heat,1995,https://boxd.it/a,4.5
2024-02-10,"Crouching Tiger, Hidden Dragon",2000,https://boxd.it/b,5
2024-03-01,No Year,,https://boxd.it/c,3
2024-03-02,Bad Rating,2001,https://boxd.it/d,
`

const WATCHED_CSV = `Date,Name,Year,Letterboxd URI
2024-01-05,Heat,1995,https://boxd.it/a
2024-04-01,Unrated Film,2010,https://boxd.it/e
`

const NEWLINE = String.fromCharCode(10)

/** Builds an in-memory ZIP from { path: content }, like a real export. */
async function makeZip(files: Record<string, string>): Promise<Blob> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content)
  }
  return new Blob([await zip.generateAsync({ type: 'arraybuffer' })])
}

describe('parseLetterboxdExport', () => {
  it('reads ratings and watched films', async () => {
    const data = await parseLetterboxdExport(
      await makeZip({ 'ratings.csv': RATINGS_CSV, 'watched.csv': WATCHED_CSV }),
    )

    expect(data.ratings).toEqual([
      { date: '2024-01-05', name: 'Heat', year: 1995, letterboxdUri: 'https://boxd.it/a', rating: 4.5 },
      { date: '2024-02-10', name: 'Crouching Tiger, Hidden Dragon', year: 2000, letterboxdUri: 'https://boxd.it/b', rating: 5 },
      { date: '2024-03-01', name: 'No Year', year: null, letterboxdUri: 'https://boxd.it/c', rating: 3 },
    ])
    expect(data.watched.map((film) => film.name)).toEqual(['Heat', 'Unrated Film'])
  })

  it('only reads the files at the root of the archive', async () => {
    const data = await parseLetterboxdExport(
      await makeZip({
        'ratings.csv': RATINGS_CSV,
        'deleted/ratings.csv': 'Date,Name,Year,Letterboxd URI,Rating\n2020-01-01,Deleted,1990,https://boxd.it/x,1\n',
      }),
    )
    expect(data.ratings.map((film) => film.name)).not.toContain('Deleted')
  })

  it('works without watched.csv or diary.csv', async () => {
    const data = await parseLetterboxdExport(await makeZip({ 'ratings.csv': RATINGS_CSV }))
    expect(data.watched).toEqual([])
    expect(data.diary).toEqual([])
  })

  it('links diary entries to films by name and year', async () => {
    // Diary URIs point to the diary entry, so they never match the film's URI.
    const diaryCsv = `Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
2025-01-02,Heat,1995,https://boxd.it/entry1,4.5,,,2025-01-01
2026-03-04,Heat,1995,https://boxd.it/entry2,4.5,Yes,,2026-03-03
2025-05-06,Unrated Film,2010,https://boxd.it/entry3,,,,
2025-06-07,Heat,1986,https://boxd.it/entry4,3,,,2025-06-07
`
    const data = await parseLetterboxdExport(
      await makeZip({
        'ratings.csv': RATINGS_CSV,
        'watched.csv': WATCHED_CSV,
        'diary.csv': diaryCsv,
      }),
    )
    expect(data.diary).toEqual([
      { letterboxdUri: 'https://boxd.it/a', watchedDate: '2025-01-01' },
      { letterboxdUri: 'https://boxd.it/a', watchedDate: '2026-03-03' },
      // No Watched Date: falls back to the day it was logged.
      { letterboxdUri: 'https://boxd.it/e', watchedDate: '2025-05-06' },
      // "Heat (1986)" isn't in watched.csv or ratings.csv, so it's dropped.
    ])
  })

  it('rejects a file that is not a ZIP', async () => {
    await expect(parseLetterboxdExport(new Blob(['hello']))).rejects.toThrow(
      "isn't a valid ZIP",
    )
  })

  it('rejects a ZIP without ratings.csv', async () => {
    await expect(
      parseLetterboxdExport(await makeZip({ 'watched.csv': WATCHED_CSV })),
    ).rejects.toThrow('No ratings.csv')
  })

  it('names a missing column', async () => {
    await expect(
      parseLetterboxdExport(
        await makeZip({ 'ratings.csv': 'Date,Name,Year,Rating\n2024-01-01,Heat,1995,4\n' }),
      ),
    ).rejects.toThrow('"Letterboxd URI"')
  })

  it('drops rows whose link is not a Letterboxd page', async () => {
    const csv = `Date,Name,Year,Letterboxd URI,Rating
2024-01-01,Evil,2000,javascript:alert(1),4
2024-01-01,Other Site,2000,https://evil.example/x,4
2024-01-01,Fine,2000,https://letterboxd.com/film/fine/,4
`
    const data = await parseLetterboxdExport(await makeZip({ 'ratings.csv': csv }))
    expect(data.ratings.map((film) => film.name)).toEqual(['Fine'])
  })

  it('drops rows without a name or a link', async () => {
    const csv = `Date,Name,Year,Letterboxd URI,Rating
2024-01-01,,2000,https://boxd.it/a,4
2024-01-01,No Link,2000,,4
2024-01-01,Fine,2000,https://boxd.it/c,4
`
    const data = await parseLetterboxdExport(await makeZip({ 'ratings.csv': csv }))
    expect(data.ratings.map((film) => film.name)).toEqual(['Fine'])
  })

  it('reads a file saved with a UTF-8 BOM and Windows line endings', async () => {
    const bom = String.fromCharCode(0xfeff)
    const csv = bom + RATINGS_CSV.split(NEWLINE).join(String.fromCharCode(13, 10))
    const data = await parseLetterboxdExport(await makeZip({ 'ratings.csv': csv }))
    expect(data.ratings).toHaveLength(3)
  })

  it('rejects an archive that is too large, without reading it', async () => {
    const huge = { size: MAX_ZIP_BYTES + 1 } as Blob
    await expect(parseLetterboxdExport(huge)).rejects.toThrow('too large')
  })

  it('rejects a CSV that inflates far beyond a real export (ZIP bomb)', async () => {
    // 26 MB of one repeated letter compresses to a few tens of KB.
    const zip = new JSZip()
    zip.file('ratings.csv', 'x'.repeat(MAX_CSV_BYTES + 1), { compression: 'DEFLATE' })
    const blob = new Blob([await zip.generateAsync({ type: 'arraybuffer' })])
    expect(blob.size).toBeLessThan(MAX_ZIP_BYTES)
    await expect(parseLetterboxdExport(blob)).rejects.toThrow('ratings.csv is too large')
  })

  it('accepts a ratings.csv with a header and no films', async () => {
    const csv = ['Date,Name,Year,Letterboxd URI,Rating', ''].join(NEWLINE)
    const data = await parseLetterboxdExport(await makeZip({ 'ratings.csv': csv }))
    expect(data.ratings).toEqual([])
  })
})

describe('isLetterboxdUrl', () => {
  it('accepts Letterboxd links only', () => {
    expect(isLetterboxdUrl('https://boxd.it/abc')).toBe(true)
    expect(isLetterboxdUrl('https://letterboxd.com/film/heat-1995/')).toBe(true)
    expect(isLetterboxdUrl('javascript:alert(1)')).toBe(false)
    expect(isLetterboxdUrl('data:text/html,hi')).toBe(false)
    expect(isLetterboxdUrl('https://letterboxd.com.evil.example/')).toBe(false)
    expect(isLetterboxdUrl('https://evil.example/letterboxd.com')).toBe(false)
    expect(isLetterboxdUrl('a')).toBe(false)
    expect(isLetterboxdUrl(42)).toBe(false)
  })
})

describe('odd dates', () => {
  const films = [
    'Date,Name,Year,Letterboxd URI,Rating',
    'abc,Heat,1995,https://boxd.it/a,4',
    '',
  ].join(NEWLINE)

  it('become "no date" on a film, so they never sort as newest', async () => {
    const data = await parseLetterboxdExport(await makeZip({ 'ratings.csv': films }))
    expect(data.ratings[0].date).toBe('')
  })

  it('make a diary entry use the logged date, or drop it', async () => {
    const diary = [
      'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date',
      '2025-05-06,Heat,1995,https://boxd.it/e1,4,,,not a date',
      'abc,Heat,1995,https://boxd.it/e2,4,,,also not',
      '',
    ].join(NEWLINE)
    const data = await parseLetterboxdExport(
      await makeZip({ 'ratings.csv': films, 'diary.csv': diary }),
    )
    expect(data.diary).toEqual([
      { letterboxdUri: 'https://boxd.it/a', watchedDate: '2025-05-06' },
    ])
  })
})

describe('years outside the possible range', () => {
  it('turn into "no year" instead of a strange decade', async () => {
    const csv = [
      'Date,Name,Year,Letterboxd URI,Rating',
      '2024-01-01,Zero,0,https://boxd.it/a,4',
      '2024-01-01,Future,99999,https://boxd.it/b,4',
      '2024-01-01,Fine,1927,https://boxd.it/c,4',
      '',
    ].join(NEWLINE)
    const data = await parseLetterboxdExport(await makeZip({ 'ratings.csv': csv }))
    expect(data.ratings.map((film) => film.year)).toEqual([null, null, 1927])
  })
})
