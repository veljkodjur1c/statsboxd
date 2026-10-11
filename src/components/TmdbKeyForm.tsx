import { useState, type FormEvent } from 'react'
import {
  clearUserToken,
  getUserToken,
  isTokenFormat,
  saveUserToken,
} from '../lib/tmdb.ts'
import Icon from './Icon.tsx'
import './TmdbKeyForm.css'

type TmdbKeyFormProps = {
  // Called after the user's key was saved or removed.
  onChange: () => void
}

function TmdbKeyForm({ onChange }: TmdbKeyFormProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Passing a function to useState means it runs only once, on the first render.
  const [hasUserKey, setHasUserKey] = useState(() => getUserToken() !== null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stop the browser from reloading the page when the form is submitted.
    event.preventDefault()
    const key = value.trim()
    if (key === '') {
      return
    }
    if (!isTokenFormat(key)) {
      setError(
        "That doesn't look like a TMDB key. Copy it again from your TMDB API settings.",
      )
      return
    }
    if (!saveUserToken(key)) {
      setError('Could not save the key: your browser blocks local storage.')
      return
    }
    setError(null)
    setValue('')
    setHasUserKey(true)
    onChange()
  }

  function handleRemove() {
    clearUserToken()
    setHasUserKey(false)
    onChange()
  }

  if (hasUserKey) {
    return (
      <div className="key-form">
        <span className="key-status">Using your own TMDB key.</span>
        <button type="button" className="button button--secondary" onClick={handleRemove}>
          Remove key
        </button>
      </div>
    )
  }

  return (
    <>
      <form className="key-form" onSubmit={handleSubmit}>
        <input
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="TMDB API Read Access Token"
          aria-label="TMDB API key"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="button" disabled={value.trim() === ''}>
          Save key
        </button>
      </form>
      {error && (
        <p className="error-message" role="alert">
          <Icon name="alert" />
          <span>{error}</span>
        </p>
      )}
    </>
  )
}

export default TmdbKeyForm
