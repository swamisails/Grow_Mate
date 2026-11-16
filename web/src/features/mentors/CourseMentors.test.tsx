import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../app/App'
import { jsonResponse } from '../../test/api'

const course = { id: 3, title: 'Python Basics', description: 'Variables and functions.' }

/** Opens the Course page as Rafi, answering the Mentors list with `mentors()`. */
function open(mentors: () => Response | Promise<Response>) {
  window.history.replaceState(null, '', '/courses/3')
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 5, name: 'Rafi Haddad', email: 'rafi@example.com', is_admin: false } })
    if (url === '/api/v1/mentor-check') return jsonResponse(200, { data: { pending: false, courses: [] } })
    if (url === '/api/v1/courses/3') return jsonResponse(200, { data: course })
    if (url === '/api/v1/courses/3/mentors') return mentors()
    return jsonResponse(404, { message: 'Not Found' })
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<App />)
  return fetchMock
}

async function mentorsCard() {
  return screen.findByRole('region', { name: 'Mentors' })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

it('lists each Mentor by name in the order the API gives, with nothing else', async () => {
  const fetchMock = open(() => jsonResponse(200, { data: [{ id: 8, name: 'Imani Okafor' }, { id: 4, name: '<b>Sam</b> Lindqvist' }] }))
  const card = await mentorsCard()
  const rows = await within(card).findAllByRole('listitem')
  expect(rows.map((row) => row.textContent)).toEqual(['Imani Okafor', '<b>Sam</b> Lindqvist'])
  expect(card.querySelector('b')).toBeNull()
  expect(within(card).queryByRole('button')).toBeNull()
  expect(within(card).queryByRole('img')).toBeNull()
  // Both cards sit in the page's two-column grid.
  expect(card.parentElement?.className).toBe('card-grid')
  expect(screen.getByRole('region', { name: 'Description' }).parentElement).toBe(card.parentElement)
  expect(fetchMock.mock.calls.map(([input]) => String(input))).toContain('/api/v1/courses/3/mentors')
})

it('shows the empty state when the Course has no other Mentors', async () => {
  open(() => jsonResponse(200, { data: [] }))
  const card = await mentorsCard()
  expect(await within(card).findByText('No mentors for this course yet.')).toBeTruthy()
  expect(within(card).queryByRole('list')).toBeNull()
})

it('shows Loading until the list arrives', async () => {
  let answer: (response: Response) => void = () => {}
  open(() => new Promise<Response>((resolve) => { answer = resolve }))
  const card = await mentorsCard()
  expect(within(card).getByRole('status').textContent).toBe('Loading…')
  answer(jsonResponse(200, { data: [{ id: 8, name: 'Imani Okafor' }] }))
  expect(await within(card).findByText('Imani Okafor')).toBeTruthy()
  expect(within(card).queryByRole('status')).toBeNull()
})

it('shows the generic error when the list cannot load, and keeps the rest of the page', async () => {
  open(() => jsonResponse(500, { message: 'Server Error' }))
  const card = await mentorsCard()
  expect((await within(card).findByRole('alert')).textContent).toBe('Something went wrong. Try again.')
  expect(screen.getByRole('heading', { level: 1, name: 'Python Basics' })).toBeTruthy()
  expect(screen.getByText('Variables and functions.')).toBeTruthy()
})

const sent = { current: false }

it('shows Request when the Learner may ask, then a grey bar and no buttons after sending', async () => {
  sent.current = false
  window.history.replaceState(null, '', '/courses/3')
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 2, name: 'Priya Nair', email: 'priya@example.com', is_admin: false } })
    if (url === '/api/v1/mentor-check') return jsonResponse(200, { data: { pending: false, courses: [] } })
    if (url === '/api/v1/courses/3') return jsonResponse(200, { data: course })
    if (url === '/api/v1/courses/3/mentors') return jsonResponse(200, { data: [{ id: 8, name: 'Rafi Haddad' }, { id: 4, name: 'Imani Okafor' }] })
    if (url === '/api/v1/courses/3/request-eligibility') return jsonResponse(200, { data: { can_request: method === 'GET' && sent.current ? false : true } })
    if (url === '/api/v1/courses/3/progress') return jsonResponse(200, { data: { status: sent.current ? 'not_yet_started' : null } })
    if (method === 'POST' && url === '/api/v1/courses/3/requests') {
      sent.current = true
      return jsonResponse(201, { data: { id: 1, course_id: 3, mentor_id: 8, sent_at: '2026-11-15T08:30:00.000000Z' } })
    }
    return jsonResponse(404, { message: 'Not Found' })
  }))
  render(<App />)

  const card = await mentorsCard()
  const request = await within(card).findAllByRole('button', { name: 'Request' })
  expect(request).toHaveLength(2)
  fireEvent.click(request[0])

  const bar = await screen.findByRole('img', { name: 'Progress: Not yet started' })
  expect(bar.textContent).toBe('Not yet started')
  expect(bar.querySelector('.progress__fill--not-yet-started')).toBeTruthy()
  await waitFor(() => expect(within(card).queryByRole('button', { name: 'Request' })).toBeNull())
  expect(screen.getByRole('heading', { level: 1, name: 'Python Basics' })).toBeTruthy()
})

it('keeps the API message and the Course page when the refresh after a 409 fails', async () => {
  window.history.replaceState(null, '', '/courses/3')
  let posted = false
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 2, name: 'Priya Nair', email: 'priya@example.com', is_admin: false } })
    if (url === '/api/v1/mentor-check') return jsonResponse(200, { data: { pending: false, courses: [] } })
    if (url === '/api/v1/courses/3') return jsonResponse(200, { data: course })
    if (url === '/api/v1/courses/3/mentors') return jsonResponse(200, { data: [{ id: 8, name: 'Rafi Haddad' }, { id: 4, name: 'Imani Okafor' }] })
    if (method === 'POST' && url === '/api/v1/courses/3/requests') {
      posted = true
      return jsonResponse(409, { message: 'You already have an open request for this course.', code: 'MATCHING_REQUEST_ALREADY_OPEN' })
    }
    if (posted && (url.endsWith('/request-eligibility') || url.endsWith('/progress'))) return jsonResponse(500, { message: 'Server Error' })
    if (url === '/api/v1/courses/3/request-eligibility') return jsonResponse(200, { data: { can_request: true } })
    if (url === '/api/v1/courses/3/progress') return jsonResponse(200, { data: { status: null } })
    return jsonResponse(404, { message: 'Not Found' })
  }))
  render(<App />)

  const card = await mentorsCard()
  const request = await within(card).findAllByRole('button', { name: 'Request' })
  fireEvent.click(request[0])

  const rows = within(card).getAllByRole('listitem')
  expect((await within(rows[0]).findByRole('alert')).textContent).toBe('You already have an open request for this course.')
  expect(within(rows[1]).queryByRole('alert')).toBeNull()
  expect(screen.getByRole('heading', { level: 1, name: 'Python Basics' })).toBeTruthy()
  expect(screen.getByText('Variables and functions.')).toBeTruthy()
  expect(screen.queryByText('Something went wrong. Try again.')).toBeNull()
})

it('keeps Not yet started when an earlier progress read finishes after the Request', async () => {
  sent.current = false
  window.history.replaceState(null, '', '/courses/3')
  let releaseFirst: (response: Response) => void = () => {}
  let progressReads = 0
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 2, name: 'Priya Nair', email: 'priya@example.com', is_admin: false } })
    if (url === '/api/v1/mentor-check') return jsonResponse(200, { data: { pending: false, courses: [] } })
    if (url === '/api/v1/courses/3') return jsonResponse(200, { data: course })
    if (url === '/api/v1/courses/3/mentors') return jsonResponse(200, { data: [{ id: 8, name: 'Rafi Haddad' }] })
    if (url === '/api/v1/courses/3/request-eligibility') return jsonResponse(200, { data: { can_request: !sent.current } })
    if (url === '/api/v1/courses/3/progress') {
      progressReads += 1
      if (progressReads === 1) {
        return new Promise<Response>((resolve) => {
          releaseFirst = resolve
        })
      }
      return jsonResponse(200, { data: { status: sent.current ? 'not_yet_started' : null } })
    }
    if (method === 'POST' && url === '/api/v1/courses/3/requests') {
      sent.current = true
      return jsonResponse(201, { data: { id: 1, course_id: 3, mentor_id: 8, sent_at: '2026-11-15T08:30:00.000000Z' } })
    }
    return jsonResponse(404, { message: 'Not Found' })
  }))
  render(<App />)

  const card = await mentorsCard()
  fireEvent.click(await within(card).findByRole('button', { name: 'Request' }))

  const bar = await screen.findByRole('img', { name: 'Progress: Not yet started' })
  releaseFirst(jsonResponse(200, { data: { status: null } }))
  await waitFor(() => expect(screen.getByRole('img', { name: 'Progress: Not yet started' }).textContent).toBe('Not yet started'))
  expect(bar.isConnected).toBe(true)
})
