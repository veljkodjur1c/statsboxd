import { lazy, Suspense, useState } from 'react'
import tmdbLogo from './assets/tmdb-logo.svg'
import Logo from './components/brand/Logo.tsx'
import EnrichProgress from './components/EnrichProgress.tsx'
import Icon from './components/Icon.tsx'
import KeySettingsDialog from './components/KeySettingsDialog.tsx'
import TmdbKeyCard from './components/TmdbKeyCard.tsx'
import UploadCard from './components/UploadCard.tsx'
import { enrichFilms, type EnrichResult } from './lib/enrich.ts'
import {
  parseLetterboxdExport,
  type LetterboxdExport,
} from './lib/letterboxd.ts'
import { getTmdbToken, TmdbAuthError } from './lib/tmdb.ts'

// The results view (with the charts) is a separate file the browser only
// downloads when needed. handleFile starts that download early, while the
// export is still being processed, so it's usually ready in time.
const loadResults = () => import('./components/Results.tsx')
const Results = lazy(loadResults)

// Each state carries only the data that makes sense for it.
type AppState =
  | { kind: 'idle' }
  | { kind: 'parsing' }
  | { kind: 'error'; message: string }
  | { kind: 'needs-key'; data: LetterboxdExport; message: string | null }
  | { kind: 'enriching'; data: LetterboxdExport; done: number; total: number }
  | { kind: 'done'; data: LetterboxdExport; tmdb: EnrichResult }

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function App() {
  const [state, setState] = useState<AppState>({ kind: 'idle' })
  const [settingsOpen, setSettingsOpen] = useState(false)

  async function handleFile(file: File) {
    setState({ kind: 'parsing' })
    void loadResults()
    try {
      const data = await parseLetterboxdExport(file)
      await startEnrich(data)
    } catch (error) {
      setState({
        kind: 'error',
        message: errorMessage(error, 'Something went wrong while reading the file.'),
      })
    }
  }

  async function startEnrich(data: LetterboxdExport) {
    const token = getTmdbToken()
    if (token === null) {
      setState({ kind: 'needs-key', data, message: null })
      return
    }

    // Rated films are normally also in watched.csv; enrichFilms removes duplicates.
    const films = [...data.watched, ...data.ratings]
    const total = new Set(films.map((film) => film.letterboxdUri)).size
    setState({ kind: 'enriching', data, done: 0, total })

    try {
      const tmdb = await enrichFilms(films, token, (done, total) =>
        setState({ kind: 'enriching', data, done, total }),
      )
      setState({ kind: 'done', data, tmdb })
    } catch (error) {
      if (error instanceof TmdbAuthError) {
        setState({
          kind: 'needs-key',
          data,
          message: 'TMDB rejected this key. Check it and try again.',
        })
      } else {
        setState({
          kind: 'error',
          message: errorMessage(error, 'Could not fetch film details from TMDB.'),
        })
      }
    }
  }

  // Called when the user saves or removes their own TMDB key.
  function handleKeyChange() {
    if (state.kind === 'needs-key') {
      void startEnrich(state.data)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <Logo />
        <div className="topbar-actions">
          {/* The TMDB key card already shows the form, so no button then. */}
          {state.kind !== 'needs-key' && (
            <button
              type="button"
              className="icon-button"
              aria-label="TMDB key settings"
              title="TMDB key settings"
              onClick={() => setSettingsOpen(true)}
            >
              <Icon name="key" />
            </button>
          )}
          {state.kind === 'done' && (
            <button
              type="button"
              className="button button--secondary topbar-reset"
              onClick={() => setState({ kind: 'idle' })}
            >
              <Icon name="rewind" />
              <span className="button-label">Upload another export</span>
            </button>
          )}
        </div>
      </header>

      <main>
        {state.kind === 'done' ? (
          // Shown for the moment the results file is still downloading.
          <Suspense fallback={<p className="loading-note">Preparing your stats…</p>}>
            <Results
              data={state.data}
              tmdb={state.tmdb}
              onRetry={() => void startEnrich(state.data)}
              onReset={() => setState({ kind: 'idle' })}
            />
          </Suspense>
        ) : state.kind === 'enriching' ? (
          <EnrichProgress done={state.done} total={state.total} />
        ) : state.kind === 'needs-key' ? (
          <TmdbKeyCard message={state.message} onKeyChange={handleKeyChange} />
        ) : (
          <UploadCard
            onFileSelected={handleFile}
            isLoading={state.kind === 'parsing'}
            error={state.kind === 'error' ? state.message : null}
          />
        )}
      </main>

      <footer className="site-footer">
        <p>Not affiliated with Letterboxd.</p>
        <div className="site-footer-tmdb">
          <a
            className="tmdb-logo"
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noreferrer"
          >
            <img src={tmdbLogo} alt="The Movie Database (TMDB)" width="92" height="12" />
          </a>
          <p>
            This product uses the TMDB API but is not endorsed or certified by
            TMDB.
          </p>
        </div>
      </footer>

      {settingsOpen && (
        <KeySettingsDialog
          onKeyChange={handleKeyChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}

export default App
