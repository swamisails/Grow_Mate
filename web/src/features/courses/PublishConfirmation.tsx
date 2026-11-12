import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { copy } from '../../app/copy'

type PublishConfirmationProps = {
  onCancel: () => void
  onConfirm: () => void
}

/**
 * The Publish confirmation (EXPERIENCE.md, Component Patterns): a modal dialog that traps focus
 * between its two buttons, closes on Esc, and returns focus to the button that opened it.
 * Rendered only while open; unmounting closes it.
 */
export function PublishConfirmation({ onCancel, onConfirm }: PublishConfirmationProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const confirm = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const element = dialog.current
    element?.showModal()
    cancel.current?.focus()
    return () => {
      element?.close()
      opener?.focus()
    }
  }, [])

  // Tab and Shift+Tab move between the two buttons only.
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') {
      return
    }
    event.preventDefault()
    const next = document.activeElement === cancel.current ? confirm.current : cancel.current
    next?.focus()
  }

  return (
    <dialog
      ref={dialog}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      // Esc: the browser fires `cancel`, then closes the dialog; either way the dialog unmounts.
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      onClose={onCancel}
      onKeyDown={trapFocus}
    >
      <h2 className="dialog__title" id={titleId}>
        {copy.courseEditor.publish}
      </h2>
      <p id={descriptionId}>{copy.courseEditor.confirmation}</p>
      <div className="dialog__actions">
        <button ref={cancel} type="button" className="button button--secondary" onClick={onCancel}>
          {copy.courseEditor.cancel}
        </button>
        <button ref={confirm} type="button" className="button button--primary" onClick={onConfirm}>
          {copy.courseEditor.publish}
        </button>
      </div>
    </dialog>
  )
}
