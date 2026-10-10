import Modal from './Modal.tsx'
import TmdbKeyForm from './TmdbKeyForm.tsx'

type KeySettingsDialogProps = {
  onKeyChange: () => void // called after the user's key was saved or removed
  onClose: () => void
}

/** The TMDB key settings, opened from the key button in the top bar. */
function KeySettingsDialog({ onKeyChange, onClose }: KeySettingsDialogProps) {
  return (
    <Modal kicker="Settings" title="TMDB key" onClose={onClose}>
      <p className="modal-text">
        Genres, cast and directors come from TMDB. You can use your own free
        API key from{' '}
        <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">
          themoviedb.org/settings/api
        </a>
        . It is stored only in your browser.
      </p>
      <TmdbKeyForm onChange={onKeyChange} />
    </Modal>
  )
}

export default KeySettingsDialog
