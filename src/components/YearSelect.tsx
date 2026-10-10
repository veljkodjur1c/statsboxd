import Icon from './Icon.tsx'
import './YearSelect.css'

type YearSelectProps = {
  years: number[] // newest first
  value: number | null // null = all time
  onChange: (year: number | null) => void
}

const ALL_TIME = 'all'

/**
 * Picks the year the stats are about. A native <select>: it works with the
 * keyboard and screen readers out of the box, opens the phone's own picker,
 * and stays tidy however many years the diary has.
 */
function YearSelect({ years, value, onChange }: YearSelectProps) {
  return (
    <label className="year-select">
      <span className="visually-hidden">Show stats for</span>
      <Icon name="calendar" />
      <select
        // A <select> only deals in strings, so the year goes in as text and
        // comes back out as a number.
        value={value === null ? ALL_TIME : String(value)}
        onChange={(event) => {
          const selected = event.target.value
          onChange(selected === ALL_TIME ? null : Number(selected))
        }}
      >
        <option value={ALL_TIME}>All time</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" />
    </label>
  )
}

export default YearSelect
