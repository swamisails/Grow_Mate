// Shared handling of the two API refusals a page shows in place (EXPERIENCE.md, State Patterns):
// 422 field errors under their fields, and 409 rule refusals next to the action that was refused.
// Messages are the API's own text, never rewritten (AD-10).

import { createElement, useCallback, useState } from 'react'
import { ApiError } from '../api/client'

/** The first message for each invalid field, keyed by the field's `name`. */
export type FieldErrors = Record<string, string>

/** A 422's first message per field, or null when the error is not a validation error. */
export function fieldErrors(error: unknown): FieldErrors | null {
  if (!(error instanceof ApiError) || error.status !== 422 || !error.errors) {
    return null
  }
  const first: FieldErrors = {}
  for (const [field, messages] of Object.entries(error.errors)) {
    if (messages.length > 0) {
      first[field] = messages[0]
    }
  }
  return first
}

/** The first enabled control inside a group, skipping nested fieldsets themselves. */
function firstControl(group: HTMLFieldSetElement): HTMLElement | null {
  for (const element of Array.from(group.elements)) {
    if (element instanceof HTMLElement && !(element instanceof HTMLFieldSetElement) && !(element as HTMLInputElement).disabled) {
      return element
    }
  }
  return null
}

/**
 * Focuses the first field (in form order) that has an error; returns it, or null when none matched.
 * A group-level key (e.g. `stages.0.questions.1.options`) has no input of its own: name the group's
 * `<fieldset>` with it, and the group's first control gets focus.
 */
export function focusFirstInvalid(form: HTMLFormElement, errors: FieldErrors): HTMLElement | null {
  for (const element of Array.from(form.elements)) {
    const name = (element as HTMLInputElement).name
    if (!name || !(name in errors) || !(element instanceof HTMLElement)) {
      continue
    }
    const target = element instanceof HTMLFieldSetElement ? firstControl(element) : element
    if (!target) {
      continue
    }
    // Already focused (e.g. submitted with Enter from this field): blur first so focus fires again
    // and screen readers announce the newly linked error description.
    if (document.activeElement === target) {
      target.blur()
    }
    target.focus()
    return target
  }
  return null
}

/**
 * A 409 refusal for one action. Call `handle(error)` from the action's catch: on a 409 it keeps the
 * API's message and re-fetches (the server state has changed) and returns true; otherwise it returns
 * false and the caller deals with the error.
 */
export function useConflict(refetch: () => unknown) {
  const [message, setMessage] = useState<string | null>(null)

  const handle = useCallback(
    (error: unknown): boolean => {
      if (error instanceof ApiError && error.status === 409) {
        setMessage(error.message)
        void refetch()
        return true
      }
      return false
    },
    [refetch],
  )

  const clear = useCallback(() => setMessage(null), [])

  return { message, handle, clear }
}

/**
 * Where a 409 message appears, next to its action. The live region is always rendered so the
 * message is announced when it arrives.
 */
export function ConflictMessage({ message, id }: { message: string | null; id?: string }) {
  return createElement('p', { className: 'field-error', 'aria-live': 'polite', id }, message)
}
