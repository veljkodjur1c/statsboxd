// SVG path data that is drawn in two places: by the React components (as
// <path d="…">) and on the share image's canvas (as new Path2D(d)). Keeping
// it here means the logo and the stars are defined once.

/** The logo's lens tube, with its glass cut out. On a 32px grid; fill with fill-rule evenodd. */
export const LOGO_LENS =
  'M4 12H7A3 3 0 0 1 10 15V25A3 3 0 0 1 7 28H4A3 3 0 0 1 1 25V15A3 3 0 0 1 4 12ZM5.5 15A2 2 0 0 1 7.5 17V23A2 2 0 0 1 3.5 23V17A2 2 0 0 1 5.5 15Z'

/** The logo's beam, with three rising bars cut out of it. Same grid and fill rule. */
export const LOGO_BEAM =
  'M11 14 31 4V28L11 26ZM16.4 20H18.2A.9.9 0 0 1 19.1 20.9V23.7A.9.9 0 0 1 18.2 24.6H16.4A.9.9 0 0 1 15.5 23.7V20.9A.9.9 0 0 1 16.4 20ZM21.7 15.5H23.5A.9.9 0 0 1 24.4 16.4V24.7A.9.9 0 0 1 23.5 25.6H21.7A.9.9 0 0 1 20.8 24.7V16.4A.9.9 0 0 1 21.7 15.5ZM27 10.5H28.8A.9.9 0 0 1 29.7 11.4V25.7A.9.9 0 0 1 28.8 26.6H27A.9.9 0 0 1 26.1 25.7V11.4A.9.9 0 0 1 27 10.5Z'

/** A five-point rating star on a 24px grid (same geometry as the design system's Stars). */
export const STAR =
  'M12 2.9 14.7 9.18 21.51 9.81 16.37 14.32 17.88 20.99 12 17.5 6.12 20.99 7.63 14.32 2.49 9.81 9.3 9.18Z'

/** The left half of STAR, for ½ ratings. */
export const HALF_STAR = 'M12 17.5 6.12 20.99 7.63 14.32 2.49 9.81 9.3 9.18 12 2.9Z'
