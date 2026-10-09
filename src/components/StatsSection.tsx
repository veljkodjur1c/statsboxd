import { useMemo } from 'react'
import type { EnrichResult } from '../lib/enrich.ts'
import type { LetterboxdExport } from '../lib/letterboxd.ts'
import { computeStats, MIN_RATED } from '../lib/stats.ts'
import DecadeChart from './charts/DecadeChart.tsx'
import GenreChart from './charts/GenreChart.tsx'
import StatTable from './StatTable.tsx'

type StatsSectionProps = {
  data: LetterboxdExport
  tmdb: EnrichResult
}

function StatsSection({ data, tmdb }: StatsSectionProps) {
  // Recompute only when the data changes, not on every re-render.
  const stats = useMemo(() => computeStats(data, tmdb), [data, tmdb])

  return (
    <section className="stats-section" aria-label="Your statistics">
      <p className="stats-note">
        Click any name or bar to see the films behind it.
      </p>
      {stats.matchedFilms < stats.totalFilms && (
        <p className="stats-note">
          Genre, actor and director stats are based on the {stats.matchedFilms}{' '}
          of {stats.totalFilms} films found on TMDB.
        </p>
      )}

      <StatTable
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
        title="Top actors"
        description={`Actors in at least ${MIN_RATED.actors} films you rated, by your average rating.`}
        nameLabel="Actor"
        rows={stats.actors}
        defaultSort="average"
      />
      <StatTable
        title="Top directors"
        description={`Directors of at least ${MIN_RATED.directors} films you rated, by your average rating.`}
        nameLabel="Director"
        rows={stats.directors}
        defaultSort="average"
      />
      <StatTable
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
    </section>
  )
}

export default StatsSection
