import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { App } from './App'

const admin = { id: 1, name: 'Noor', email: 'noor@example.com', is_admin: true }
const employee = { id: 2, name: 'Priya', email: 'priya@example.com', is_admin: false }

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Answers each API path from `routes`; unknown paths answer 404. */
function stubApi(routes: Record<string, () => Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
      return routes[path]?.() ?? jsonResponse(404, { message: 'Not Found' })
    }),
  )
}

function location() {
  return window.location.pathname + window.location.search
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

describe('App routing', () => {
  it('sends the user to Sign in with the return path when a call answers 401 mid-use', async () => {
    window.history.replaceState(null, '', '/admin/courses?x=1')
    stubApi({
      '/api/v1/me': () => jsonResponse(200, { data: admin }),
      '/api/v1/courses': () => jsonResponse(401, { message: 'Unauthenticated.' }),
    })
    render(<App />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Courses' })).toBeTruthy()

    await act(async () => {
      await api.get('/api/v1/courses').catch(() => undefined)
    })

    await waitFor(() => expect(location()).toBe('/sign-in?return=%2Fadmin%2Fcourses%3Fx%3D1'))
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeTruthy()
  })

  it('goes home after sign-in when the return path is Sign in itself', async () => {
    window.history.replaceState(null, '', '/sign-in?return=/sign-in')
    let signedIn = false
    stubApi({
      '/api/v1/me': () => (signedIn ? jsonResponse(200, { data: admin }) : jsonResponse(401, { message: 'Unauthenticated.' })),
      '/sanctum/csrf-cookie': () => new Response(null, { status: 204 }),
      '/api/v1/login': () => {
        signedIn = true
        return jsonResponse(200, { data: admin })
      },
    })
    render(<App />)

    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: admin.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    })

    await waitFor(() => expect(location()).toBe('/admin/courses'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Courses' })).toBeTruthy()
  })

  it.each([
    ['pending', true, '/mentor-check', 'Mentor check'],
    ['done', false, '/courses', 'Courses'],
  ])('signs in an Employee whose Mentor check is %s', async (_label, pending, path, heading) => {
    window.history.replaceState(null, '', '/sign-in?return=%2Fcourses')
    let signedIn = false
    stubApi({
      '/api/v1/me': () => (signedIn ? jsonResponse(200, { data: employee }) : jsonResponse(401, { message: 'Unauthenticated.' })),
      '/sanctum/csrf-cookie': () => new Response(null, { status: 204 }),
      '/api/v1/login': () => {
        signedIn = true
        return jsonResponse(200, { data: employee })
      },
      '/api/v1/mentor-check': () => jsonResponse(200, { data: { pending, courses: [] } }),
      '/api/v1/courses': () => jsonResponse(200, { data: [] }),
    })
    render(<App />)

    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: employee.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    })

    // Pending, the step wins over the return path; done, the return path is kept.
    await waitFor(() => expect(location()).toBe(path))
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeTruthy()
  })
})
