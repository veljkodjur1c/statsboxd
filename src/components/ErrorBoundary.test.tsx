import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ErrorBoundary, { CrashScreen } from './ErrorBoundary.tsx'

describe('CrashScreen', () => {
  it('says what happened and offers a reload', () => {
    const html = renderToStaticMarkup(<CrashScreen error={new Error('boom')} />)
    expect(html).toContain('Something went wrong')
    expect(html).toContain('Reload the page')
    expect(html).toContain('boom')
  })

  it('shows the error text as text, never as markup', () => {
    const html = renderToStaticMarkup(
      <CrashScreen error={new Error('<img src=x onerror=alert(1)>')} />,
    )
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('copes with an error without a message', () => {
    const html = renderToStaticMarkup(<CrashScreen error={new Error('')} />)
    expect(html).toContain('Error')
  })
})

describe('ErrorBoundary', () => {
  it('shows its children when nothing went wrong', () => {
    const html = renderToStaticMarkup(
      <ErrorBoundary>
        <p>all fine</p>
      </ErrorBoundary>,
    )
    expect(html).toBe('<p>all fine</p>')
  })

  it('turns any thrown value into an Error in its state', () => {
    expect(ErrorBoundary.getDerivedStateFromError(new Error('x')).error?.message).toBe('x')
    expect(ErrorBoundary.getDerivedStateFromError('plain text').error?.message).toBe(
      'plain text',
    )
    expect(ErrorBoundary.getDerivedStateFromError(null).error).toBeInstanceOf(Error)
  })
})
