import type { GroupFilm, GroupStat } from '../lib/stats.ts'
import Modal from './Modal.tsx'
import Stars from './Stars.tsx'

type FilmListDialogProps = {
  group: GroupStat
  kind: string // e.g. "Actor", shown above the name
  onClose: () => void
}

// Highest rated first; films you didn't rate go last. Then newest first.
function byRatingThenYear(a: GroupFilm, b: GroupFilm): number {
  return (
    (b.rating ?? -1) - (a.rating ?? -1) ||
    (b.year ?? 0) - (a.year ?? 0) ||
    a.name.localeCompare(b.name)
  )
}

/** A dialog listing every film in one group (an actor, a genre…). */
function FilmListDialog({ group, kind, onClose }: FilmListDialogProps) {
  const films = [...group.filmList].sort(byRatingThenYear)
  const filmCount = `${group.films} ${group.films === 1 ? 'film' : 'films'}`
  const average = group.average === null ? '' : ` · avg ${group.average.toFixed(2)}`

  return (
    <Modal
      kicker={kind}
      title={group.label}
      meta={`${filmCount} · ${group.rated} rated${average}`}
      onClose={onClose}
    >
      <ol className="film-list">
        {films.map((film) => (
          <li key={film.letterboxdUri}>
            <span className="film-name">
              <a href={film.letterboxdUri} target="_blank" rel="noreferrer">
                {film.name}
              </a>
              {film.year !== null && <span className="film-meta">{film.year}</span>}
            </span>
            {film.rating === null ? (
              <span className="film-unrated">Not rated</span>
            ) : (
              <Stars rating={film.rating} />
            )}
          </li>
        ))}
      </ol>
    </Modal>
  )
}

export default FilmListDialog
