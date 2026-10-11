import { useEffect, useState } from 'react'
import {
  renderShareImage,
  SHARE_HEIGHT,
  SHARE_WIDTH,
  shareFileName,
  shareImageAlt,
} from '../lib/shareImage.ts'
import type { ShareSummary } from '../lib/stats.ts'
import Icon from './Icon.tsx'
import Modal from './Modal.tsx'
import './SharePreviewDialog.css'

type SharePreviewDialogProps = {
  summary: ShareSummary
  onClose: () => void
}

// Where the preview is. A union of object types, told apart by `status`:
// after checking `preview.status === 'ready'`, TypeScript knows that
// `preview.url` exists. The other states have no url to forget about.
type Preview =
  | { status: 'drawing' }
  | { status: 'ready'; url: string }
  | { status: 'failed' }

/**
 * Draws the summary image and shows it before it is saved, with a button
 * that downloads exactly that PNG.
 */
function SharePreviewDialog({ summary, onClose }: SharePreviewDialogProps) {
  const [preview, setPreview] = useState<Preview>({ status: 'drawing' })

  // Drawing is async, so it starts in an effect once the dialog is open.
  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    renderShareImage(summary, siteAddress()).then(
      (image) => {
        if (cancelled) {
          return
        }
        // An object URL ("blob:…") is a page-local address for data in
        // memory: the <img> and the download link both use the same PNG,
        // and it never leaves the browser.
        url = URL.createObjectURL(image)
        setPreview({ status: 'ready', url })
      },
      () => {
        if (!cancelled) {
          setPreview({ status: 'failed' })
        }
      },
    )
    // The cleanup runs when the dialog closes: a drawing that finishes after
    // that is ignored, and the PNG's memory is freed.
    return () => {
      cancelled = true
      if (url !== null) {
        URL.revokeObjectURL(url)
      }
    }
  }, [summary])

  const download = (
    <>
      <Icon name="download" />
      Download image
    </>
  )

  return (
    <Modal
      kicker="Save image"
      title="Preview"
      meta={`${SHARE_WIDTH} × ${SHARE_HEIGHT} px · PNG`}
      onClose={onClose}
    >
      <div className="share-preview">
        <div className="share-preview-frame">
          {preview.status === 'ready' && (
            <img
              src={preview.url}
              alt={shareImageAlt(summary)}
              width={SHARE_WIDTH}
              height={SHARE_HEIGHT}
            />
          )}
          {preview.status === 'drawing' && (
            <p className="share-preview-note" role="status">
              Drawing the image…
            </p>
          )}
          {preview.status === 'failed' && (
            <p className="share-preview-note share-preview-note--error" role="alert">
              Couldn’t create the image.
            </p>
          )}
        </div>
        {/* A real link with `download` saves the file instead of opening
            it. Until the image is ready there is nothing to link to. */}
        {preview.status === 'ready' ? (
          <a className="button" href={preview.url} download={shareFileName(summary.year)}>
            {download}
          </a>
        ) : (
          <button type="button" className="button" disabled>
            {download}
          </button>
        )}
      </div>
    </Modal>
  )
}

/** Where the app lives, for the image's footer: "veljkodjur1c.github.io/statsboxd". */
function siteAddress(): string {
  return (window.location.host + import.meta.env.BASE_URL).replace(/\/$/, '')
}

export default SharePreviewDialog
