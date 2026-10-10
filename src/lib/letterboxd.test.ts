import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { parseLetterboxdExport } from './letterboxd.ts'

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

  it('works without watched.csv', async () => {
    const data = await parseLetterboxdExport(await makeZip({ 'ratings.csv': RATINGS_CSV }))
    expect(data.watched).toEqual([])
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
})
