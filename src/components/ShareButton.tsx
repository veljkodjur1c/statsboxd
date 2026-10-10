import { useState } from 'react'
import type { EnrichResult } from '../lib/enrich.ts'
import type { LetterboxdExport } from '../lib/letterboxd.ts'
import { renderShareImage, shareFileName } from '../lib/shareImage.ts'
import { shareSummary } from '../lib/stats.ts'
import Icon from './Icon.tsx'
import './ShareButton.css'

type ShareButtonProps = {
  data: LetterboxdExport // the whole export, or one year of it
  tmdb: EnrichResult
  year: number | null // null = all time
}

/**
 * "Save image": draws a summary of the stats on screen (the same year) as a
 * PNG and downloads it, ready to post.
 */
function ShareButton({ data, tmdb, year }: ShareButtonProps) {
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  // An event handler can be async: React doesn't wait for it, but inside we
  // can `await` the drawing and then update the state.
  async function handleClick() {
    if (saving) {
      return // still drawing the previous one
    }
    setSaving(true)
    setFailed(false)
    try {
      const image = await renderShareImage(shareSummary(data, tmdb, year), siteAddress())
      download(image, shareFileName(year))
    } catch {
      setFailed(true)
    } finally {
      // `finally` runs whether it worked or not.
      setSaving(false)
    }
  }

  return (
    <div className="share-button">
      <button
        type="button"
        className="button button--secondary"
        onClick={handleClick}
        aria-busy={saving}
      >
        <Icon name="download" />
        Save image
      </button>
      {failed && (
        <p className="share-button-error" role="alert">
          Couldn’t create the image.
        </p>
      )}
    </div>
  )
}

/** Where the app lives, for the image's footer: "veljkodjur1c.github.io/statsboxd". */
function siteAddress(): string {
  return (window.location.host + import.meta.env.BASE_URL).replace(/\/$/, '')
}

/**
 * Saves a file the way a download link would: a temporary link to the data
 * with a `download` name, clicked from code.
 */
function download(file: Blob, name: string) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  // Free the memory once the browser has had time to pick the file up.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export default ShareButton
