import { useMemo, useState } from 'react'
import type { EnrichResult } from '../lib/enrich.ts'
import type { LetterboxdExport } from '../lib/letterboxd.ts'
import { diaryYears, filterByYear } from '../lib/stats.ts'
import CrowdCard from './CrowdCard.tsx'
import ExportSummary from './ExportSummary.tsx'
import ShareButton from './ShareButton.tsx'
import StatsSection from './StatsSection.tsx'
import WrapCard from './WrapCard.tsx'
import YearSelect from './YearSelect.tsx'
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
  const years = useMemo(() => diaryYears(data), [data])
  const [year, setYear] = useState<number | null>(null) // null = all time

  // Everything below works on this: the whole export, or one year of it.
  const view = useMemo(
    () => (year === null ? data : filterByYear(data, year)),
    [data, year],
  )

  return (
    <div className="results">
      <div className="results-title">
        <div className="results-heading">
          <p className="kicker">Now showing</p>
          <h2>{year === null ? 'Your stats' : `Your ${year}`}</h2>
          {year !== null && (
            <p className="results-note">
              Films you logged in your diary in {year}, with the ratings they
              have now.
            </p>
          )}
        </div>
        <div className="results-actions">
          {/* Without a diary there are no watch dates, so nothing to pick. */}
          {years.length > 0 && (
            <YearSelect years={years} value={year} onChange={setYear} />
          )}
          <ShareButton data={view} tmdb={tmdb} year={year} />
        </div>
      </div>
      <ExportSummary data={view} year={year} tmdb={tmdb} onRetry={onRetry} />
      <StatsSection data={view} tmdb={tmdb} />
      <CrowdCard data={view} tmdb={tmdb} />
      <WrapCard onReset={onReset} />
    </div>
  )
}

export default Results
