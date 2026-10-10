import type { ReactNode } from 'react'
import type { EnrichResult } from '../lib/enrich.ts'
import { formatDate } from '../lib/format.ts'
import type { Film, LetterboxdExport } from '../lib/letterboxd.ts'
import {
  latestDiaryEntries,
  latestRatings,
  ratingDistribution,
  watchTime,
} from '../lib/stats.ts'
import RatingDistributionChart from './charts/RatingDistributionChart.tsx'
import Icon, { type IconName } from './Icon.tsx'
import Stars, { StarMark } from './Stars.tsx'
import './ExportSummary.css'

type ExportSummaryProps = {
  data: LetterboxdExport // the whole export, or one year of it
  year: number | null // the year `data` was narrowed to; null = all time
  tmdb: EnrichResult
  onRetry: () => void
}

const LATEST_COUNT = 5

/** The top of the results: four headline numbers, notices, and how you rate. */
function ExportSummary({ data, year, tmdb, onRetry }: ExportSummaryProps) {
  const { ratings, watched } = data

  const average =
    ratings.length > 0
      ? ratings.reduce((sum, film) => sum + film.rating, 0) / ratings.length
      : null

  // All time: what you rated last. One year: what you watched last that year,
  // from the diary. (A rating's date moves whenever you change it, so in a
  // year view it could point to a later year.)
  const latest =
    year === null
      ? latestRatings(data, LATEST_COUNT)
      : latestDiaryEntries(data, LATEST_COUNT)

  const hours = Math.round(watchTime(data, tmdb) / 60)

  return (
    <>
      <div className="tiles">
        <Tile label="Films watched" icon="eye">
          {watched.length}
        </Tile>
        <Tile label="Films rated" icon="star">
          {ratings.length}
        </Tile>
        <Tile label="Average rating" icon="gauge">
          {average === null ? (
            '—'
          ) : (
            <>
              {average.toFixed(2)}
              <StarMark />
            </>
          )}
        </Tile>
        <Tile label="Watch time" icon="clock">
          {hours === 0 ? (
            '—'
          ) : (
            <>
              {hours.toLocaleString('en-US')}
              <small>hours</small>
            </>
          )}
        </Tile>
      </div>

      {tmdb.failed.length > 0 && (
        <div className="notice notice--error" role="alert">
          <Icon name="alert" />
          <p className="notice-text">
            {tmdb.failed.length} films couldn’t be fetched from TMDB (network
            problem).
          </p>
          <button
            type="button"
            className="button button--secondary button--small"
            onClick={onRetry}
          >
            <Icon name="refresh" />
            Retry
          </button>
        </div>
      )}

      {tmdb.unmatched.length > 0 && (
        <details className="notice">
          <summary>
            <Icon name="info" />
            <span className="notice-text">
              {tmdb.unmatched.length} films not found on TMDB
            </span>
            <span className="notice-chevron">
              <Icon name="chevron-down" />
            </span>
          </summary>
          <FilmNames films={tmdb.unmatched} />
        </details>
      )}

      {ratings.length > 0 && (
        <div className="overview">
          <section className="card">
            <div className="card-header">
              <div className="card-heading">
                <p className="kicker">Rating spread</p>
                <h3 className="card-title">How you rate</h3>
              </div>
              <p className="card-meta">
                {ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'}
              </p>
            </div>
            <RatingDistributionChart bins={ratingDistribution(ratings)} />
          </section>

          <section className="card">
            <div className="card-header">
              <div className="card-heading">
                <p className="kicker">
                  {year === null ? 'Recent activity' : `Diary · ${year}`}
                </p>
                <h3 className="card-title">
                  {year === null ? 'Latest ratings' : 'Last watched'}
                </h3>
              </div>
            </div>
            <ol className="film-list latest-list">
              {latest.map((film) => (
                // A rewatch can list a film twice, so the date is in the key.
                <li key={`${film.letterboxdUri} ${film.date}`}>
                  <span className="film-name">
                    {film.name}
                    <span className="film-meta">
                      {film.year !== null && `${film.year} · `}
                      {formatDate(film.date)}
                    </span>
                  </span>
                  {film.rating === null ? (
                    <span className="film-unrated">Not rated</span>
                  ) : (
                    <Stars rating={film.rating} />
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </>
  )
}

type TileProps = {
  label: string
  icon: IconName
  children: ReactNode // the number, plus anything that goes with it
}

/** A ticket stub with one headline number. */
function Tile({ label, icon, children }: TileProps) {
  return (
    <div className="tile">
      <div className="tile-head">
        <span className="tile-label">{label}</span>
        <span className="tile-icon">
          <Icon name={icon} />
        </span>
      </div>
      <div className="tile-body">
        <span className="tile-value">{children}</span>
      </div>
    </div>
  )
}

function FilmNames({ films }: { films: Film[] }) {
  return (
    <ul>
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
