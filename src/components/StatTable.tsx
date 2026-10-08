import { useState } from 'react'
import { comparators, type GroupStat, type SortKey } from '../lib/stats.ts'

type StatTableProps = {
  title: string
  description: string
  nameLabel: string // header of the first column, e.g. "Genre"
  rows: GroupStat[]
  defaultSort: SortKey
  limit?: number // show only the first rows until "Show all" is clicked
}

function StatTable({
  title,
  description,
  nameLabel,
  rows,
  defaultSort,
  limit,
}: StatTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>(defaultSort)
  const [showAll, setShowAll] = useState(false)

  const sorted = [...rows].sort(comparators[sortKey])
  const visible =
    limit === undefined || showAll ? sorted : sorted.slice(0, limit)

  return (
    <section className="card stat-card">
      <h2>{title}</h2>
      <p>{description}</p>

      {rows.length === 0 ? (
        <p className="empty-note">Not enough rated films yet.</p>
      ) : (
        <table className="stat-table">
          <thead>
            <tr>
              <SortHeader column="name" label={nameLabel} sortKey={sortKey} onSort={setSortKey} />
              <SortHeader column="films" label="Films" sortKey={sortKey} onSort={setSortKey} />
              <SortHeader column="rated" label="Rated" sortKey={sortKey} onSort={setSortKey} />
              <SortHeader column="average" label="Avg" sortKey={sortKey} onSort={setSortKey} />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                <td>{row.films}</td>
                <td>{row.rated}</td>
                <td className="stat-average">
                  {row.average === null ? '—' : row.average.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {limit !== undefined && rows.length > limit && (
        <button
          type="button"
          className="button button--secondary button--small"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show less' : `Show all ${rows.length}`}
        </button>
      )}
    </section>
  )
}

type SortHeaderProps = {
  column: SortKey
  label: string
  sortKey: SortKey
  onSort: (column: SortKey) => void
}

function SortHeader({ column, label, sortKey, onSort }: SortHeaderProps) {
  const active = column === sortKey
  // Names sort A→Z; every number column sorts from highest to lowest.
  const direction = column === 'name' ? 'ascending' : 'descending'

  return (
    <th scope="col" aria-sort={active ? direction : undefined}>
      <button type="button" className="sort-button" onClick={() => onSort(column)}>
        {label}
        <span className="sort-arrow" aria-hidden="true">
          {active ? (direction === 'ascending' ? '▲' : '▼') : ''}
        </span>
      </button>
    </th>
  )
}

export default StatTable
