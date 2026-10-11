import { LOGO_BEAM, LOGO_LENS, STAR } from './shapes.ts'
import type { GroupStat, ShareSummary } from './stats.ts'

/*
 * The shareable summary image, drawn by hand on a <canvas>: the logo, the
 * four headline numbers as ticket stubs, and your top genre, actor and
 * director. Colours and fonts are read from the CSS tokens, so it looks like
 * the app. The size is fixed: 1080×1350 is the 4:5 portrait that feeds show
 * without cropping.
 */

export const SHARE_WIDTH = 1080
export const SHARE_HEIGHT = 1350

const MARGIN = 72
const CONTENT_WIDTH = SHARE_WIDTH - 2 * MARGIN
const RIGHT = SHARE_WIDTH - MARGIN

/** "statsboxd-2025.png", or "statsboxd-all-time.png" */
export function shareFileName(year: number | null): string {
  return `statsboxd-${year ?? 'all-time'}.png`
}

/** The image's title: "My 2025 in film", or "My all-time stats". */
export function shareTitle(year: number | null): string {
  return year === null ? 'My all-time stats' : `My ${year} in film`
}

/**
 * The image in words, for the preview's alt text: what a screen reader says
 * instead of showing the picture. The same facts as the drawing; the ones it
 * shows as "—" are left out.
 */
export function shareImageAlt(summary: ShareSummary): string {
  const watched = summary.filmsWatched
  const numbers = [
    `${watched.toLocaleString('en-US')} ${watched === 1 ? 'film' : 'films'} watched`,
    `${summary.filmsRated.toLocaleString('en-US')} rated`,
  ]
  if (summary.averageRating !== null) {
    numbers.push(`average rating ${summary.averageRating.toFixed(2)} stars`)
  }
  if (summary.hours > 0) {
    numbers.push(`${summary.hours.toLocaleString('en-US')} hours of watch time`)
  }
  const picks = sharePicks(summary).flatMap(({ label, group }) =>
    group === null || group.average === null
      ? []
      : [`${label}: ${group.label}, ${group.average.toFixed(2)} stars.`],
  )
  return [`${shareTitle(summary.year)}: ${numbers.join(', ')}.`, ...picks].join(' ')
}

/**
 * `text` if it fits in `maxWidth`, otherwise its longest start that fits
 * with "…" after it. `measure` gives a string's width; on a canvas that is
 * ctx.measureText, in the tests a fake.
 */
export function truncateToWidth(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
): string {
  if (measure(text) <= maxWidth) {
    return text
  }
  // Array.from splits by character, so a cut never lands inside an emoji.
  const chars = Array.from(text)
  const cut = (count: number) => chars.slice(0, count).join('').trimEnd() + '…'
  // Binary search for the longest start that fits: `low` always fits (an
  // empty start does, as far as we can do anything about it).
  let low = 0
  let high = chars.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (measure(cut(middle)) <= maxWidth) {
      low = middle
    } else {
      high = middle - 1
    }
  }
  return cut(low)
}

/**
 * The font size (from `maxSize` down to `minSize`) at which text measured
 * `width` pixels wide at `maxSize` fits in `maxWidth`. Text width grows in
 * step with the font size, so one measurement is enough.
 */
export function fitFontSize(
  width: number,
  maxWidth: number,
  maxSize: number,
  minSize: number,
): number {
  if (width <= maxWidth) {
    return maxSize
  }
  return Math.max(minSize, Math.floor((maxSize * maxWidth) / width))
}

/** The CSS tokens the drawing uses, read from the page. */
type Theme = {
  background: string
  surface: string
  border: string
  text: string
  muted: string
  accent: string
  onAccent: string
  star: string
  display: string // font stacks
  body: string
  mono: string
}

function readTheme(): Theme {
  const style = getComputedStyle(document.documentElement)
  const token = (name: string) => style.getPropertyValue(name).trim()
  return {
    background: token('--color-bg'),
    surface: token('--color-surface'),
    border: token('--color-border'),
    text: token('--color-text'),
    muted: token('--color-text-muted'),
    accent: token('--color-accent'),
    onAccent: token('--color-on-accent'),
    star: token('--color-star'),
    display: token('--font-display'),
    body: token('--font-body'),
    mono: token('--font-mono'),
  }
}

type Font = {
  family: 'display' | 'body' | 'mono'
  weight: number
  size: number // px
  tracking?: number // letter-spacing in em, like the CSS
}

// The text styles of the image; sizes are for the 1080px-wide canvas.
const WORDMARK: Font = { family: 'display', weight: 600, size: 46, tracking: -0.02 }
const KICKER: Font = { family: 'mono', weight: 500, size: 22, tracking: 0.12 }
const TITLE: Font = { family: 'display', weight: 500, size: 112, tracking: -0.02 }
const TILE_LABEL: Font = { family: 'body', weight: 600, size: 30 }
const TILE_VALUE: Font = { family: 'display', weight: 400, size: 96, tracking: -0.02 }
const TILE_UNIT: Font = { family: 'display', weight: 400, size: 38 }
const PICK_NAME: Font = { family: 'display', weight: 500, size: 46, tracking: -0.01 }
const PICK_AVERAGE: Font = { family: 'display', weight: 400, size: 46, tracking: -0.01 }
const FOOTER: Font = { family: 'mono', weight: 500, size: 22, tracking: 0.04 }

/** Draws a summary and returns it as a PNG. */
export async function renderShareImage(
  summary: ShareSummary,
  siteUrl: string, // shown in the footer, e.g. "veljkodjur1c.github.io/statsboxd"
): Promise<Blob> {
  const theme = readTheme()
  const canvas = document.createElement('canvas')
  canvas.width = SHARE_WIDTH
  canvas.height = SHARE_HEIGHT
  const ctx = canvas.getContext('2d')
  if (ctx === null) {
    throw new Error('This browser can’t draw images.')
  }

  await loadFonts(theme, summary)
  drawShareImage(ctx, theme, summary, siteUrl)

  // toBlob reports back through a callback; wrapping it in a Promise lets
  // the caller simply `await` the finished PNG.
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('The image couldn’t be created.'))
      } else {
        resolve(blob)
      }
    }, 'image/png')
  })
}

/**
 * A canvas draws text with whatever font is ready at that moment: it doesn't
 * wait for a web font the way the page does. So the fonts the image uses are
 * loaded first, for the characters it will actually draw (Google Fonts split
 * a font into files by alphabet). Offline, the fallback fonts are used.
 */
async function loadFonts(theme: Theme, summary: ShareSummary): Promise<void> {
  const text = [
    'statsboxd 0123456789,.—…',
    summary.topGenre?.label,
    summary.topActor?.label,
    summary.topDirector?.label,
  ].join(' ')
  try {
    await Promise.all([
      document.fonts.load(fontString(theme, TITLE), text),
      document.fonts.load(fontString(theme, KICKER), text),
    ])
  } catch {
    // A font failed to load; draw with the fallback.
  }
  await document.fonts.ready
}

function fontString(theme: Theme, font: Font, size = font.size): string {
  return `${font.weight} ${size}px ${theme[font.family]}`
}

function setFont(ctx: CanvasRenderingContext2D, theme: Theme, font: Font, size = font.size) {
  ctx.font = fontString(theme, font, size)
  ctx.letterSpacing = `${(font.tracking ?? 0) * size}px`
}

const textWidth = (ctx: CanvasRenderingContext2D, text: string) => ctx.measureText(text).width

function drawShareImage(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  summary: ShareSummary,
  siteUrl: string,
) {
  ctx.fillStyle = theme.background
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT)

  // Header: the logo, then a hairline like the app's top bar.
  drawLogo(ctx, MARGIN, 66, 56, theme.accent)
  setFont(ctx, theme, WORDMARK)
  ctx.fillStyle = theme.text
  ctx.textBaseline = 'middle'
  ctx.fillText('statsboxd', MARGIN + 56 + 18, 96)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = theme.border
  ctx.fillRect(MARGIN, 158, CONTENT_WIDTH, 2)

  // Title.
  setFont(ctx, theme, KICKER)
  ctx.fillStyle = theme.muted
  ctx.fillText('NOW SHOWING', MARGIN, 216)
  const title = shareTitle(summary.year)
  setFont(ctx, theme, TITLE)
  setFont(ctx, theme, TITLE, fitFontSize(textWidth(ctx, title), CONTENT_WIDTH, TITLE.size, 72))
  ctx.fillStyle = theme.text
  ctx.fillText(title, MARGIN, 324)

  // The four headline numbers, two by two.
  const average = summary.averageRating
  const tiles: TileContent[] = [
    { label: 'Films watched', icon: EYE, value: summary.filmsWatched.toLocaleString('en-US') },
    { label: 'Films rated', icon: STAR_OUTLINE, value: summary.filmsRated.toLocaleString('en-US') },
    {
      label: 'Average rating',
      icon: GAUGE,
      value: average === null ? '—' : average.toFixed(2),
      star: average !== null,
    },
    {
      label: 'Watch time',
      icon: CLOCK,
      value: summary.hours === 0 ? '—' : summary.hours.toLocaleString('en-US'),
      unit: summary.hours === 0 ? undefined : 'hours',
    },
  ]
  tiles.forEach((tile, i) => {
    const column = i % 2
    const row = Math.floor(i / 2)
    drawTile(
      ctx,
      theme,
      tile,
      MARGIN + column * (TILE.width + TILE.gap),
      TILE.top + row * (TILE.height + TILE.gap),
    )
  })

  drawPicks(ctx, theme, sharePicks(summary))

  // Footer: where it was made, and where the film data comes from.
  setFont(ctx, theme, FOOTER)
  ctx.fillStyle = theme.muted
  ctx.fillText(siteUrl, MARGIN, 1290)
  ctx.textAlign = 'right'
  ctx.fillText('Film data from TMDB', RIGHT, 1290)
  ctx.textAlign = 'left'
}

/** The lens-and-beam mark, `size` pixels square, with its top-left at x, y. */
function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 32, size / 32)
  ctx.fillStyle = color
  ctx.fill(new Path2D(LOGO_LENS), 'evenodd')
  ctx.fill(new Path2D(LOGO_BEAM), 'evenodd')
  ctx.restore()
}

/** An amber rating star, `size` pixels square, with its top-left at x, y. */
function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const star = new Path2D(STAR)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 24, size / 24)
  ctx.fillStyle = color
  ctx.strokeStyle = color
  // A thin stroke in the same colour softens the points, as in Stars.tsx.
  ctx.lineWidth = 1.6
  ctx.lineJoin = 'round'
  ctx.fill(star)
  ctx.stroke(star)
  ctx.restore()
}

// The tile icons: the same shapes as in Icon.tsx, written as path data
// (circles as two arcs) so Path2D can draw them. On a 24px grid.
const EYE = [
  'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z',
  'M15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z',
]
const STAR_OUTLINE = [
  'M12 3.6 14.47 9.5 20.84 10.03 15.99 14.2 17.47 20.42 12 17.1 6.53 20.42 8.01 14.2 3.16 10.03 9.53 9.5Z',
]
const GAUGE = [
  'M3.5 16a8.5 8.5 0 0 1 17 0',
  'M12 16 16 10.5',
  'M6.5 12 7.6 12.7M12 7.5v1.4M17.5 12l-1.1.7',
]
const CLOCK = ['M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0Z', 'M12 7.5V12l3 2']

/** A stroke icon, `size` pixels square, centred on cx, cy. */
function drawIcon(
  ctx: CanvasRenderingContext2D,
  paths: string[],
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(size / 24, size / 24)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.75
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const path of paths) {
    ctx.stroke(new Path2D(path))
  }
  ctx.restore()
}

type TileContent = {
  label: string
  icon: string[]
  value: string
  unit?: string // a small word after the number, e.g. "hours"
  star?: boolean // an amber star after the number (a rating)
}

const TILE = {
  top: 372,
  width: (CONTENT_WIDTH - 36) / 2,
  height: 240,
  gap: 36,
  head: 92, // the aqua stub
  notch: 14, // the half circles cut out where the stub tears off
  radius: 20,
  padding: 28,
}

/** A ticket stub with one headline number, like the tiles on the results page. */
function drawTile(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  tile: TileContent,
  x: number,
  y: number,
) {
  const { width, height, head, notch, padding } = TILE

  // The ticket: an aqua stub on a dark body, clipped to rounded corners.
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, TILE.radius)
  ctx.clip()
  ctx.fillStyle = theme.surface
  ctx.fillRect(x, y, width, height)
  ctx.fillStyle = theme.accent
  ctx.fillRect(x, y, width, head)
  ctx.restore()

  // The notches and the perforation are "cut out" by painting them in the
  // page colour (the background is one flat colour, so that's the same).
  ctx.fillStyle = theme.background
  for (const cx of [x, x + width]) {
    ctx.beginPath()
    ctx.arc(cx, y + head, notch, 0, 2 * Math.PI)
    ctx.fill()
  }
  for (let dash = x + notch + 12; dash + 8 <= x + width - notch - 12; dash += 15) {
    ctx.fillRect(dash, y + head - 1.5, 8, 3)
  }

  // On the stub: the label, and the icon in a dark disc.
  setFont(ctx, theme, TILE_LABEL)
  ctx.fillStyle = theme.onAccent
  ctx.textBaseline = 'middle'
  ctx.fillText(tile.label, x + padding, y + head / 2)
  ctx.textBaseline = 'alphabetic'
  const disc = 30
  const discX = x + width - 16 - disc
  ctx.beginPath()
  ctx.arc(discX, y + head / 2, disc, 0, 2 * Math.PI)
  ctx.fill()
  drawIcon(ctx, tile.icon, discX, y + head / 2, 30, theme.accent)

  // The number, with its unit or star after it. A very long number shrinks
  // to fit (everything after it shrinks with it).
  const baseline = y + head + 108
  const room = width - 2 * padding
  setFont(ctx, theme, TILE_VALUE)
  const valueWidth = textWidth(ctx, tile.value)
  setFont(ctx, theme, TILE_UNIT)
  const unitWidth = tile.unit ? 12 + textWidth(ctx, tile.unit) : 0
  const starWidth = tile.star ? 10 + 40 : 0
  const scale = Math.min(1, room / (valueWidth + unitWidth + starWidth))

  setFont(ctx, theme, TILE_VALUE, TILE_VALUE.size * scale)
  ctx.fillStyle = theme.text
  ctx.fillText(tile.value, x + padding, baseline)
  const after = x + padding + valueWidth * scale
  if (tile.unit) {
    setFont(ctx, theme, TILE_UNIT, TILE_UNIT.size * scale)
    ctx.fillStyle = theme.muted
    ctx.fillText(tile.unit, after + 12 * scale, baseline)
  }
  if (tile.star) {
    const size = 40 * scale
    drawStar(ctx, after + 10 * scale, baseline - size * 0.9, size, theme.star)
  }
}

type Pick = {
  label: string // "Top genre"
  group: GroupStat | null // null when nothing qualifies
}

function sharePicks(summary: ShareSummary): Pick[] {
  return [
    { label: 'Top genre', group: summary.topGenre },
    { label: 'Top actor', group: summary.topActor },
    { label: 'Top director', group: summary.topDirector },
  ]
}

const PICKS = {
  top: 908,
  rowHeight: 100,
  padding: 32, // inside the card, left and right
}

/** The card with your top genre, actor and director, one per row. */
function drawPicks(ctx: CanvasRenderingContext2D, theme: Theme, picks: Pick[]) {
  const { top, rowHeight, padding } = PICKS
  const height = picks.length * rowHeight + 24
  const left = MARGIN + padding
  const right = RIGHT - padding

  ctx.beginPath()
  ctx.roundRect(MARGIN + 1, top + 1, CONTENT_WIDTH - 2, height - 2, TILE.radius)
  ctx.fillStyle = theme.surface
  ctx.fill()
  ctx.strokeStyle = theme.border
  ctx.lineWidth = 2
  ctx.stroke()

  picks.forEach((pick, i) => {
    const rowTop = top + 12 + i * rowHeight
    if (i > 0) {
      ctx.fillStyle = theme.border
      ctx.fillRect(left, rowTop, right - left, 2)
    }

    // Edge print: what the row is, and how many rated films back it up.
    setFont(ctx, theme, KICKER)
    ctx.fillStyle = theme.muted
    ctx.fillText(pick.label.toUpperCase(), left, rowTop + 36)
    if (pick.group !== null) {
      const rated = pick.group.rated
      ctx.textAlign = 'right'
      ctx.fillText(`${rated} ${rated === 1 ? 'FILM' : 'FILMS'} RATED`, right, rowTop + 36)
      ctx.textAlign = 'left'
    }

    const baseline = rowTop + 84
    if (pick.group === null || pick.group.average === null) {
      setFont(ctx, theme, PICK_NAME)
      ctx.fillStyle = theme.muted
      ctx.fillText('—', left, baseline)
      return
    }

    // The average on the right (number + amber star), the name in the room
    // left over: smaller if it's long, cut with "…" if it's very long.
    const starSize = 34
    setFont(ctx, theme, PICK_AVERAGE)
    const average = pick.group.average.toFixed(2)
    const averageWidth = textWidth(ctx, average)
    const starX = right - starSize
    ctx.fillStyle = theme.text
    ctx.fillText(average, starX - 8 - averageWidth, baseline)
    drawStar(ctx, starX, baseline - starSize * 0.9, starSize, theme.star)

    const room = starX - 8 - averageWidth - 40 - left
    setFont(ctx, theme, PICK_NAME)
    const size = fitFontSize(textWidth(ctx, pick.group.label), room, PICK_NAME.size, 34)
    setFont(ctx, theme, PICK_NAME, size)
    ctx.fillStyle = theme.text
    ctx.fillText(
      truncateToWidth(pick.group.label, room, (text) => textWidth(ctx, text)),
      left,
      baseline,
    )
  })
}
