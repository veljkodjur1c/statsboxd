import { useState } from 'react'
import {
  DEFAULT_DIRECTION,
  sortGroups,
  type GroupStat,
  type SortDirection,
  type SortKey,
} from '../lib/stats.ts'
import FilmListDialog from './FilmListDialog.tsx'

// Every table shows this many rows until "Show all" is clicked. The CSS
// (.stat-card) reserves exactly this much room, so collapsed cards line up.
const VISIBLE_ROWS = 10

type StatTableProps = {
  title: string
  description: string
  nameLabel: string // header of the first column, e.g. "Genre"
  rows: GroupStat[]
  defaultSort: SortKey
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
}: StatTableProps) {
  const [sort, setSort] = useState<Sort>({
    key: defaultSort,
    direction: DEFAULT_DIRECTION[defaultSort],
  })
  const [showAll, setShowAll] = useState(false)
  // The group whose films are shown in the dialog; null = dialog closed.
  const [openGroup, setOpenGroup] = useState<GroupStat | null>(null)

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
  const visible = showAll ? sorted : sorted.slice(0, VISIBLE_ROWS)

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
                <th scope="row">
                  <button
                    type="button"
                    className="row-button"
                    title={row.label} // long names are cut off with "…"
                    onClick={() => setOpenGroup(row)}
                  >
                    {row.label}
                  </button>
                </th>
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

      {rows.length > VISIBLE_ROWS && (
        <button
          type="button"
          className="button button--secondary button--small"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show less' : `Show all ${rows.length}`}
        </button>
      )}

      {openGroup !== null && (
        <FilmListDialog
          group={openGroup}
          kind={nameLabel}
          onClose={() => setOpenGroup(null)}
        />
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
