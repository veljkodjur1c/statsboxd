import { useState } from 'react'
import {
  DEFAULT_DIRECTION,
  sortGroups,
  type GroupStat,
  type SortDirection,
  type SortKey,
} from '../lib/stats.ts'

type StatTableProps = {
  title: string
  description: string
  nameLabel: string // header of the first column, e.g. "Genre"
  rows: GroupStat[]
  defaultSort: SortKey
  limit?: number // show only the first rows until "Show all" is clicked
}

type Sort = {
  key: SortKey
  direction: SortDirection
}

function StatTable({
  title,
  description,
  nameLabel,
  rows,
  defaultSort,
  limit,
}: StatTableProps) {
  const [sort, setSort] = useState<Sort>({
    key: defaultSort,
    direction: DEFAULT_DIRECTION[defaultSort],
  })
  const [showAll, setShowAll] = useState(false)

  // Clicking the active column flips its direction; clicking another column
  // switches to it in that column's default direction.
  function handleSort(column: SortKey) {
    setSort((current) =>
      current.key === column
        ? { key: column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key: column, direction: DEFAULT_DIRECTION[column] },
    )
  }

  const sorted = sortGroups(rows, sort.key, sort.direction)
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
              <SortHeader column="name" label={nameLabel} sort={sort} onSort={handleSort} />
              <SortHeader column="films" label="Films" sort={sort} onSort={handleSort} />
              <SortHeader column="rated" label="Rated" sort={sort} onSort={handleSort} />
              <SortHeader column="average" label="Avg" sort={sort} onSort={handleSort} />
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
  sort: Sort
  onSort: (column: SortKey) => void
}

function SortHeader({ column, label, sort, onSort }: SortHeaderProps) {
  const active = column === sort.key
  const ariaSort = sort.direction === 'asc' ? 'ascending' : 'descending'

  return (
    <th scope="col" aria-sort={active ? ariaSort : undefined}>
      <button type="button" className="sort-button" onClick={() => onSort(column)}>
        {label}
        <span className="sort-arrow" aria-hidden="true">
          {active ? (sort.direction === 'asc' ? '▲' : '▼') : ''}
        </span>
      </button>
    </th>
  )
}

export default StatTable
