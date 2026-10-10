const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-10-04" → "4 Oct 2026". Anything else comes back unchanged. */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day || month > 12) {
    return date
  }
  return `${day} ${MONTHS[month - 1]} ${year}`
}

/** 3.5 → "★★★½" */
export function formatStars(rating: number): string {
  const halfStar = rating % 1 === 0.5 ? '½' : ''
  return '★'.repeat(Math.floor(rating)) + halfStar
}
