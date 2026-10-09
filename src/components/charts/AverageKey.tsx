type AverageKeyProps = {
  average: number
}

/**
 * Explains the thin reference line drawn at your overall average. It lives in
 * HTML above the plot instead of inside the SVG, so it can never collide
 * with a bar.
 */
function AverageKey({ average }: AverageKeyProps) {
  return (
    <div className="chart-key">
      <span className="chart-key-line" aria-hidden="true" />
      Your overall average: {average.toFixed(2)}
    </div>
  )
}

export default AverageKey
