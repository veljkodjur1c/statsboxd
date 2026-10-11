import { useState } from 'react'
import type { EnrichResult } from '../lib/enrich.ts'
import type { LetterboxdExport } from '../lib/letterboxd.ts'
import { shareSummary, type ShareSummary } from '../lib/stats.ts'
import Icon from './Icon.tsx'
import SharePreviewDialog from './SharePreviewDialog.tsx'
import './ShareButton.css'

type ShareButtonProps = {
  data: LetterboxdExport // the whole export, or one year of it
  tmdb: EnrichResult
  year: number | null // null = all time
}

/**
 * "Save image": opens a preview of the summary image for the stats on
 * screen (the same year), with a button there to download it.
 */
function ShareButton({ data, tmdb, year }: ShareButtonProps) {
  // The summary the open preview shows; null while it is closed. Taken once,
  // when the button is clicked, so the preview can't change under the user.
  const [summary, setSummary] = useState<ShareSummary | null>(null)

  return (
    // A fragment (<>…</>) groups the button and the dialog without adding
    // an element of its own to the page.
    <>
      <button
        type="button"
        className="button button--secondary share-button"
        aria-haspopup="dialog"
        onClick={() => setSummary(shareSummary(data, tmdb, year))}
      >
        <Icon name="download" />
        Save image
      </button>
      {summary !== null && (
        <SharePreviewDialog summary={summary} onClose={() => setSummary(null)} />
      )}
    </>
  )
}

export default ShareButton
