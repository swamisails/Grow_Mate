import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
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

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

it('shows the other person, the Course, and the bar, with no actions', async () => {
  open(() => jsonResponse(200, { data: screenBody }))

  expect(await screen.findByRole('heading', { level: 1, name: 'Python Basics' })).toBeTruthy()
  await waitFor(() => expect(document.title).toBe('Python Basics · GrowMate'))
  const card = screen.getByRole('region', { name: 'Rafi Haddad' })
  expect(within(card).getByText('Python Basics')).toBeTruthy()
  expect(within(card).getByRole('img', { name: 'Progress: In progress' })).toBeTruthy()
  expect(card.querySelector('.progress__fill--in-progress')).toBeTruthy()
  expect(within(screen.getByRole('main')).queryByRole('button')).toBeNull()
  expect(within(screen.getByRole('main')).queryByRole('link')).toBeNull()
  expect(screen.queryByText('Quit Course')).toBeNull()
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
