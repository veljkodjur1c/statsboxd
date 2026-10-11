import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { GroupStat } from '../../lib/stats.ts'
import AverageKey from './AverageKey.tsx'
import ChartTooltip from './ChartTooltip.tsx'
import {
  ANIMATE,
  AXIS_TICK,
  BAR_ACTIVE,
  BAR_FILL,
  GRID_STROKE,
  HOVER_CURSOR,
  MAX_BAR_SIZE,
} from './chartTheme.ts'

type ColumnChartProps = {
  rows: GroupStat[] // in their natural order: decades, runtimes…
  average: number | null
  onSelect: (group: GroupStat) => void
  // Optional shorter text for the axis, e.g. "90–119" for "90–119 min".
  formatTick?: (label: string) => string
}

/**
 * Columns: your average rating per group, for groups that have an order
 * (decades, runtimes). The number of films is in the tooltip rather than on
 * a second axis — two scales on one chart mislead.
 */
function ColumnChart({ rows, average, onSelect, formatTick }: ColumnChartProps) {
  return (
    <>
      {average !== null && <AverageKey average={average} />}
      <div className="chart-plot">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
            barCategoryGap="20%"
          >
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              tickFormatter={formatTick}
              // When the labels don't all fit (narrow phones), show every
              // second (or third…) one, evenly, instead of dropping some at
              // random.
              interval="equidistantPreserveStart"
              axisLine={{ stroke: GRID_STROKE }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={HOVER_CURSOR}
              content={({ active, payload }) => {
                const group = payload?.[0]?.payload as GroupStat | undefined
                if (!active || group === undefined) {
                  return null
                }
                const films = `${group.films} ${group.films === 1 ? 'film' : 'films'}`
                return (
                  <ChartTooltip
                    value={group.average === null ? 'No ratings' : `${group.average.toFixed(2)} ★`}
                    label={group.label}
                    detail={`${films}, ${group.rated} rated · click for films`}
                  />
                )
              }}
            />
            <Bar
              dataKey="average"
              fill={BAR_FILL}
              activeBar={BAR_ACTIVE}
              radius={[4, 4, 0, 0]}
              maxBarSize={MAX_BAR_SIZE}
              isAnimationActive={ANIMATE}
              cursor="pointer"
              onClick={(bar) => onSelect(bar.payload as GroupStat)}
            />
            {average !== null && (
              <ReferenceLine y={average} stroke="var(--color-text-muted)" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

export default ColumnChart
