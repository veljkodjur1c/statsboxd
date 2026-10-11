import type { ReactNode } from 'react'

// Hand-drawn stroke icons on a 24px grid (1.75 stroke, round caps and joins),
// the same set as the design system. Each entry holds only the shapes; the
// <svg> around them is added by <Icon>.
//
// `satisfies` checks that every value is something React can render, while
// TypeScript still remembers the exact keys ('upload', 'lock', …). That is
// what lets IconName below list them.
const ICONS = {
  upload: (
    <>
      <path d="M12 15V4.5" />
      <path d="M7.5 9 12 4.5 16.5 9" />
      <path d="M4 14.5v3.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
      <path d="M12 14.5v2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  star: (
    <path d="M12 3.6 14.47 9.5 20.84 10.03 15.99 14.2 17.47 20.42 12 17.1 6.53 20.42 8.01 14.2 3.16 10.03 9.53 9.5Z" />
  ),
  gauge: (
    <>
      {/* A half dial. Its shapes span y 7.5–16, centred on the grid, so it
          sits in the middle of round frames like the tile icon. */}
      <path d="M3.5 16a8.5 8.5 0 0 1 17 0" />
      <path d="M12 16 16 10.5" />
      <path d="M6.5 12 7.6 12.7M12 7.5v1.4M17.5 12l-1.1.7" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.4 2.8 2.8 5.2-5.6" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15.5" r="4" />
      <path d="m10.9 12.6 8.6-8.6" />
      <path d="m16.2 7.3 2.6 2.6" />
      <path d="m13.8 9.7 1.8 1.8" />
    </>
  ),
  download: (
    <>
      <path d="M12 4.5V14" />
      <path d="M7.5 9.5 12 14l4.5-4.5" />
      <path d="M4 14.5v3.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5" />
    </>
  ),
  rewind: (
    <>
      <path d="M11 6.5 4.5 12l6.5 5.5Z" />
      <path d="M19.5 6.5 13 12l6.5 5.5Z" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  'chevron-down': <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.5h.01" />
    </>
  ),
  chart: (
    <>
      <rect x="4" y="11" width="4" height="9" rx="1.2" />
      <rect x="10" y="4" width="4" height="16" rx="1.2" />
      <rect x="16" y="13.5" width="4" height="6.5" rx="1.2" />
    </>
  ),
  table: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  'arrow-up': (
    <>
      <path d="M12 19V5.5" />
      <path d="m6.5 11 5.5-5.5 5.5 5.5" />
    </>
  ),
  'arrow-down': (
    <>
      <path d="M12 5v13.5" />
      <path d="m6.5 13 5.5 5.5 5.5-5.5" />
    </>
  ),
} satisfies Record<string, ReactNode>

/** 'upload' | 'lock' | … — a misspelled name is a type error. */
export type IconName = keyof typeof ICONS

type IconProps = {
  name: IconName
}

/**
 * One icon from the set, drawn in the current text colour. Icons are
 * decorative: the label always comes from the text next to them, or from an
 * aria-label on an icon-only button.
 */
function Icon({ name }: IconProps) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

export default Icon
