import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ApiError } from '../../api/client'
import { quitMatch } from '../../api/matching'
import { copy } from '../../app/copy'
import { fieldErrors } from '../../app/forms'

type QuitDialogProps = {
  matchId: number
  onCancel: () => void
  /** The Match ended: the caller leaves for Home. */
  onQuit: () => void
  /** The API answered 404: the Match is no longer there. */
  onGone: () => void
}

/**
 * The Quit dialog (EXPERIENCE.md, Component Patterns): a required reason of 1 to 500 characters,
 * with Cancel and Quit Course. A modal that traps focus, closes on Esc and returns focus to the
 * button that opened it. Rendered only while open.
 */
export function QuitDialog({ matchId, onCancel, onQuit, onGone }: QuitDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const reasonField = useRef<HTMLTextAreaElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const submit = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const reasonId = useId()
  const errorId = useId()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const element = dialog.current
    element?.showModal()
    reasonField.current?.focus()
    return () => {
      element?.close()
      opener?.focus()
    }
  }, [])

  // Tab and Shift+Tab cycle through the reason, Cancel and Quit Course only.
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') {
      return
    }
    const order = [reasonField.current, cancel.current, submit.current].filter(
      (element): element is HTMLTextAreaElement | HTMLButtonElement => element !== null && !element.disabled,
    )
    if (order.length === 0) {
      return
    }
    event.preventDefault()
    const index = order.indexOf(document.activeElement as HTMLTextAreaElement | HTMLButtonElement)
    const next = event.shiftKey ? (index <= 0 ? order.length - 1 : index - 1) : (index + 1) % order.length
    order[next].focus()
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      await quitMatch(matchId, reason)
      onQuit()
    } catch (caught) {
      setSending(false)
      if (caught instanceof ApiError && caught.status === 404) {
        onGone()
        return
      }
      setError(fieldErrors(caught)?.reason ?? copy.errors.generic)
      reasonField.current?.focus()
    }
  }

  return (
    <dialog
      ref={dialog}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      onClose={onCancel}
      onKeyDown={trapFocus}
    >
      <h2 className="dialog__title" id={titleId}>
        {copy.match.quitDialog.title}
      </h2>
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <textarea
            ref={reasonField}
            className="field__input field__input--multiline"
            id={reasonId}
            name="reason"
            rows={3}
            maxLength={500}
            placeholder=" "
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? true : undefined}
            required
          />
          <label className="field__label" htmlFor={reasonId}>
            {copy.match.quitDialog.reason}
          </label>
          {error && (
            <p className="field-error" id={errorId} role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="dialog__actions">
          <button ref={cancel} type="button" className="button button--secondary" onClick={onCancel}>
            {copy.confirmation.cancel}
          </button>
          <button ref={submit} type="submit" className="button button--primary" disabled={sending}>
            {copy.match.quitCourse}
          </button>
        </div>
      </form>
    </dialog>
  )
}
