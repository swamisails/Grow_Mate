import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { User } from '../api/types/accounts'
import { App } from './App'

const admin: User = { id: 1, name: 'Noor', email: 'noor@example.com', is_admin: true }
const employee: User = { id: 2, name: 'Priya', email: 'priya@example.com', is_admin: false }

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** `GET /api/v1/me` answers `me` (null: 401); every other call answers 204 (sign out) or 200 with an empty list. */
function stubSession(me: User | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
      if (path === '/api/v1/me') {
        return me ? jsonResponse(200, { data: me }) : jsonResponse(401, { message: 'Unauthenticated.' })
      }
      if (path === '/api/v1/logout' || path === '/sanctum/csrf-cookie') {
        return new Response(null, { status: 204 })
      }
      return jsonResponse(200, { data: [] })
    }),
  )
}

function location() {
  return window.location.pathname + window.location.search
}

function open(path: string, me: User | null) {
  window.history.replaceState(null, '', path)
  stubSession(me)
  render(<App />)
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

describe('Employee routing', () => {
  it('lands on Home under a top bar of GrowMate, Home, the theme toggle, the name and Sign out only', async () => {
    open('/', employee)

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeTruthy()
    expect(location()).toBe('/home')
    expect(document.title).toBe('Home · GrowMate')

    const banner = screen.getByRole('banner')
    const links = within(banner).getAllByRole('link')
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['GrowMate', '/home'],
      ['Home', '/home'],
    ])
    expect(within(screen.getByRole('navigation')).getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBe(
      'page',
    )
    expect(within(banner).getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? button.textContent)).toEqual([
      expect.stringMatching(/^Switch to (dark|light) mode$/),
      'Sign out',
    ])
    expect(within(banner).getByText('Priya')).toBeTruthy()

    const learning = screen.getByRole('region', { name: 'Learning' })
    expect(within(learning).getByText("You aren't learning a course yet.")).toBeTruthy()
    expect(within(learning).queryByRole('link')).toBeNull()
  })

  it('shows Not found in the Employee layout on an Admin page, with a link Home', async () => {
    open('/admin/courses', employee)

    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found.' })).toBeTruthy()
    expect(location()).toBe('/admin/courses')
    expect(within(screen.getByRole('navigation')).getByRole('link', { name: 'Home' })).toBeTruthy()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/home')
  })

  it('goes Home from Sign up and Sign in', async () => {
    open('/sign-up', employee)
    await waitFor(() => expect(location()).toBe('/home'))
    cleanup()

    open('/sign-in', employee)
    await waitFor(() => expect(location()).toBe('/home'))
  })

  it('goes to the return path from Sign up', async () => {
    open('/sign-up?return=%2Fhome%3Fx%3D1', employee)
    await waitFor(() => expect(location()).toBe('/home?x=1'))
  })

  it('signs out to Sign in', async () => {
    open('/home', employee)

    const signOut = await screen.findByRole('button', { name: 'Sign out' })
    await act(async () => {
      fireEvent.click(signOut)
    })

    await waitFor(() => expect(location()).toBe('/sign-in'))
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeTruthy()
  })
})

describe('Admin routing', () => {
  it('shows Not found in the Admin layout on an Employee page', async () => {
    open('/home', admin)

    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found.' })).toBeTruthy()
    expect(location()).toBe('/home')
    expect(within(screen.getByRole('navigation')).getByRole('link', { name: 'Courses' })).toBeTruthy()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/admin/courses')
  })

  it('goes to Admin Courses from Sign up', async () => {
    open('/sign-up', admin)
    await waitFor(() => expect(location()).toBe('/admin/courses'))
  })
})

describe('Signed out', () => {
  it('sends an Employee page to Sign in, carrying the return path', async () => {
    open('/home', null)

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeTruthy()
    expect(location()).toBe('/sign-in?return=%2Fhome')
  })

  it('links Sign in and Sign up to each other, keeping the return path', async () => {
    open('/sign-in?return=%2Fhome', null)

    const toSignUp = await screen.findByRole('link', { name: 'Sign up' })
    expect(toSignUp.getAttribute('href')).toBe('/sign-up?return=%2Fhome')
    expect(toSignUp.parentElement?.textContent).toBe('No account? Sign up')
    fireEvent.click(toSignUp)

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign up' })).toBeTruthy()
    const toSignIn = screen.getByRole('link', { name: 'Sign in' })
    expect(toSignIn.getAttribute('href')).toBe('/sign-in?return=%2Fhome')
    expect(toSignIn.parentElement?.textContent).toBe('Have an account? Sign in')
  })
})
