import { useMemo } from 'react'
import type { EnrichResult } from '../lib/enrich.ts'
import type { LetterboxdExport } from '../lib/letterboxd.ts'
import { crowdComparison, MIN_CROWD_VOTES, type CrowdFilm } from '../lib/stats.ts'
import Stars from './Stars.tsx'
import './CrowdCard.css'

type CrowdCardProps = {
  data: LetterboxdExport
  tmdb: EnrichResult
}

const LIST_LENGTH = 5

// Below this, "higher" or "lower" would be splitting hairs.
const SAME_THRESHOLD = 0.05

/** "+1.5" / "−0.5", with a real minus sign. */
function formatDifference(difference: number): string {
  const sign = difference > 0 ? '+' : '−'
  return sign + Math.abs(difference).toFixed(1)
}

/** Reel 07: your ratings next to the TMDB users' average. */
function CrowdCard({ data, tmdb }: CrowdCardProps) {
  const { films, yourAverage, crowdAverage } = useMemo(
    () => crowdComparison(data, tmdb),
    [data, tmdb],
  )
  if (yourAverage === null || crowdAverage === null) {
    return null // no rated film has enough TMDB votes
  }

  // films is sorted from "you liked it more" to "you liked it less".
  const likedMore = films.filter((film) => film.difference > 0).slice(0, LIST_LENGTH)
  const likedLess = films
    .filter((film) => film.difference < 0)
    .reverse()
    .slice(0, LIST_LENGTH)

  const gap = yourAverage - crowdAverage
  const verdict =
    Math.abs(gap) < SAME_THRESHOLD
      ? 'You rate about the same as the crowd.'
      : `You rate ${Math.abs(gap).toFixed(2)} stars ${gap > 0 ? 'higher' : 'lower'} than the crowd.`

  return (
    <section className="card crowd-card">
      <div className="card-header">
        <div className="card-heading">
          <p className="kicker">Reel 07 · The crowd</p>
          <h2 className="card-title">You vs. the crowd</h2>
        </div>
        <p className="card-meta">
          {films.length} {films.length === 1 ? 'film' : 'films'}
        </p>
      </div>
      <p className="card-description">
        Your rating next to the average of TMDB users (out of 10, halved to
        stars), for the films you rated that at least {MIN_CROWD_VOTES} of them
        voted on.
      </p>

      <div className="crowd-verdict">
        <p className="crowd-verdict-text">{verdict}</p>
        <p className="crowd-averages">
          Your average {yourAverage.toFixed(2)} · crowd {crowdAverage.toFixed(2)}
        </p>
      </div>

      <div className="crowd-columns">
        <CrowdList title="You liked more" films={likedMore} />
        <CrowdList title="You liked less" films={likedLess} />
      </div>
    </section>
  )
}

function CrowdList({ title, films }: { title: string; films: CrowdFilm[] }) {
  return (
    <div className="crowd-column">
      <h3 className="crowd-column-title">{title}</h3>
      {films.length === 0 ? (
        <p className="empty-note">None.</p>
      ) : (
        <ol className="film-list crowd-list">
          {films.map((film) => (
            <li key={film.letterboxdUri}>
              <span className="film-name">
                <a href={film.letterboxdUri} target="_blank" rel="noreferrer">
                  {film.name}
                </a>
                <span className="film-meta">
                  {film.year !== null && `${film.year} · `}
                  crowd {film.crowd.toFixed(1)}
                </span>
              </span>
              <Stars rating={film.rating} />
              <span className="crowd-difference">
                <span className="visually-hidden">difference </span>
                {formatDifference(film.difference)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default CrowdCard
