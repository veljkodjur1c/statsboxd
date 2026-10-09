import { useEffect, useId, useRef, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { formatStars } from '../lib/format.ts'
import type { GroupFilm, GroupStat } from '../lib/stats.ts'

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

/** A modal window listing every film in one group (an actor, a genre…). */
function FilmListDialog({ group, kind, onClose }: FilmListDialogProps) {
  // useRef gives us the real <dialog> DOM element, which React itself
  // doesn't control: we need it to call the browser's showModal().
  const dialogRef = useRef<HTMLDialogElement>(null)
  // A unique id that links the dialog to its heading for screen readers.
  const titleId = useId()

  // Effects run after React has put the element on the page. The parent only
  // renders this component while a group is selected, so opening on mount is
  // enough. The `open` check matters in development, where StrictMode runs
  // effects twice.
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
    }
  }, [])

  // Clicks on the dimmed backdrop land on the <dialog> element itself;
  // clicks on the content land on its children.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      event.currentTarget.close()
    }
  }

  const films = [...group.filmList].sort(byRatingThenYear)

  // A portal renders the dialog straight into <body> instead of inside the
  // table card, so the card's styles (centered text, paragraph widths) don't
  // leak into it. React still treats it as a child of this component.
  return createPortal(
    // The browser fires "close" for Esc, the × button and backdrop clicks,
    // so every way of closing ends up in onClose.
    <dialog
      ref={dialogRef}
      className="film-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleClick}
    >
      <div className="film-dialog-content">
        <header className="film-dialog-header">
          <div>
            <p className="film-dialog-kind">{kind}</p>
            <h2 id={titleId}>{group.label}</h2>
            <p className="film-dialog-meta">
              {group.films} {group.films === 1 ? 'film' : 'films'} · {group.rated} rated
              {group.average !== null && ` · avg ${group.average.toFixed(2)}`}
            </p>
          </div>
          <button
            type="button"
            className="dialog-close"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
          >
            ×
          </button>
        </header>

        <ol className="film-list film-dialog-list">
          {films.map((film) => (
            <li key={film.letterboxdUri}>
              <span>
                <a href={film.letterboxdUri} target="_blank" rel="noreferrer">
                  {film.name}
                </a>
                {film.year !== null && <span className="film-year"> {film.year}</span>}
              </span>
              {film.rating === null ? (
                <span className="film-unrated">not rated</span>
              ) : (
                <span
                  className="film-rating"
                  aria-label={`${film.rating} out of 5 stars`}
                >
                  {formatStars(film.rating)}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </dialog>,
    document.body,
  )
}

export default FilmListDialog
