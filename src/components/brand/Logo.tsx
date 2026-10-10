/**
 * The Statsboxd lockup: the mark (a projector lens throwing a beam of light,
 * with three rising bars cut out of the beam) followed by the wordmark.
 * The mark is one colour (currentColor, set in CSS); the cut-outs are real
 * holes thanks to fill-rule="evenodd", so the background shows through.
 * public/favicon.svg uses the same two paths.
 */
function Logo() {
  return (
    <h1 className="brand">
      <svg className="brand-mark" viewBox="0 0 32 32" fill="currentColor" fillRule="evenodd" aria-hidden="true">
        {/* The lens tube, with its glass cut out. */}
        <path d="M4 12H7A3 3 0 0 1 10 15V25A3 3 0 0 1 7 28H4A3 3 0 0 1 1 25V15A3 3 0 0 1 4 12ZM5.5 15A2 2 0 0 1 7.5 17V23A2 2 0 0 1 3.5 23V17A2 2 0 0 1 5.5 15Z" />
        {/* The beam, with three rising bars cut out of it. */}
        <path d="M11 14 31 4V28L11 26ZM16.4 20H18.2A.9.9 0 0 1 19.1 20.9V23.7A.9.9 0 0 1 18.2 24.6H16.4A.9.9 0 0 1 15.5 23.7V20.9A.9.9 0 0 1 16.4 20ZM21.7 15.5H23.5A.9.9 0 0 1 24.4 16.4V24.7A.9.9 0 0 1 23.5 25.6H21.7A.9.9 0 0 1 20.8 24.7V16.4A.9.9 0 0 1 21.7 15.5ZM27 10.5H28.8A.9.9 0 0 1 29.7 11.4V25.7A.9.9 0 0 1 28.8 26.6H27A.9.9 0 0 1 26.1 25.7V11.4A.9.9 0 0 1 27 10.5Z" />
      </svg>
      statsboxd
    </h1>
  )
}

export default Logo
