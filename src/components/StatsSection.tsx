import { useMemo } from 'react'
import type { EnrichResult } from '../lib/enrich.ts'
import type { LetterboxdExport } from '../lib/letterboxd.ts'
import { computeStats, MIN_RATED } from '../lib/stats.ts'
import DecadeChart from './charts/DecadeChart.tsx'
import GenreChart from './charts/GenreChart.tsx'
import Icon from './Icon.tsx'
import StatTable from './StatTable.tsx'
import './StatsSection.css'

type StatsSectionProps = {
  data: LetterboxdExport
  tmdb: EnrichResult
}

/** The four stat cards ("reels"): the two charts first, then the two tables. */
function StatsSection({ data, tmdb }: StatsSectionProps) {
  // Recompute only when the data changes, not on every re-render.
  const stats = useMemo(() => computeStats(data, tmdb), [data, tmdb])

  return (
    <section className="stats-section" aria-label="Your statistics">
      <p className="hint">
        <Icon name="info" />
        <span>
          Click any name or bar to see the films behind it.
          {stats.matchedFilms < stats.totalFilms &&
            ` Genre, actor and director stats are based on the ${stats.matchedFilms} of ${stats.totalFilms} films found on TMDB.`}
        </span>
      </p>

      <div className="stats-grid">
        <StatTable
          kicker="Reel 01 · Genres"
          title="Average rating by genre"
          description="Your average rating for each genre. A film can belong to several genres."
          nameLabel="Genre"
          rows={stats.genres}
          defaultSort="average"
          renderChart={(onSelect) => (
            <GenreChart
              rows={stats.genres}
              average={stats.averageRating}
              onSelect={onSelect}
            />
          )}
        />
        <StatTable
          kicker="Reel 02 · Decades"
          title="Ratings by decade"
          description="Films grouped by the decade they were released in."
          nameLabel="Decade"
          rows={stats.decades}
          defaultSort="name"
          renderChart={(onSelect) => (
            <DecadeChart
              rows={stats.decades}
              average={stats.averageRating}
              onSelect={onSelect}
            />
          )}
        />
        <StatTable
          kicker="Reel 03 · Actors"
          title="Top actors"
          description={`Actors in at least ${MIN_RATED.actors} films you rated, by your average rating.`}
          nameLabel="Actor"
          rows={stats.actors}
          defaultSort="average"
        />
        <StatTable
          kicker="Reel 04 · Directors"
          title="Top directors"
          description={`Directors of at least ${MIN_RATED.directors} films you rated, by your average rating.`}
          nameLabel="Director"
          rows={stats.directors}
          defaultSort="average"
        />
      </div>
    </section>
  )
}

export default StatsSection
