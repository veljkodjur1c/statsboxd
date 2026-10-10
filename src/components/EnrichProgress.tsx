import Mascot from './brand/Mascot.tsx'
import './EnrichProgress.css'

type EnrichProgressProps = {
  done: number
  total: number
}

// Counters are zero-padded like the frame numbers on a film strip: 0137 / 0270.
const frame = (n: number) => String(n).padStart(4, '0')

function EnrichProgress({ done, total }: EnrichProgressProps) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <section className="card state-card">
      <Mascot mood="busy" />
      <div>
        <p className="kicker">Developing</p>
        <h2 className="card-title">Fetching film details</h2>
        <p className="card-description">
          Looking up genres, cast and directors on TMDB. Results are saved in
          your browser, so next time this is instant.
        </p>
        {/* The real <progress> element keeps the meaning for screen readers;
            the wrapper draws it as a running strip of film. */}
        <div className="film-strip is-running">
          <progress
            max={Math.max(total, 1)}
            value={done}
            aria-label="Fetching film details from TMDB"
          />
        </div>
        <p className="film-strip-count">
          <span>
            <strong>{frame(done)}</strong> / {frame(total)} films
          </span>
          <span>{percent}%</span>
        </p>
      </div>
    </section>
  )
}

export default EnrichProgress
