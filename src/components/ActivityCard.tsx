import { useMemo, useState } from 'react'
import { MONTHS } from '../lib/format.ts'
import type { LetterboxdExport } from '../lib/letterboxd.ts'
import {
  addMonths,
  diaryByDay,
  diaryMonthRange,
  monthIndex,
  monthSummary,
  monthWeeks,
  type CalendarDay,
  type Month,
} from '../lib/stats.ts'
import Icon from './Icon.tsx'
import Stars from './Stars.tsx'
import './ActivityCard.css'

type ActivityCardProps = {
  data: LetterboxdExport // the whole export, or one year of it
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// The darkest shade stands for this many films a day or more.
const TOP_LEVEL = 3

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** "Wednesday 5 March" */
function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

/**
 * Reel 06: your diary as a month calendar. Every day you logged a film is
 * shaded by how many; pick one to see its films. Arrows and two pickers move
 * between the months your diary covers (with a year picked at the top, only
 * the month picker). The parent gives it a `key` that changes with the year
 * picker, so it starts over on the latest month when the data changes.
 */
function ActivityCard({ data }: ActivityCardProps) {
  const days = useMemo(() => diaryByDay(data), [data])
  // You can move from the month of your first diary film to that of the last.
  const range = useMemo(() => diaryMonthRange(days), [days])
  // Starts on the latest month. useState(() => …) computes the first value
  // only once, not on every render.
  const [month, setMonth] = useState<Month | null>(() => range?.last ?? null)
  const [picked, setPicked] = useState<string | null>(null)

  // Every hook has run by now: React needs them called in the same order on
  // every render, so an early return must come after them.
  if (month === null || range === null) {
    return null // nothing in the diary
  }

  const { first, last } = range
  const inRange = (candidate: Month) =>
    monthIndex(candidate) >= monthIndex(first) && monthIndex(candidate) <= monthIndex(last)
  // Picking a year can ask for a month outside the range (October in a year
  // whose diary ends in May): the nearest month in range is used instead.
  const clamp = (candidate: Month) =>
    monthIndex(candidate) < monthIndex(first)
      ? first
      : monthIndex(candidate) > monthIndex(last)
        ? last
        : candidate
  // Every year from the newest to the oldest, gaps included, so the arrows
  // can never land on a year the picker doesn't list.
  const years = Array.from({ length: last.year - first.year + 1 }, (_, i) => last.year - i)

  const weeks = monthWeeks(month, days)
  const summary = monthSummary(weeks)
  // `(day): day is CalendarDay` is a type guard: it tells TypeScript that
  // what passes the filter is a CalendarDay, no longer CalendarDay | null.
  const activeDays = weeks
    .flat()
    .filter((day): day is CalendarDay => day !== null && day.films.length > 0)
  // The day whose films are listed: the one picked, if it's in this month,
  // otherwise the latest day of the month with films.
  const shown = activeDays.find((day) => day.date === picked) ?? activeDays.at(-1) ?? null

  const monthName = MONTH_NAMES[month.month - 1]
  const atStart = monthIndex(month) === monthIndex(first)
  const atEnd = monthIndex(month) === monthIndex(last)

  return (
    <section className="card activity-card">
      <div className="card-header">
        <div className="card-heading">
          <p className="kicker">Reel 06 · Activity</p>
          <h2 className="card-title">Your diary, day by day</h2>
        </div>
      </div>
      <p className="card-description">
        The films you logged on the day you watched them. Pick a day to see
        which.
      </p>

      <div className="activity-nav">
        <button
          type="button"
          className="icon-button"
          aria-label="Previous month"
          disabled={atStart}
          onClick={() => setMonth(addMonths(month, -1))}
        >
          <Icon name="chevron-left" />
        </button>
        <div className="activity-pickers">
          <label className="activity-select">
            <span className="visually-hidden">Month</span>
            <select
              value={month.month}
              onChange={(event) =>
                setMonth(clamp({ year: month.year, month: Number(event.target.value) }))
              }
            >
              {/* Short names keep both pickers and the arrows on one line on
                  a phone; the full name is in the line under the calendar. */}
              {MONTHS.map((name, index) => (
                <option
                  key={name}
                  value={index + 1}
                  disabled={!inRange({ year: month.year, month: index + 1 })}
                >
                  {name}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" />
          </label>
          {/* With one year (or a year picked at the top) only the month moves. */}
          {years.length > 1 ? (
            <label className="activity-select">
              <span className="visually-hidden">Year</span>
              <select
                value={month.year}
                onChange={(event) =>
                  setMonth(clamp({ year: Number(event.target.value), month: month.month }))
                }
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" />
            </label>
          ) : (
            <span className="activity-year">{month.year}</span>
          )}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Next month"
          disabled={atEnd}
          onClick={() => setMonth(addMonths(month, 1))}
        >
          <Icon name="chevron-right" />
        </button>
      </div>

      <table className="activity-calendar">
        <caption className="visually-hidden">
          Films you logged in {monthName} {month.year}
        </caption>
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday} scope="col">
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, row) => (
            // A week has no id of its own; its place never changes while
            // the month is shown, so the index is a fine key here.
            <tr key={row}>
              {week.map((day, column) => (
                <td key={column}>
                  {day !== null && (
                    <DayCell
                      day={day}
                      label={`${day.day} ${monthName}`}
                      selected={day.date === shown?.date}
                      onPick={setPicked}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="activity-footer">
        <p className="activity-summary">
          {summary.films === 0
            ? `Nothing logged in ${monthName} ${month.year}.`
            : `${plural(summary.films, 'film')} in ${monthName}, on ${plural(summary.activeDays, 'day')}`}
        </p>
        <ActivityKey />
      </div>

      {shown !== null && (
        <div className="activity-day">
          <h3 className="activity-day-title">{formatDay(shown.date)}</h3>
          <ol className="film-list">
            {/* The same film twice in a day is rare but possible, so the
                index is part of the key. */}
            {shown.films.map((film, index) => (
              <li key={`${film.letterboxdUri}-${index}`}>
                <span className="film-name">
                  <a href={film.letterboxdUri} target="_blank" rel="noreferrer">
                    {film.name}
                  </a>
                  {film.year !== null && <span className="film-meta">{film.year}</span>}
                </span>
                {film.rating === null ? (
                  <span className="film-unrated">Not rated</span>
                ) : (
                  <Stars rating={film.rating} />
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}

type DayCellProps = {
  day: CalendarDay
  label: string // "5 March"
  selected: boolean
  onPick: (date: string) => void
}

/** One day: plain when empty, a shaded button when you logged films. */
function DayCell({ day, label, selected, onPick }: DayCellProps) {
  const count = day.films.length
  if (count === 0) {
    return <span className="activity-cell">{day.day}</span>
  }
  return (
    <button
      type="button"
      className="activity-cell"
      data-level={Math.min(count, TOP_LEVEL)}
      aria-label={`${label}: ${plural(count, 'film')}`}
      aria-pressed={selected}
      onClick={() => onPick(day.date)}
    >
      {day.day}
    </button>
  )
}

/** What the shades mean. */
function ActivityKey() {
  return (
    <div className="activity-key" aria-hidden="true">
      Films a day
      {[1, 2, TOP_LEVEL].map((level) => (
        <span key={level} className="activity-key-item">
          <span className="activity-key-swatch" data-level={level} />
          {level === TOP_LEVEL ? `${level}+` : level}
        </span>
      ))}
    </div>
  )
}

export default ActivityCard
