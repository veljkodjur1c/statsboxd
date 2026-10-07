import type { LetterboxdExport } from '../lib/letterboxd.ts'

type ExportSummaryProps = {
  data: LetterboxdExport
  onReset: () => void
}

const LATEST_COUNT = 5

function ExportSummary({ data, onReset }: ExportSummaryProps) {
  const { ratings, watched } = data

  const average =
    ratings.length > 0
      ? ratings.reduce((sum, film) => sum + film.rating, 0) / ratings.length
      : null

  // Dates are "YYYY-MM-DD", so comparing them as strings orders them by time.
  const latest = [...ratings]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, LATEST_COUNT)

  return (
    <section className="card">
      <h2>Your export</h2>

      <div className="stats-grid">
        <Stat value={watched.length} label="Films watched" />
        <Stat value={ratings.length} label="Films rated" />
        <Stat
          value={average === null ? '—' : `${average.toFixed(2)} ★`}
          label="Average rating"
        />
      </div>

      {latest.length > 0 && (
        <>
          <h3>Latest ratings</h3>
          <ol className="film-list">
            {latest.map((film) => (
              <li key={film.letterboxdUri}>
                <span>
                  {film.name}
                  {film.year !== null && (
                    <span className="film-year"> {film.year}</span>
                  )}
                </span>
                <span
                  className="film-rating"
                  aria-label={`${film.rating} out of 5 stars`}
                >
                  {formatStars(film.rating)}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      <button type="button" className="button button--secondary" onClick={onReset}>
        Upload another export
      </button>
    </section>
  )
}

type StatProps = {
  value: string | number
  label: string
}

function Stat({ value, label }: StatProps) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

/** 3.5 → "★★★½" */
function formatStars(rating: number): string {
  const halfStar = rating % 1 === 0.5 ? '½' : ''
  return '★'.repeat(Math.floor(rating)) + halfStar
}

export default ExportSummary
