function App() {
  return (
    <div className="app">
      <header className="site-header">
        <h1 className="site-title">
          Stats<span className="accent">boxd</span>
        </h1>
        <p className="tagline">Your Letterboxd history, in numbers.</p>
      </header>

      <main>
        <section className="card">
          <h2>Upload your Letterboxd export</h2>
          <p>
            Export your data from your Letterboxd settings, then upload the ZIP
            file here. Everything is processed in your browser.
          </p>
          {/* File upload arrives in phase 2. */}
          <button type="button" className="button" disabled>
            Choose ZIP file
          </button>
        </section>
      </main>

      <footer className="site-footer">
        <p>Not affiliated with Letterboxd.</p>
      </footer>
    </div>
  )
}

export default App
