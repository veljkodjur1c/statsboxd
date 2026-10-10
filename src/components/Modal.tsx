import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.tsx'
import './Modal.css'

type ModalProps = {
  kicker: string // small label above the title, e.g. "Actor"
  title: string
  meta?: string // optional line under the title
  onClose: () => void
  // `children` is whatever is written between <Modal> and </Modal>: the
  // caller decides what goes in the body, the Modal provides the frame.
  children: ReactNode
}

/**
 * A modal dialog: the browser's own <dialog>, opened with showModal() so it
 * traps focus, dims the page and closes on Esc. The parent renders it only
 * while it should be open and removes it in onClose.
 */
function Modal({ kicker, title, meta, onClose, children }: ModalProps) {
  // useRef gives us the real <dialog> DOM element, which React itself
  // doesn't control: we need it to call the browser's showModal().
  const dialogRef = useRef<HTMLDialogElement>(null)
  // A unique id that links the dialog to its heading for screen readers.
  const titleId = useId()

  // Effects run after React has put the element on the page, so opening on
  // mount is enough. The `open` check matters in development, where
  // StrictMode runs effects twice.
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
    }
  }, [])

  // Clicks on the dimmed backdrop land on the <dialog> element itself;
  // clicks on the content land on its children.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      event.currentTarget.close()
    }
  }

  // A portal renders the dialog straight into <body> instead of inside the
  // component that opened it, so that component's styles don't leak in.
  // React still treats it as a child of this component.
  return createPortal(
    // The browser fires "close" for Esc, the close button and backdrop
    // clicks, so every way of closing ends up in onClose.
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleClick}
    >
      <header className="modal-header">
        <div>
          <p className="kicker">{kicker}</p>
          <h2 className="modal-title" id={titleId}>
            {title}
          </h2>
          {meta && <p className="modal-meta">{meta}</p>}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Close"
          onClick={() => dialogRef.current?.close()}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="modal-body">{children}</div>
    </dialog>,
    document.body,
  )
}

export default Modal
