import type { EnrichResult } from '../lib/enrich.ts'
import type { LetterboxdExport } from '../lib/letterboxd.ts'
import ExportSummary from './ExportSummary.tsx'
import StatsSection from './StatsSection.tsx'

type ResultsProps = {
  data: LetterboxdExport
  tmdb: EnrichResult
  onRetry: () => void
  onReset: () => void
}

/**
 * Everything shown after an export is processed. It's its own file because
 * App loads it lazily: this part pulls in Recharts, about half of the app's
 * code, which the upload screen doesn't need.
 */
function Results({ data, tmdb, onRetry, onReset }: ResultsProps) {
  return (
    <>
      <ExportSummary data={data} tmdb={tmdb} onRetry={onRetry} onReset={onReset} />
      <StatsSection data={data} tmdb={tmdb} />
    </>
  )
}

export default Results
