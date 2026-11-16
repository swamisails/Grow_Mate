import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { EmployeeRegistrationDecisions } from '../../api/types/mentors'
import { App } from '../../app/App'
import { jsonResponse } from '../../test/api'

/** Opens Home as Sam, answering his Registration decisions with `decisions()`. */
function open(decisions: () => Response | Promise<Response>) {
  window.history.replaceState(null, '', '/home')
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 4, name: 'Sam Lindqvist', email: 'sam@example.com', is_admin: false } })
    if (url === '/api/v1/mentor-check') return jsonResponse(200, { data: { pending: false, courses: [] } })
    if (url === '/api/v1/registration-decisions') return decisions()
    return jsonResponse(404, { message: 'Not Found' })
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<App />)
  return fetchMock
}

function answer(data: EmployeeRegistrationDecisions) {
  return () => jsonResponse(200, { data })
}

/** Each list under its heading, as [heading, row texts or the empty line]. */
function lists(card: HTMLElement) {
  return within(card)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => {
      const list = heading.closest('section') as HTMLElement
      const rows = within(list).queryAllByRole('listitem').map((row) => row.textContent)
      return [heading.textContent, rows.length > 0 ? rows : list.querySelector('p.meta')?.textContent]
    })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

it('shows the approved and refused Courses as two separate lists beside Learning, as text', async () => {
  const fetchMock = open(
    answer({
      named: true,
      approved: [{ id: 3, title: 'Git Essentials' }, { id: 1, title: 'Python Basics' }],
      refused: [{ id: 2, title: '<b>SQL</b> Fundamentals' }],
    }),
  )

  const card = await screen.findByRole('region', { name: 'Mentor check' })
  expect(lists(card)).toEqual([
    ['Approved', ['Git Essentials', 'Python Basics']],
    ['Refused', ['<b>SQL</b> Fundamentals']],
  ])
  expect(within(card).getByRole('region', { name: 'Approved' })).toBeTruthy()
  expect(within(card).getByRole('region', { name: 'Refused' })).toBeTruthy()
  expect(card.querySelector('b')).toBeNull()
  // No route, date, comment, link or action.
  expect(within(card).queryByRole('link')).toBeNull()
  expect(within(card).queryByRole('button')).toBeNull()
  expect(card.textContent).not.toMatch(/route|\d{4}/i)
  // Both cards sit in Home's two-column grid.
  expect(card.parentElement?.className).toBe('card-grid')
  expect(screen.getByRole('region', { name: 'Learning' }).parentElement).toBe(card.parentElement)
  expect(fetchMock.mock.calls.map(([input]) => String(input))).toContain('/api/v1/registration-decisions')
})

it('shows both headings with "None." when nothing is decided yet', async () => {
  open(answer({ named: true, approved: [], refused: [] }))

  const card = await screen.findByRole('region', { name: 'Mentor check' })
  expect(lists(card)).toEqual([
    ['Approved', 'None.'],
    ['Refused', 'None.'],
  ])
  expect(within(card).queryByRole('list')).toBeNull()
})

it('shows "None." under the one empty list', async () => {
  open(answer({ named: true, approved: [], refused: [{ id: 2, title: 'SQL Fundamentals' }] }))

  const card = await screen.findByRole('region', { name: 'Mentor check' })
  expect(lists(card)).toEqual([
    ['Approved', 'None.'],
    ['Refused', ['SQL Fundamentals']],
  ])
})

it('hides the card when the Mentor check named nothing', async () => {
  const fetchMock = open(answer({ named: false, approved: [], refused: [] }))

  expect(await screen.findByRole('region', { name: 'Learning' })).toBeTruthy()
  await waitFor(() => expect(fetchMock.mock.calls.map(([input]) => String(input))).toContain('/api/v1/registration-decisions'))
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(screen.queryByRole('region', { name: 'Mentor check' })).toBeNull()
  expect(screen.queryByText('Approved')).toBeNull()
})

it('renders nothing while loading or after a failed read, and keeps Learning', async () => {
  let reply: (response: Response) => void = () => {}
  open(() => new Promise<Response>((resolve) => { reply = resolve }))

  expect(await screen.findByRole('region', { name: 'Learning' })).toBeTruthy()
  expect(screen.queryByRole('region', { name: 'Mentor check' })).toBeNull()
  expect(screen.queryByRole('status')).toBeNull()

  reply(jsonResponse(500, { message: 'Server Error' }))
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(screen.queryByRole('region', { name: 'Mentor check' })).toBeNull()
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByText("You aren't learning a course yet.")).toBeTruthy()
})
