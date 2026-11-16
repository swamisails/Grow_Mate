import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { copy } from './copy'

type ConfirmationProps = {
  /** The dialog's heading, and its accessible name. */
  title: string
  /** The one sentence under the heading. */
  message: string
  /** The confirming button's label: the action being confirmed. */
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

/**
 * A confirmation for a final action (EXPERIENCE.md, Component Patterns): a modal dialog that traps
 * focus between Cancel and the action, closes on Esc, and returns focus to the button that opened
 * it. Rendered only while open; unmounting closes it.
 */
export function Confirmation({ title, message, confirmLabel, onCancel, onConfirm }: ConfirmationProps) {
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
        {title}
      </h2>
      <p id={descriptionId}>{message}</p>
      <div className="dialog__actions">
        <button ref={cancel} type="button" className="button button--secondary" onClick={onCancel}>
          {copy.confirmation.cancel}
        </button>
        <button ref={confirm} type="button" className="button button--primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
