import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatStars } from '../../lib/format.ts'
import type { RatingBin } from '../../lib/stats.ts'
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

type RatingDistributionChartProps = {
  bins: RatingBin[]
}

// Label only whole stars on the axis; half steps get their bar but no text,
// so ten labels never crowd a phone screen.
const starTick = (rating: number) => (rating % 1 === 0 ? `${rating}★` : '')

/** Histogram: how many films you gave each rating. */
function RatingDistributionChart({ bins }: RatingDistributionChartProps) {
  return (
    <div className="chart-plot rating-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={bins}
          margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          barCategoryGap="12%"
        >
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis
            dataKey="rating"
            tickFormatter={starTick}
            interval={0}
            tick={AXIS_TICK}
            axisLine={{ stroke: GRID_STROKE }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={HOVER_CURSOR}
            content={({ active, payload }) => {
              const bin = payload?.[0]?.payload as RatingBin | undefined
              if (!active || bin === undefined) {
                return null
              }
              return (
                <ChartTooltip
                  value={`${bin.count} ${bin.count === 1 ? 'film' : 'films'}`}
                  label={`rated ${formatStars(bin.rating)}`}
                />
              )
            }}
          />
          <Bar
            dataKey="count"
            fill={BAR_FILL}
            activeBar={BAR_ACTIVE}
            radius={[4, 4, 0, 0]}
            maxBarSize={MAX_BAR_SIZE}
            isAnimationActive={ANIMATE}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default RatingDistributionChart
