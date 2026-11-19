import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { MatchScreen } from '../../api/types/matching'
import { App } from '../../app/App'
import { jsonResponse } from '../../test/api'

function open(match: () => Response) {
  window.history.replaceState(null, '', '/matches/9')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 2, name: 'Priya Nair', email: 'priya@example.com', is_admin: false } })
      if (url === '/api/v1/mentor-check') return jsonResponse(200, { data: { pending: false, courses: [] } })
      if (url === '/api/v1/matches/9') return match()
      return jsonResponse(404, { message: 'Not Found' })
    }),
  )
  render(<App />)
}

const screenBody: MatchScreen = { person_name: 'Rafi Haddad', course_title: 'Python Basics', status: 'in_progress' }

beforeEach(() => {
  // jsdom has no modal dialog support.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

it('shows the other person, the Course, the bar and Quit Course only', async () => {
  open(() => jsonResponse(200, { data: screenBody }))

  expect(await screen.findByRole('heading', { level: 1, name: 'Python Basics' })).toBeTruthy()
  await waitFor(() => expect(document.title).toBe('Python Basics · GrowMate'))
  const card = screen.getByRole('region', { name: 'Rafi Haddad' })
  expect(within(card).getByText('Python Basics')).toBeTruthy()
  expect(within(card).getByRole('img', { name: 'Progress: In progress' })).toBeTruthy()
  expect(card.querySelector('.progress__fill--in-progress')).toBeTruthy()
  expect(within(screen.getByRole('main')).getAllByRole('button').map((button) => button.textContent)).toEqual(['Quit Course'])
  expect(within(screen.getByRole('main')).queryByRole('link')).toBeNull()
  expect(screen.queryByText('Course Completed')).toBeNull()
})

it('shows Not found when the viewer is not a party', async () => {
  open(() => jsonResponse(404, { message: 'Not found.' }))

  expect(await screen.findByRole('heading', { level: 1, name: 'Page not found.' })).toBeTruthy()
  expect(screen.queryByRole('img', { name: /Progress:/ })).toBeNull()
})

it('shows Not found for an id that is not a number', async () => {
  window.history.replaceState(null, '', '/matches/nope')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 2, name: 'Priya Nair', email: 'priya@example.com', is_admin: false } })
      if (url === '/api/v1/mentor-check') return jsonResponse(200, { data: { pending: false, courses: [] } })
      return jsonResponse(404, { message: 'Not Found' })
    }),
  )
  render(<App />)

  expect(await screen.findByRole('heading', { level: 1, name: 'Page not found.' })).toBeTruthy()
})

function openWithQuit(quit: (body: unknown) => Response) {
  window.history.replaceState(null, '', '/matches/9')
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 2, name: 'Priya Nair', email: 'priya@example.com', is_admin: false } })
    if (url === '/api/v1/mentor-check') return jsonResponse(200, { data: { pending: false, courses: [] } })
    if (url === '/api/v1/matches/9' && init?.method === 'POST') return jsonResponse(404, { message: 'Not Found' })
    if (url === '/api/v1/matches/9') return jsonResponse(200, { data: screenBody })
    if (url === '/api/v1/matches/9/quit') return quit(init?.body ? JSON.parse(String(init.body)) : undefined)
    if (url === '/api/v1/home') return jsonResponse(200, { data: { learning: [], mentoring: [] } })
    return jsonResponse(404, { message: 'Not Found' })
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<App />)
  return fetchMock
}

it('quits with a reason and returns to Home', async () => {
  let sent: unknown
  const fetchMock = openWithQuit((body) => {
    sent = body
    return new Response(null, { status: 204 })
  })

  fireEvent.click(await screen.findByRole('button', { name: 'Quit Course' }))
  const dialog = await screen.findByRole('dialog', { name: 'Quit Course' })
  fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Moving teams, sorry' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Quit Course' }))

  await waitFor(() => expect(sent).toEqual({ reason: 'Moving teams, sorry' }))
  expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeTruthy()
  expect(fetchMock.mock.calls.some(([url]) => String(url) === '/api/v1/matches/9/quit')).toBe(true)
})

it('shows the reason error under the field when the API refuses it', async () => {
  openWithQuit(() => jsonResponse(422, { message: 'The reason field is required.', errors: { reason: ['The reason field is required.'] } }))

  fireEvent.click(await screen.findByRole('button', { name: 'Quit Course' }))
  const dialog = await screen.findByRole('dialog', { name: 'Quit Course' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Quit Course' }))

  expect(await within(dialog).findByText('The reason field is required.')).toBeTruthy()
  expect(within(dialog).getByLabelText('Reason').getAttribute('aria-invalid')).toBe('true')
  expect(screen.queryByRole('heading', { level: 1, name: 'Home' })).toBeNull()
})

it('closes the dialog on Cancel without calling the API', async () => {
  const fetchMock = openWithQuit(() => new Response(null, { status: 204 }))

  fireEvent.click(await screen.findByRole('button', { name: 'Quit Course' }))
  const dialog = await screen.findByRole('dialog', { name: 'Quit Course' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/quit'))).toBe(false)
})

it('shows Not found when the Match is gone by the time of Quit', async () => {
  openWithQuit(() => jsonResponse(404, { message: 'Not found.' }))

  fireEvent.click(await screen.findByRole('button', { name: 'Quit Course' }))
  const dialog = await screen.findByRole('dialog', { name: 'Quit Course' })
  fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Too busy' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Quit Course' }))

  expect(await screen.findByRole('heading', { level: 1, name: 'Page not found.' })).toBeTruthy()
})
