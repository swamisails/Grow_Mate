import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { StageState } from '../../api/types/assessments'
import { App } from '../../app/App'
import { jsonResponse } from '../../test/api'

const course = { id: 3, title: 'Python Basics', description: 'Variables and functions.' }

/** Opens the Course page as Priya, answering the Stages list with `stages()`. */
function open(stages: () => Response) {
  window.history.replaceState(null, '', '/courses/3')
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 2, name: 'Priya Nair', email: 'priya@example.com', is_admin: false } })
    if (url === '/api/v1/mentor-check') return jsonResponse(200, { data: { pending: false, courses: [] } })
    if (url === '/api/v1/courses/3') return jsonResponse(200, { data: course })
    if (url === '/api/v1/courses/3/mentors') return jsonResponse(200, { data: [{ id: 5, name: 'Rafi Haddad' }] })
    if (url === '/api/v1/courses/3/request-eligibility') return jsonResponse(200, { data: { can_request: false } })
    if (url === '/api/v1/courses/3/progress') return jsonResponse(200, { data: { status: 'in_progress' } })
    if (url === '/api/v1/courses/3/stages') return stages()
    return jsonResponse(404, { message: 'Not Found' })
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<App />)
  return fetchMock
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

it('shows no Stages card before Course Completed', async () => {
  const fetchMock = open(() => jsonResponse(200, { data: [] }))

  await screen.findByRole('region', { name: 'Mentors' })
  await waitFor(() => expect(fetchMock.mock.calls.map(([input]) => String(input))).toContain('/api/v1/courses/3/stages'))
  expect(screen.queryByRole('region', { name: 'Stages' })).toBeNull()
  expect(screen.queryByText(/Take /)).toBeNull()
})

it('shows Bronze with Take Bronze, and no Silver or Gold, when Bronze is available', async () => {
  const stages: StageState[] = [{ level: 'bronze', state: 'available' }]
  open(() => jsonResponse(200, { data: stages }))

  const card = await screen.findByRole('region', { name: 'Stages' })
  const rows = within(card).getAllByRole('listitem')
  expect(rows).toHaveLength(1)
  expect(within(rows[0]).getByText('Bronze')).toBeTruthy()
  const take = within(rows[0]).getByRole('link', { name: 'Take Bronze' })
  expect(take.getAttribute('href')).toBe('/courses/3/stages/bronze')
  expect(take.className).toBe('button button--primary')
  expect(within(card).queryByText(/Silver|Gold/)).toBeNull()
  // The card sits in the page's grid, between Description and Mentors.
  const grid = card.parentElement
  expect(grid?.className).toBe('card-grid')
  expect(Array.from(grid?.children ?? []).map((child) => child.querySelector('h2')?.textContent)).toEqual(['Description', 'Stages', 'Mentors'])
})

it('shows Passed in plain text, with no button, once Bronze is passed', async () => {
  open(() => jsonResponse(200, { data: [{ level: 'bronze', state: 'passed' }] }))

  const card = await screen.findByRole('region', { name: 'Stages' })
  const row = within(card).getByRole('listitem')
  expect(row.textContent).toBe('BronzePassed')
  expect(within(card).queryByRole('link')).toBeNull()
  expect(within(card).queryByRole('button')).toBeNull()
})

it('shows "Locked until [UTC date]", with no button and no attempt count, when Bronze is Locked', async () => {
  const stages: StageState[] = [{ level: 'bronze', state: 'locked', locked_until: '2027-02-28T10:00:00Z' }]
  open(() => jsonResponse(200, { data: stages }))

  const card = await screen.findByRole('region', { name: 'Stages' })
  const row = within(card).getByRole('listitem')
  expect(row.textContent).toBe('BronzeLocked until 28 Feb 2027')
  expect(within(row).getByText('Locked until 28 Feb 2027').className).toBe('meta')
  expect(within(card).queryByRole('link')).toBeNull()
  expect(within(card).queryByRole('button')).toBeNull()
  expect(within(card).queryByText(/attempt|left|Take /i)).toBeNull()
})

it('shows the UTC calendar date of the Lock end, not the local one', async () => {
  open(() => jsonResponse(200, { data: [{ level: 'bronze', state: 'locked', locked_until: '2027-02-10T23:30:00Z' }] }))

  const card = await screen.findByRole('region', { name: 'Stages' })
  expect(within(card).getByRole('listitem').textContent).toBe('BronzeLocked until 10 Feb 2027')
})

it('renders only the Stages the API reports, in its order', async () => {
  open(() =>
    jsonResponse(200, {
      data: [
        { level: 'bronze', state: 'passed' },
        { level: 'silver', state: 'available' },
      ],
    }),
  )

  const card = await screen.findByRole('region', { name: 'Stages' })
  expect(within(card).getAllByRole('listitem').map((row) => row.textContent)).toEqual(['BronzePassed', 'SilverTake Silver'])
})

it('shows no Stages card, and keeps the page, when the Stages read fails', async () => {
  const fetchMock = open(() => jsonResponse(500, { message: 'Server Error' }))

  await screen.findByRole('region', { name: 'Mentors' })
  await waitFor(() => expect(fetchMock.mock.calls.map(([input]) => String(input))).toContain('/api/v1/courses/3/stages'))
  expect(screen.queryByRole('region', { name: 'Stages' })).toBeNull()
  expect(screen.getByRole('heading', { level: 1, name: 'Python Basics' })).toBeTruthy()
})
