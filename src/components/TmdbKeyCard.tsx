import TmdbKeyForm from './TmdbKeyForm.tsx'

type TmdbKeyCardProps = {
  message: string | null
  onKeyChange: () => void
}

function TmdbKeyCard({ message, onKeyChange }: TmdbKeyCardProps) {
  return (
    <section className="card">
      <h2>Add a TMDB API key</h2>
      <p>
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
          {message}
        </p>
      )}
      <TmdbKeyForm onChange={onKeyChange} />
    </section>
  )
}

export default TmdbKeyCard
