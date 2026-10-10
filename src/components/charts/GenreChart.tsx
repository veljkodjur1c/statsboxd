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
  CATEGORY_TICK,
  BAR_FILL,
  GRID_STROKE,
  HOVER_CURSOR,
  MAX_BAR_SIZE,
} from './chartTheme.ts'

type GenreChartProps = {
  rows: GroupStat[] // already sorted, best average first
  average: number | null
  onSelect: (group: GroupStat) => void
}

/** Horizontal bars: your average rating per genre, on a 0–5 scale. */
function GenreChart({ rows, average, onSelect }: GenreChartProps) {
  return (
    <>
      {average !== null && <AverageKey average={average} />}
      <div className="chart-plot genre-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            barCategoryGap="20%"
          >
            <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
            <XAxis
              type="number"
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={112}
              interval={0}
              tick={CATEGORY_TICK}
              axisLine={{ stroke: GRID_STROKE }}
              tickLine={false}
            />
            <Tooltip
              cursor={HOVER_CURSOR}
              content={({ active, payload }) => {
                const group = payload?.[0]?.payload as GroupStat | undefined
                if (!active || group === undefined || group.average === null) {
                  return null
                }
                return (
                  <ChartTooltip
                    value={`${group.average.toFixed(2)} ★`}
                    label={group.label}
                    detail={`${group.rated} rated · click for films`}
                  />
                )
              }}
            />
            <Bar
              dataKey="average"
              fill={BAR_FILL}
              activeBar={BAR_ACTIVE}
              radius={[0, 4, 4, 0]}
              maxBarSize={MAX_BAR_SIZE}
              isAnimationActive={ANIMATE}
              cursor="pointer"
              onClick={(bar) => onSelect(bar.payload as GroupStat)}
            />
            {average !== null && (
              <ReferenceLine x={average} stroke="var(--color-text-muted)" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

export default GenreChart
