type EnrichProgressProps = {
  done: number
  total: number
}

function EnrichProgress({ done, total }: EnrichProgressProps) {
  return (
    <section className="card">
      <h2>Fetching film details</h2>
      <p>
        Looking up genres, cast and directors on TMDB. Results are saved in your
        browser, so next time this is instant.
      </p>
      <progress
        max={Math.max(total, 1)}
        value={done}
        aria-label="Fetching film details from TMDB"
      />
      <p className="progress-label">
        {done} / {total}
      </p>
    </section>
  )
}

export default EnrichProgress
