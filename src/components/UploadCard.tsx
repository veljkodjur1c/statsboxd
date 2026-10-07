import { useState, type ChangeEvent, type DragEvent } from 'react'

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

  return (
    <section
      className={isDragging ? 'card is-dragging' : 'card'}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h2>Upload your Letterboxd export</h2>
      <p>
        Export your data from your Letterboxd settings, then choose or drop the
        ZIP file here. Everything is processed in your browser.
      </p>
      <label className={isLoading ? 'button is-disabled' : 'button'}>
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
          {message}
        </p>
      )}
    </section>
  )
}

export default UploadCard
