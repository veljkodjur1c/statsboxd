import type { EnrichResult } from '../lib/enrich.ts'
import type { LetterboxdExport } from '../lib/letterboxd.ts'
import ExportSummary from './ExportSummary.tsx'
import StatsSection from './StatsSection.tsx'
import WrapCard from './WrapCard.tsx'
import './Results.css'

type ResultsProps = {
  data: LetterboxdExport
  tmdb: EnrichResult
  onRetry: () => void
  onReset: () => void
}

/**
 * Everything shown after an export is processed. It's its own file because
 * App loads it lazily: this part pulls in Recharts, about half of the app's
 * code, which the upload screen doesn't need. The CSS these components import
 * is split off the same way and arrives together with them.
 */
function Results({ data, tmdb, onRetry, onReset }: ResultsProps) {
  return (
    <div className="results">
      <div className="results-title">
        <p className="kicker">Now showing</p>
        <h2>Your stats</h2>
      </div>
      <ExportSummary data={data} tmdb={tmdb} onRetry={onRetry} />
      <StatsSection data={data} tmdb={tmdb} />
      <WrapCard onReset={onReset} />
    </div>
  )
}

export default Results
