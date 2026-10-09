import { useState, type ReactNode } from 'react'
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
  // Optional chart view. It's a function ("render prop") so the table can
  // hand the chart a way to open the film list when a bar is clicked.
  renderChart?: (onSelect: (group: GroupStat) => void) => ReactNode
}

type Sort = {
  key: SortKey
  direction: SortDirection
}

type View = 'chart' | 'table'

function StatTable({
  title,
  description,
  nameLabel,
  rows,
  defaultSort,
  renderChart,
}: StatTableProps) {
  const [sort, setSort] = useState<Sort>({
    key: defaultSort,
    direction: DEFAULT_DIRECTION[defaultSort],
  })
  const [view, setView] = useState<View>(renderChart ? 'chart' : 'table')
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
      ) : view === 'chart' && renderChart ? (
        <div className="stat-chart">{renderChart(setOpenGroup)}</div>
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

      {/* Always rendered, so every card keeps the same footer row. */}
      <div className="stat-card-footer">
        {renderChart && rows.length > 0 && (
          <ViewToggle view={view} onChange={setView} />
        )}
        {view === 'table' && rows.length > VISIBLE_ROWS && (
          <button
            type="button"
            className="button button--secondary button--small"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show less' : `Show all ${rows.length}`}
          </button>
        )}
      </div>

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

type ViewToggleProps = {
  view: View
  onChange: (view: View) => void
}

/** Two-button switch between the chart and the table. */
function ViewToggle({ view, onChange }: ViewToggleProps) {
  const options: { value: View; label: string }[] = [
    { value: 'chart', label: 'Chart' },
    { value: 'table', label: 'Table' },
  ]
  return (
    <div className="view-toggle" role="group" aria-label="View as">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={view === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
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
