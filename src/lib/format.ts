/** 3.5 → "★★★½" */
export function formatStars(rating: number): string {
  const halfStar = rating % 1 === 0.5 ? '½' : ''
  return '★'.repeat(Math.floor(rating)) + halfStar
}
