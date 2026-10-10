import { useId } from 'react'
import './Mascot.css'

/** How the app is doing: idle (waiting), busy (working), sad (a problem), happy (done). */
export type MascotMood = 'idle' | 'busy' | 'sad' | 'happy'

type MascotProps = {
  mood: MascotMood
}

/**
 * The Statsboxd mascot: a small vintage projector with two film reels, a
 * crank and a lens that throws the light. Pure illustration, so it is hidden
 * from screen readers; the heading next to it says what is going on.
 * Its colours and animations live in Mascot.css.
 */
function Mascot({ mood }: MascotProps) {
  // The lens glow uses an SVG blur filter, which is referenced by id. useId
  // gives every mascot on the page its own id, so two can never clash.
  const glowId = useId()
  const lit = mood !== 'sad'

  return (
    <svg className={`mascot mascot--${mood}`} viewBox="0 0 220 200" aria-hidden="true">
      <defs>
        <filter id={glowId} x="-1" y="-1" width="3" height="3">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Arms holding the reels, then the reels themselves. */}
      <path className="mascot-arm" d="M76 54 L88 96 M140 48 L128 96" strokeWidth={7} strokeLinecap="round" />
      <Reel cx={76} cy={54} r={30} className="reel reel--front" />
      <Reel cx={140} cy={48} r={28} className="reel reel--rear" />

      {/* Sad: the film has come off the front reel ("film jammed"). */}
      {mood === 'sad' && (
        <>
          <path className="mascot-film" d="M60 78 C40 98 18 112 26 140 S52 176 30 190" strokeWidth={10} strokeLinecap="round" />
          <path className="mascot-film-holes" d="M60 78 C40 98 18 112 26 140 S52 176 30 190" strokeWidth={2.5} strokeDasharray="2.5 7" strokeLinecap="round" />
        </>
      )}

      {/* Feet. */}
      <rect className="mascot-metal" x={66} y={160} width={28} height={18} rx={9} strokeWidth={4} />
      <rect className="mascot-metal" x={124} y={160} width={28} height={18} rx={9} strokeWidth={4} />

      {/* The lens: barrel, glow, glass. */}
      <rect className="mascot-metal" x={160} y={110} width={24} height={38} rx={8} strokeWidth={4} />
      {lit && <ellipse className="mascot-glow" cx={190} cy={129} rx={11} ry={20} filter={`url(#${glowId})`} />}
      <ellipse className={lit ? 'mascot-glass' : 'mascot-glass is-dim'} cx={186} cy={129} rx={6.5} ry={15} strokeWidth={3.5} />

      {/* Crank on the left. */}
      <path className="mascot-arm" d="M50 128 L32 144" strokeWidth={6} strokeLinecap="round" />
      <circle className="mascot-body" cx={30} cy={146} r={6} strokeWidth={3.5} />

      {/* Body, crank hub and face. */}
      <rect className="mascot-body" x={46} y={88} width={122} height={78} rx={24} strokeWidth={4} />
      <circle className="mascot-metal" cx={50} cy={128} r={7} strokeWidth={3.5} />
      <Face mood={mood} />
    </svg>
  )
}

type ReelProps = {
  cx: number
  cy: number
  r: number
  className: string
}

/** A plain film reel: five round holes around a hub. */
function Reel({ cx, cy, r, className }: ReelProps) {
  const holes = [0, 1, 2, 3, 4].map((i) => {
    const angle = ((-90 + i * 72) * Math.PI) / 180
    return { x: cx + r * 0.56 * Math.cos(angle), y: cy + r * 0.56 * Math.sin(angle) }
  })
  return (
    <g className={className}>
      <circle className="mascot-body" cx={cx} cy={cy} r={r} strokeWidth={4} />
      {holes.map((hole) => (
        <circle key={`${hole.x},${hole.y}`} className="mascot-metal" cx={hole.x} cy={hole.y} r={r * 0.19} strokeWidth={2.5} />
      ))}
      <circle className="mascot-ink" cx={cx} cy={cy} r={r * 0.15} />
    </g>
  )
}

type EyeProps = {
  cx: number
  cy: number
  ry?: number
}

function Eye({ cx, cy, ry = 9.5 }: EyeProps) {
  return (
    <>
      <ellipse className="mascot-ink" cx={cx} cy={cy} rx={7.5} ry={ry} />
      <circle className="mascot-glint" cx={cx + 2.6} cy={cy - 3.4} r={2.6} />
    </>
  )
}

/** Eyes, brows and mouth for each mood. */
function Face({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'busy':
      // Looking up at the spinning reels, mouth a small "o".
      return (
        <>
          <g className="eyes">
            <Eye cx={97} cy={120} />
            <Eye cx={129} cy={120} />
          </g>
          <ellipse className="mascot-ink" cx={113} cy={145} rx={4.5} ry={5} />
        </>
      )
    case 'sad':
      return (
        <>
          <path className="mascot-line" d="M88 111 L101 106 M138 111 L125 106" strokeWidth={4.5} strokeLinecap="round" />
          <g className="eyes">
            <Eye cx={97} cy={126} ry={8} />
            <Eye cx={129} cy={126} ry={8} />
          </g>
          <path className="mascot-line" d="M105 150 Q113 143 121 150" strokeWidth={4.5} strokeLinecap="round" />
        </>
      )
    case 'happy':
      // Eyes closed in a smile, mouth open.
      return (
        <>
          <path className="mascot-line" d="M90 126 Q97 116 104 126 M122 126 Q129 116 136 126" strokeWidth={4.5} strokeLinecap="round" />
          <path className="mascot-ink mascot-mouth" d="M102 139 Q113 155 124 139 Z" strokeWidth={3} strokeLinejoin="round" />
        </>
      )
    case 'idle':
      return (
        <>
          <g className="eyes">
            <Eye cx={97} cy={123} />
            <Eye cx={129} cy={123} />
          </g>
          <path className="mascot-line" d="M105 143 Q113 150 121 143" strokeWidth={4.5} strokeLinecap="round" />
        </>
      )
  }
}

export default Mascot
