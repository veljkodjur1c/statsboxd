import { useState, type ChangeEvent, type DragEvent } from 'react'
import Mascot from './brand/Mascot.tsx'
import Icon from './Icon.tsx'
import './UploadCard.css'

type UploadCardProps = {
  onFileSelected: (file: File) => void
  isLoading: boolean
  error: string | null
}

function UploadCard({ onFileSelected, isLoading, error }: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  function handleFile(file: File | undefined) {
    if (!file) {
      return
    }
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setFileError('Please choose the .zip file you downloaded from Letterboxd.')
      return
    }
    setFileError(null)
    onFileSelected(file)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    handleFile(event.target.files?.[0])
    // Clear the input so choosing the same file again still fires onChange.
    event.target.value = ''
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    // Without preventDefault the browser doesn't allow dropping here.
    event.preventDefault()
    if (!isLoading) {
      setIsDragging(true)
    }
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    // Moving over a child element also fires dragleave — ignore those.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return
    }
    setIsDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    // Stop the browser from opening the dropped file.
    event.preventDefault()
    setIsDragging(false)
    if (!isLoading) {
      handleFile(event.dataTransfer.files[0])
    }
  }

  const message = fileError ?? error
  // The mascot shows what's going on: working, a problem, or waiting.
  const mood = isLoading ? 'busy' : message ? 'sad' : 'idle'

  // The whole section accepts a dropped file. While one is dragged over it,
  // `is-dragging` brightens the projector's beam and lights up the screen.
  return (
    <section
      className={isDragging ? 'hero is-dragging' : 'hero'}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="hero-copy">
        <p className="kicker">Letterboxd stats</p>
        <h2 className="hero-title">Your Letterboxd history, in numbers.</h2>
        <p className="hero-sub">
          See how you rate each genre and decade, and find your top actors and
          directors.
        </p>
      </div>

      <div className="stage">
        <div className="stage-mascot">
          <Mascot mood={mood} />
        </div>
        <div className="beam" aria-hidden="true" />
        <div className="screen">
          {message && <p className="kicker kicker--error">Film jammed</p>}
          <h3 className="screen-title">Upload your Letterboxd export</h3>
          <p>
            Export your data from your Letterboxd settings, then choose or drop
            the ZIP file here.
          </p>
          <label className={isLoading ? 'button is-disabled' : 'button'}>
            <Icon name="upload" />
            {isLoading ? 'Reading your export…' : 'Choose ZIP file'}
            <input
              type="file"
              accept=".zip,application/zip"
              className="visually-hidden"
              disabled={isLoading}
              onChange={handleChange}
            />
          </label>
          {message && (
            <p className="error-message" role="alert">
              <Icon name="alert" />
              <span>{message}</span>
            </p>
          )}
          <p className="privacy">
            <Icon name="lock" />
            Everything is processed in your browser.
          </p>
        </div>
      </div>
    </section>
  )
}

export default UploadCard
