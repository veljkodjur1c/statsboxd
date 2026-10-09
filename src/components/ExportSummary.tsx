import type { EnrichResult } from '../lib/enrich.ts'
import { formatStars } from '../lib/format.ts'
import type { Film, LetterboxdExport } from '../lib/letterboxd.ts'
import { ratingDistribution } from '../lib/stats.ts'
import RatingDistributionChart from './charts/RatingDistributionChart.tsx'

type ExportSummaryProps = {
  data: LetterboxdExport
  tmdb: EnrichResult
  onRetry: () => void
  onReset: () => void
}

const LATEST_COUNT = 5

function ExportSummary({ data, tmdb, onRetry, onReset }: ExportSummaryProps) {
  const { ratings, watched } = data

  const average =
    ratings.length > 0
      ? ratings.reduce((sum, film) => sum + film.rating, 0) / ratings.length
      : null

  // Dates are "YYYY-MM-DD", so comparing them as strings orders them by time.
  const latest = [...ratings]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, LATEST_COUNT)

  const matched = Object.keys(tmdb.byUri).length
  const totalFilms = matched + tmdb.unmatched.length + tmdb.failed.length

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
        <Stat value={`${matched} / ${totalFilms}`} label="Matched on TMDB" />
      </div>

      {ratings.length > 0 && (
        <>
          <h3>How you rate</h3>
          <RatingDistributionChart bins={ratingDistribution(ratings)} />
        </>
      )}

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

      {tmdb.unmatched.length > 0 && (
        <details className="details">
          <summary>{tmdb.unmatched.length} films not found on TMDB</summary>
          <FilmNames films={tmdb.unmatched} />
        </details>
      )}

      {tmdb.failed.length > 0 && (
        <div className="details">
          <p className="error-message" role="alert">
            {tmdb.failed.length} films couldn’t be fetched from TMDB (network
            problem).
          </p>
          <button type="button" className="button" onClick={onRetry}>
            Retry
          </button>
        </div>
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

function FilmNames({ films }: { films: Film[] }) {
  return (
    <ul className="plain-list">
      {films.map((film) => (
        <li key={film.letterboxdUri}>
          {film.name}
          {film.year !== null && <span className="film-year"> {film.year}</span>}
        </li>
      ))}
    </ul>
  )
}

export default ExportSummary
