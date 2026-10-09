type ChartTooltipProps = {
  value: string // the number the reader is after, shown first and strongest
  label: string
  detail?: string
}

/** The small box shown while hovering a bar. */
function ChartTooltip({ value, label, detail }: ChartTooltipProps) {
  return (
    <div className="chart-tooltip">
      <strong>{value}</strong>
      <span>{label}</span>
      {detail && <span className="chart-tooltip-detail">{detail}</span>}
    </div>
  )
}

export default ChartTooltip
