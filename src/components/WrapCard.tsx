import Mascot from './brand/Mascot.tsx'
import Icon from './Icon.tsx'
import './WrapCard.css'

type WrapCardProps = {
  onReset: () => void
}

/** The white closing card at the end of the results. */
function WrapCard({ onReset }: WrapCardProps) {
  return (
    <section className="wrap-card">
      <Mascot mood="happy" />
      <div>
        <p className="kicker">The end</p>
        <h3 className="wrap-card-title">That’s a wrap.</h3>
        <p className="wrap-card-text">Got a newer export? Run it through again.</p>
      </div>
      <button type="button" className="button" onClick={onReset}>
        <Icon name="rewind" />
        Upload another export
      </button>
    </section>
  )
}

export default WrapCard
