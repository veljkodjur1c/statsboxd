// A five-point star, and its left half for ½ ratings (same geometry as the
// design system's Stars).
const STAR = 'M12 2.9 14.7 9.18 21.51 9.81 16.37 14.32 17.88 20.99 12 17.5 6.12 20.99 7.63 14.32 2.49 9.81 9.3 9.18Z'
const HALF_STAR = 'M12 17.5 6.12 20.99 7.63 14.32 2.49 9.81 9.3 9.18 12 2.9Z'

type StarsProps = {
  rating: number // 0.5–5 in half-star steps
}

/**
 * A rating as amber stars, the way Letterboxd shows it: only the earned
 * stars, with a half star for .5. Screen readers get "3.5 out of 5 stars".
 */
function Stars({ rating }: StarsProps) {
  const full = Math.floor(rating)
  const hasHalf = rating % 1 !== 0

  return (
    <span className="stars" role="img" aria-label={`${rating} out of 5 stars`}>
      {/* Array.from({ length: n }) makes an array of n slots to map over. */}
      {Array.from({ length: full }, (_, i) => (
        <Star key={i} path={STAR} />
      ))}
      {hasHalf && <Star path={HALF_STAR} />}
    </span>
  )
}

function Star({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {/* A thin stroke in the same colour softens the points. */}
      <path d={path} fill="currentColor" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  )
}

export default Stars
