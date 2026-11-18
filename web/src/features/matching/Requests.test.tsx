import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { IncomingRequest } from '../../api/types/matching'
import { App } from '../../app/App'
import { jsonResponse } from '../../test/api'

const priya: IncomingRequest = { id: 1, learner_name: 'Priya Nair', course_title: 'Python Basics' }
const leo: IncomingRequest = { id: 2, learner_name: 'Leo Martins', course_title: 'Python Basics' }

function open(
  list: () => Response | Promise<Response>,
  accept: () => Response | Promise<Response> = () => jsonResponse(200, { data: {} }),
) {
  window.history.replaceState(null, '', '/requests')
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 5, name: 'Rafi Haddad', email: 'rafi@example.com', is_admin: false } })
    if (url === '/api/v1/mentor-check') return jsonResponse(200, { data: { pending: false, courses: [] } })
    if (method === 'GET' && url === '/api/v1/requests') return list()
    if (method === 'POST' && /\/api\/v1\/requests\/\d+\/accept$/.test(url)) return accept()
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

it('says there are no requests', async () => {
  open(() => jsonResponse(200, { data: [] }))
  expect(await screen.findByText('No requests.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull()
})

it('lists each Request as the one sentence, with Accept', async () => {
  open(() => jsonResponse(200, { data: [priya, leo] }))
  const card = await screen.findByRole('region', { name: 'Requests' })
  expect(await within(card).findByText('Priya Nair requested you to guide them with Python Basics')).toBeTruthy()
  expect(within(card).getByText('Leo Martins requested you to guide them with Python Basics')).toBeTruthy()
  expect(within(card).getAllByRole('button', { name: 'Accept' })).toHaveLength(2)
})

it('disables every Accept button until the refresh finishes, and the accepted Request stays gone', async () => {
  const pending: Array<(response: Response) => void> = []
  const fetchMock = open(
    () =>
      new Promise<Response>((resolve) => {
        pending.push(resolve)
      }),
    () => jsonResponse(201, { data: { id: 9, request_id: 1, started_at: '2026-11-15T09:00:00.000000Z' } }),
  )

  await waitFor(() => expect(pending).toHaveLength(1))
  pending[0](jsonResponse(200, { data: [priya, leo] }))
  const card = await screen.findByRole('region', { name: 'Requests' })
  const accept = await within(card).findAllByRole('button', { name: 'Accept' })
  fireEvent.click(accept[0])
  fireEvent.click(accept[1])

  await waitFor(() => {
    expect(within(card).getAllByRole('button', { name: 'Accept' }).every((button) => (button as HTMLButtonElement).disabled)).toBe(true)
  })
  const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
  expect(posts).toHaveLength(1)
  expect(String(posts[0][0])).toBe('/api/v1/requests/1/accept')

  await waitFor(() => expect(pending).toHaveLength(2))
  pending[1](jsonResponse(200, { data: [leo] }))

  await waitFor(() => expect(within(card).queryByText('Priya Nair requested you to guide them with Python Basics')).toBeNull())
  expect(within(card).getByText('Leo Martins requested you to guide them with Python Basics')).toBeTruthy()
  expect((within(card).getByRole('button', { name: 'Accept' }) as HTMLButtonElement).disabled).toBe(false)
})

it('shows a group assignment as one sentence naming its Learners, with one Accept for its first Request', async () => {
  const group: IncomingRequest = {
    id: 3,
    learner_names: ['Asha Rao', 'Ben Carter', 'Chloe Dubois', 'Dev Patel', 'Elena Ruiz'],
    course_title: 'SQL Fundamentals',
  }
  const fetchMock = open(
    () => jsonResponse(200, { data: [priya, group] }),
    () => jsonResponse(404, { message: 'Not found.' }),
  )
  const card = await screen.findByRole('region', { name: 'Requests' })
  const rows = await within(card).findAllByRole('listitem')
  expect(rows.map((row) => row.textContent)).toEqual([
    'Priya Nair requested you to guide them with Python BasicsAccept',
    'Asha Rao, Ben Carter, Chloe Dubois, Dev Patel and Elena Ruiz requested you to guide them with SQL FundamentalsAccept',
  ])
  expect(within(rows[1]).getAllByRole('button', { name: 'Accept' })).toHaveLength(1)

  fireEvent.click(within(rows[1]).getByRole('button', { name: 'Accept' }))

  expect(await within(card).findByRole('alert')).toHaveProperty('textContent', 'Something went wrong. Try again.')
  const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
  expect(posts.map(([input]) => String(input))).toEqual(['/api/v1/requests/3/accept'])
  expect(within(card).getByText(/^Asha Rao, Ben Carter/)).toBeTruthy()
})

it('joins two names with "and" and one name alone', async () => {
  open(() =>
    jsonResponse(200, {
      data: [
        { id: 4, learner_names: ['Asha Rao', 'Ben Carter'], course_title: 'Git Essentials' },
        { id: 6, learner_names: ['Chloe Dubois'], course_title: 'Algebra' },
      ],
    }),
  )
  const card = await screen.findByRole('region', { name: 'Requests' })
  expect(await within(card).findByText('Asha Rao and Ben Carter requested you to guide them with Git Essentials')).toBeTruthy()
  expect(within(card).getByText('Chloe Dubois requested you to guide them with Algebra')).toBeTruthy()
})
