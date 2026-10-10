import { LOGO_BEAM, LOGO_LENS } from '../../lib/shapes.ts'

/**
 * The Statsboxd lockup: the mark (a projector lens throwing a beam of light,
 * with three rising bars cut out of the beam) followed by the wordmark.
 * The mark is one colour (currentColor, set in CSS); the cut-outs are real
 * holes thanks to fill-rule="evenodd", so the background shows through.
 * The paths live in lib/shapes.ts (the share image draws them too);
 * public/favicon.svg has a copy of them.
 */
function Logo() {
  return (
    <h1 className="brand">
      <svg className="brand-mark" viewBox="0 0 32 32" fill="currentColor" fillRule="evenodd" aria-hidden="true">
        {/* The lens tube, with its glass cut out. */}
        <path d={LOGO_LENS} />
        {/* The beam, with three rising bars cut out of it. */}
        <path d={LOGO_BEAM} />
      </svg>
      statsboxd
    </h1>
  )
}

export default Logo
