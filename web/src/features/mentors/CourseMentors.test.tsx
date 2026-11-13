import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../app/App'
import { jsonResponse } from '../courses/testApi'

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
