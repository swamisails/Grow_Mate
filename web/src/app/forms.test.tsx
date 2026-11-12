import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { SignIn } from '../features/accounts/SignIn'
import { ConflictMessage, fieldErrors, focusFirstInvalid, useConflict } from './forms'
import { RouterProvider } from './Router'
import { SessionContext, type SessionValue } from './session'

afterEach(cleanup)

const credentialsError = new ApiError(422, {
  message: 'These credentials do not match our records.',
  errors: { email: ['These credentials do not match our records.', 'A second message.'] },
})

describe('fieldErrors', () => {
  it('keeps the first message of each field of a 422', () => {
    const errors = new ApiError(422, {
      message: 'The given data was invalid.',
      errors: { email: ['First.', 'Second.'], password: ['Required.'] },
    })
    expect(fieldErrors(errors)).toEqual({ email: 'First.', password: 'Required.' })
  })

  it('is null for anything that is not a 422 with field errors', () => {
    expect(fieldErrors(new ApiError(409, { message: 'Refused.', code: 'refused' }))).toBeNull()
    expect(fieldErrors(new ApiError(422, { message: 'No fields.' }))).toBeNull()
    expect(fieldErrors(new ApiError(500, { message: 'Server Error' }))).toBeNull()
    expect(fieldErrors(new Error('network'))).toBeNull()
  })
})

describe('focusFirstInvalid', () => {
  it('focuses the first invalid field in form order, whatever the error order', () => {
    render(
      <form data-testid="form">
        <input name="email" aria-label="Email" />
        <input name="password" aria-label="Password" />
      </form>,
    )
    const form = screen.getByTestId('form') as HTMLFormElement

    expect(focusFirstInvalid(form, { password: 'Required.', email: 'Required.' })).toBe(screen.getByLabelText('Email'))
    expect(document.activeElement).toBe(screen.getByLabelText('Email'))

    focusFirstInvalid(form, { password: 'Required.' })
    expect(document.activeElement).toBe(screen.getByLabelText('Password'))

    expect(focusFirstInvalid(form, { other: 'Required.' })).toBeNull()
  })

  it('focuses the first control of a fieldset named with a group-level key', () => {
    render(
      <form data-testid="form">
        <input name="title" aria-label="Title" />
        <fieldset name="stages.0.questions.0.options">
          <legend>Options</legend>
          <fieldset>
            <legend>Nested</legend>
            <input name="stages.0.questions.0.options.0.text" aria-label="Option 1" />
          </fieldset>
          <input type="radio" name="correct" aria-label="Correct" />
        </fieldset>
      </form>,
    )
    const form = screen.getByTestId('form') as HTMLFormElement

    expect(focusFirstInvalid(form, { 'stages.0.questions.0.options': 'Too few.' })).toBe(screen.getByLabelText('Option 1'))
    expect(document.activeElement).toBe(screen.getByLabelText('Option 1'))
  })

  it('fires focus again when the invalid field already has focus', () => {
    render(
      <form data-testid="form">
        <input name="email" aria-label="Email" />
      </form>,
    )
    const form = screen.getByTestId('form') as HTMLFormElement
    const email = screen.getByLabelText('Email')
    email.focus()
    const onFocus = vi.fn()
    email.addEventListener('focus', onFocus)

    focusFirstInvalid(form, { email: 'Required.' })

    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(email)
  })
})

describe('Sign in with a 422', () => {
  it('shows the message under Email, links it, and focuses Email', async () => {
    const session: SessionValue = {
      loading: false,
      user: null,
      signIn: vi.fn().mockRejectedValue(credentialsError),
      signUp: vi.fn(),
      signOut: vi.fn(),
    }
    render(
      <SessionContext.Provider value={session}>
        <RouterProvider>
          <SignIn />
        </RouterProvider>
      </SessionContext.Provider>,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    })

    const email = screen.getByLabelText('Email')
    const message = screen.getByText('These credentials do not match our records.')
    expect(message.className).toBe('field-error')
    expect(email.getAttribute('aria-invalid')).toBe('true')
    expect(email.getAttribute('aria-describedby')).toBe(message.id)
    expect(document.activeElement).toBe(email)
    expect(screen.queryByText('A second message.')).toBeNull()
    expect(screen.getByLabelText('Password').getAttribute('aria-invalid')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sign in')
    expect(document.title).toBe('Sign in · GrowMate')
  })
})

function RefusableAction({ act: action, refetch }: { act: () => Promise<void>; refetch: () => void }) {
  const conflict = useConflict(refetch)
  const [other, setOther] = useState<string | null>(null)

  async function run() {
    conflict.clear()
    try {
      await action()
    } catch (error) {
      if (!conflict.handle(error)) {
        setOther('not a refusal')
      }
    }
  }

  return (
    <div>
      <button type="button" onClick={run}>
        Request
      </button>
      <ConflictMessage message={conflict.message} />
      {other && <p>{other}</p>}
    </div>
  )
}

describe('useConflict and ConflictMessage', () => {
  it('announces the 409 message as sent next to the action and re-fetches', async () => {
    const refetch = vi.fn()
    const refusal = new ApiError(409, { message: 'This mentor already has your request.', code: 'request_pending' })
    const { container } = render(<RefusableAction act={() => Promise.reject(refusal)} refetch={refetch} />)

    const region = container.querySelector('[aria-live="polite"]')
    expect(region).not.toBeNull()
    expect(region?.textContent).toBe('')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request' }))
    })

    expect(region?.textContent).toBe('This mentor already has your request.')
    expect(region?.className).toBe('field-error')
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('leaves other errors to the caller and does not re-fetch', async () => {
    const refetch = vi.fn()
    const { container } = render(
      <RefusableAction act={() => Promise.reject(new ApiError(500, { message: 'Server Error' }))} refetch={refetch} />,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request' }))
    })

    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('')
    expect(screen.getByText('not a refusal')).toBeTruthy()
    expect(refetch).not.toHaveBeenCalled()
  })
})
