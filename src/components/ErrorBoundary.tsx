import { Component, type ErrorInfo, type ReactNode } from 'react'
import Logo from './brand/Logo.tsx'
import Mascot from './brand/Mascot.tsx'
import Icon from './Icon.tsx'
import './ErrorBoundary.css'

type CrashScreenProps = {
  error: Error
}

/**
 * What replaces the app after an unexpected error. It uses the same page
 * shell as the app (top bar, card with the sad mascot), so it doesn't look
 * like the site broke into a blank page.
 */
export function CrashScreen({ error }: CrashScreenProps) {
  return (
    <div className="app">
      <header className="topbar">
        <Logo />
      </header>
      <main>
        <section className="card state-card" role="alert">
          <Mascot mood="sad" />
          <div>
            <p className="kicker">Film jammed</p>
            <h2 className="card-title">Something went wrong</h2>
            <p className="card-description">
              Statsboxd ran into an unexpected problem. Reloading the page
              usually fixes it. Anything you uploaded before is still kept in
              this browser only, so you can pick it up again with “Continue
              with last export”.
            </p>
            <button
              type="button"
              className="button"
              onClick={() => window.location.reload()}
            >
              <Icon name="rewind" />
              Reload the page
            </button>
            <details className="crash-details">
              <summary>Technical details</summary>
              <p>{error.message || error.name}</p>
            </details>
          </div>
        </section>
      </main>
    </div>
  )
}

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
}

/**
 * Catches errors thrown while React renders anything below it, and shows a
 * CrashScreen instead of leaving a blank page. React has no hook for this:
 * an error boundary has to be a class component, with these two methods.
 * It does not catch errors in event handlers or async code (those are
 * handled where they happen, e.g. in App.handleFile).
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  // Runs while rendering, to turn the error into new state.
  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  // Runs afterwards, for side effects such as logging.
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Statsboxd crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error !== null) {
      return <CrashScreen error={this.state.error} />
    }
    return this.props.children
  }
}

export default ErrorBoundary
