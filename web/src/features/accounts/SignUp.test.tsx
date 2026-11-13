import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { User } from '../../api/types/accounts'
import { App } from '../../app/App'

const priya: User = { id: 7, name: 'Priya', email: 'priya@example.com', is_admin: false }

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Signed out until `POST /api/v1/register` answers `register()`; a 201 signs Priya in, with her Mentor check pending. */
function stubRegister(register: () => Response) {
  let me: User | null = null
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
    const method = init?.method ?? 'GET'
    if (path === '/sanctum/csrf-cookie') {
      return new Response(null, { status: 204 })
    }
    if (method === 'GET' && path === '/api/v1/me') {
      return me ? jsonResponse(200, { data: me }) : jsonResponse(401, { message: 'Unauthenticated.' })
    }
    if (method === 'GET' && path === '/api/v1/mentor-check' && me) {
      return jsonResponse(200, { data: { pending: true, courses: [{ id: 3, title: 'Python Basics' }] } })
    }
    if (method === 'POST' && path === '/api/v1/register') {
      const response = register()
      if (response.status === 201) {
        me = priya
      }
      return response
    }
    return jsonResponse(404, { message: 'Not Found' })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function fillAndSubmit(name: string, email: string, password: string) {
  fireEvent.change(await screen.findByLabelText('Name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

describe('Sign up', () => {
  it('names itself and offers Name, Email and Password', async () => {
    window.history.replaceState(null, '', '/sign-up')
    stubRegister(() => jsonResponse(500, { message: 'Server Error' }))
    render(<App />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign up' })).toBeTruthy()
    expect(document.title).toBe('Sign up · GrowMate')
    expect(screen.getByLabelText('Name').getAttribute('autocomplete')).toBe('name')
    expect(screen.getByLabelText('Email').getAttribute('type')).toBe('email')
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('new-password')
  })

  it('creates the account, signs in and lands on step 2, the Mentor check', async () => {
    window.history.replaceState(null, '', '/sign-up?return=%2Fcourses')
    const fetchMock = stubRegister(() => jsonResponse(201, { data: priya }))
    render(<App />)

    await fillAndSubmit('Priya', 'priya@example.com', 'secret-password')

    await waitFor(() => expect(window.location.pathname).toBe('/mentor-check'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Mentor check' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Python Basics' })).toBeTruthy()
    expect(within(screen.getByRole('banner')).getByText('Priya')).toBeTruthy()

    const register = fetchMock.mock.calls.find(([input]) => input === '/api/v1/register')
    expect(JSON.parse(String(register?.[1]?.body))).toEqual({
      name: 'Priya',
      email: 'priya@example.com',
      password: 'secret-password',
    })
    // The CSRF cookie is fetched before the state-changing call.
    const paths = fetchMock.mock.calls.map(([input]) => String(input))
    expect(paths.indexOf('/sanctum/csrf-cookie')).toBeLessThan(paths.indexOf('/api/v1/register'))
    // The new Employee's Mentor check status is read once the account exists.
    expect(paths.indexOf('/api/v1/register')).toBeLessThan(paths.indexOf('/api/v1/mentor-check'))
  })

  it('puts each 422 message under its own field and focuses the first invalid field', async () => {
    window.history.replaceState(null, '', '/sign-up')
    stubRegister(() =>
      jsonResponse(422, {
        message: 'The name field is required. (and 2 more errors)',
        errors: {
          name: ['The name field is required.'],
          email: ['The email field must be a valid email address.'],
          password: ['The password field must be at least 8 characters.'],
        },
      }),
    )
    render(<App />)

    await fillAndSubmit('', 'not-an-email', 'short')

    for (const [label, message] of [
      ['Name', 'The name field is required.'],
      ['Email', 'The email field must be a valid email address.'],
      ['Password', 'The password field must be at least 8 characters.'],
    ]) {
      const input = screen.getByLabelText(label)
      const error = screen.getByText(message)
      expect(error.className).toBe('field-error')
      expect(input.getAttribute('aria-invalid')).toBe('true')
      expect(input.getAttribute('aria-describedby')).toBe(error.id)
    }
    expect(document.activeElement).toBe(screen.getByLabelText('Name'))
    expect(window.location.pathname).toBe('/sign-up')
  })

  it('shows a taken email under Email alone, and focuses Email', async () => {
    window.history.replaceState(null, '', '/sign-up')
    stubRegister(() =>
      jsonResponse(422, {
        message: 'The email has already been taken.',
        errors: { email: ['The email has already been taken.'] },
      }),
    )
    render(<App />)

    await fillAndSubmit('Priya', 'PRIYA@example.com', 'secret-password')

    const email = screen.getByLabelText('Email')
    expect(email.getAttribute('aria-describedby')).toBe(screen.getByText('The email has already been taken.').id)
    expect(screen.getByLabelText('Name').getAttribute('aria-invalid')).toBeNull()
    expect(document.activeElement).toBe(email)
  })

  it('shows any other refusal as the API message', async () => {
    window.history.replaceState(null, '', '/sign-up')
    stubRegister(() => jsonResponse(403, { message: 'Sign up from the GrowMate app.' }))
    render(<App />)

    await fillAndSubmit('Priya', 'priya@example.com', 'secret-password')

    expect(screen.getByRole('alert').textContent).toBe('Sign up from the GrowMate app.')
  })
})
