import { useState } from 'react'
import ExportSummary from './components/ExportSummary.tsx'
import UploadCard from './components/UploadCard.tsx'
import {
  parseLetterboxdExport,
  type LetterboxdExport,
} from './lib/letterboxd.ts'

// Each state carries only the data that makes sense for it.
type UploadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; data: LetterboxdExport }

function App() {
  const [state, setState] = useState<UploadState>({ kind: 'idle' })

  async function handleFile(file: File) {
    setState({ kind: 'loading' })
    try {
      const data = await parseLetterboxdExport(file)
      setState({ kind: 'done', data })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong while reading the file.'
      setState({ kind: 'error', message })
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
            onReset={() => setState({ kind: 'idle' })}
          />
        ) : (
          <UploadCard
            onFileSelected={handleFile}
            isLoading={state.kind === 'loading'}
            error={state.kind === 'error' ? state.message : null}
          />
        )}
      </main>

      <footer className="site-footer">
        <p>Not affiliated with Letterboxd.</p>
      </footer>
    </div>
  )
}

export default App
