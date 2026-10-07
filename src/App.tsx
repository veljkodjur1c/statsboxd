import { useState } from 'react'
import EnrichProgress from './components/EnrichProgress.tsx'
import ExportSummary from './components/ExportSummary.tsx'
import TmdbKeyCard from './components/TmdbKeyCard.tsx'
import TmdbKeyForm from './components/TmdbKeyForm.tsx'
import UploadCard from './components/UploadCard.tsx'
import { enrichFilms, type EnrichResult } from './lib/enrich.ts'
import {
  parseLetterboxdExport,
  type LetterboxdExport,
} from './lib/letterboxd.ts'
import { getTmdbToken, TmdbAuthError } from './lib/tmdb.ts'

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

  async function handleFile(file: File) {
    setState({ kind: 'parsing' })
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
      <header className="site-header">
        <h1 className="site-title">
          Stats<span className="accent">boxd</span>
        </h1>
        <p className="tagline">Your Letterboxd history, in numbers.</p>
      </header>

      <main>
        {state.kind === 'done' ? (
          <ExportSummary
            data={state.data}
            tmdb={state.tmdb}
            onRetry={() => void startEnrich(state.data)}
            onReset={() => setState({ kind: 'idle' })}
          />
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
        <p>
          This product uses the TMDB API but is not endorsed or certified by{' '}
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
            TMDB
          </a>
          .
        </p>
        {state.kind !== 'needs-key' && (
          <details className="key-settings">
            <summary>TMDB key settings</summary>
            <TmdbKeyForm onChange={handleKeyChange} />
          </details>
        )}
      </footer>
    </div>
  )
}

export default App
