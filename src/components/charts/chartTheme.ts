// Shared look for every chart. Colors are CSS variables from index.css, so
// the charts follow the same design tokens as the rest of the app.

/** Axis labels: small, muted text — never the bar color. */
export const AXIS_TICK = { fill: 'var(--color-text-muted)', fontSize: 12 }

/** Hairline, solid gridlines one step off the surface. */
export const GRID_STROKE = 'var(--color-border)'

/** Bars use a deeper gold; the hovered bar lights up to the accent. */
export const BAR_FILL = 'var(--color-chart)'
export const BAR_ACTIVE = { fill: 'var(--color-accent)' }

/** Faint highlight of the whole row/column under the pointer. */
export const HOVER_CURSOR = { fill: 'rgb(255 255 255 / 0.04)' }

/** Bars are at most this thick, so they never fill their whole slot. */
export const MAX_BAR_SIZE = 24

/** Skip the grow-in animation for people who ask for less motion. */
export const ANIMATE = !window.matchMedia('(prefers-reduced-motion: reduce)')
  .matches
