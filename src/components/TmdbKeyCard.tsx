import Mascot from './brand/Mascot.tsx'
import Icon from './Icon.tsx'
import TmdbKeyForm from './TmdbKeyForm.tsx'

type TmdbKeyCardProps = {
  message: string | null
  onKeyChange: () => void
}

function TmdbKeyCard({ message, onKeyChange }: TmdbKeyCardProps) {
  return (
    <section className="card state-card">
      <Mascot mood="sad" />
      <div>
        <p className="kicker">One more thing</p>
        <h2 className="card-title">Add a TMDB API key</h2>
        <p className="card-description">
          Genres, cast and directors come from TMDB, which needs a free API key.
          Create one at{' '}
          <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">
            themoviedb.org/settings/api
          </a>{' '}
          and paste the “API Read Access Token” below. It is stored only in your
          browser.
        </p>
        {message && (
          <p className="error-message" role="alert">
            <Icon name="alert" />
            <span>{message}</span>
          </p>
        )}
        <TmdbKeyForm onChange={onKeyChange} />
      </div>
    </section>
  )
}

export default TmdbKeyCard
