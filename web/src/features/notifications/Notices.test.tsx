import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { Notice } from '../../api/types/notifications'
import { App } from '../../app/App'
import { jsonResponse } from '../../test/api'

/** Opens Notices as Sam, answering the notice list with `notices()`. */
function open(notices: () => Response | Promise<Response>) {
  window.history.replaceState(null, '', '/notices')
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 4, name: 'Sam Lindqvist', email: 'sam@example.com', is_admin: false } })
    if (url === '/api/v1/mentor-check') return jsonResponse(200, { data: { pending: false, courses: [] } })
    if (url === '/api/v1/notices') return notices()
    return jsonResponse(404, { message: 'Not Found' })
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<App />)
  return fetchMock
}

function notice(id: string, occurredAt: string, courseTitle: string, outcome: 'approved' | 'refused'): Notice {
  return { id, type: 'registration_decision', occurred_at: occurredAt, course_title: courseTitle, outcome }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

it('lists each notice in the API order as its sentence, then its UTC date, as text', async () => {
  open(() =>
    jsonResponse(200, {
      data: [
        notice('0193b0c2-0002-7000-8000-000000000002', '2026-11-16T23:59:59Z', '<b>SQL</b> Fundamentals', 'refused'),
        notice('0193b0c2-0001-7000-8000-000000000001', '2026-09-03T00:00:00Z', 'Python Basics', 'approved'),
      ],
    }),
  )

  expect(await screen.findByRole('heading', { level: 1, name: 'Notices' })).toBeTruthy()
  await waitFor(() => expect(document.title).toBe('Notices · GrowMate'))
  const card = await screen.findByRole('region', { name: 'Notices' })
  const rows = within(card).getAllByRole('listitem')
  expect(rows.map((row) => [...row.querySelectorAll('p')].map((line) => [line.textContent, line.className]))).toEqual([
    [
      ["You weren't approved to mentor <b>SQL</b> Fundamentals.", 'notice-row__sentence'],
      ['16 Nov 2026', 'meta'],
    ],
    [
      ['You can now mentor Python Basics.', 'notice-row__sentence'],
      ['3 Sep 2026', 'meta'],
    ],
  ])
  expect(rows[0].querySelector('time')?.getAttribute('dateTime')).toBe('2026-11-16T23:59:59Z')
  expect(card.querySelector('b')).toBeNull()
  // No actions, links, icons or read state on a notice.
  expect(within(card).queryByRole('button')).toBeNull()
  expect(within(card).queryByRole('link')).toBeNull()
  expect(card.querySelector('svg')).toBeNull()
  expect(document.querySelectorAll('main .card')).toHaveLength(1)
  // The Notices link is the current page.
  expect(within(screen.getByRole('navigation')).getByRole('link', { name: 'Notices' }).getAttribute('aria-current')).toBe('page')
})

it('picks the day-3 and day-6 sentence from the type and the party, as text', async () => {
  open(() =>
    jsonResponse(200, {
      data: [
        { id: 'request_cancelled_day6:4', type: 'request_cancelled_day6', occurred_at: '2026-11-21T00:00:00Z', party: 'learner', person_name: '<b>Rafi</b>', course_title: 'Python Basics' },
        { id: 'request_cancelled_day6:4m', type: 'request_cancelled_day6', occurred_at: '2026-11-21T00:00:00Z', party: 'mentor', person_name: 'Priya Nair', course_title: '<i>Python</i>' },
        { id: 'request_reminder_day3:4', type: 'request_reminder_day3', occurred_at: '2026-11-18T00:00:00Z', party: 'learner', person_name: 'Rafi Haddad', course_title: 'Python Basics' },
        { id: 'request_reminder_day3:4m', type: 'request_reminder_day3', occurred_at: '2026-11-18T00:00:00Z', party: 'mentor', person_name: 'Priya Nair', course_title: 'Python Basics' },
      ],
    }),
  )

  const card = await screen.findByRole('region', { name: 'Notices' })
  const rows = within(card).getAllByRole('listitem')
  expect(rows.map((row) => row.querySelector('.notice-row__sentence')?.textContent)).toEqual([
    'Your request to <b>Rafi</b> for Python Basics was cancelled. You can request a mentor again.',
    "Priya Nair's request for <i>Python</i> was cancelled.",
    'Your request to Rafi Haddad for Python Basics is still waiting.',
    'Reminder: Priya Nair requested you to guide them with Python Basics.',
  ])
  expect(card.querySelector('b')).toBeNull()
  expect(card.querySelector('i')).toBeNull()
})

it('shows the request and accept sentences from the stored name and title, as text', async () => {
  open(() =>
    jsonResponse(200, {
      data: [
        {
          id: '0193b0c2-0002-7000-8000-000000000002',
          type: 'request_accepted',
          occurred_at: '2026-11-15T09:00:00Z',
          person_name: 'Rafi Haddad',
          course_title: 'Python Basics',
          route: 'gold_pass',
          group_assignment_id: 9,
        },
        {
          id: '0193b0c2-0001-7000-8000-000000000001',
          type: 'request_sent',
          occurred_at: '2026-11-15T08:30:00Z',
          person_name: '<b>Priya</b> Nair',
          course_title: '<i>Python</i> Basics',
        },
      ],
    }),
  )

  const card = await screen.findByRole('region', { name: 'Notices' })
  const rows = within(card).getAllByRole('listitem')
  expect(rows.map((row) => row.querySelector('.notice-row__sentence')?.textContent)).toEqual([
    'Rafi Haddad is your mentor for Python Basics.',
    '<b>Priya</b> Nair requested you to guide them with <i>Python</i> Basics',
  ])
  expect(card.querySelector('b')).toBeNull()
  expect(card.querySelector('i')).toBeNull()
  expect(card.textContent).not.toContain('gold_pass')
  expect(card.textContent).not.toContain('group_assignment_id')
})

it('shows the empty state when there are no notices', async () => {
  open(() => jsonResponse(200, { data: [] }))
  const card = await screen.findByRole('region', { name: 'Notices' })
  expect(within(card).getByText('No notices.').className).toBe('card__empty')
  expect(within(card).queryByRole('list')).toBeNull()
})

it('shows Loading until the list arrives', async () => {
  let answer: (response: Response) => void = () => {}
  open(() => new Promise<Response>((resolve) => { answer = resolve }))
  expect(await screen.findByRole('heading', { level: 1, name: 'Notices' })).toBeTruthy()
  expect((await screen.findByRole('status')).textContent).toBe('Loading…')
  answer(jsonResponse(200, { data: [notice('0193b0c2-0001-7000-8000-000000000001', '2026-11-16T10:00:00Z', 'Python Basics', 'approved')] }))
  expect(await screen.findByText('You can now mentor Python Basics.')).toBeTruthy()
  expect(screen.queryByRole('status')).toBeNull()
})

it('shows the generic error when the list cannot load', async () => {
  open(() => jsonResponse(500, { message: 'Server Error' }))
  expect((await screen.findByRole('alert')).textContent).toBe('Something went wrong. Try again.')
  expect(screen.queryByRole('region', { name: 'Notices' })).toBeNull()
})
