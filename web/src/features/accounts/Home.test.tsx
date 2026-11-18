import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { HomeScreen } from '../../api/types/matching'
import { App } from '../../app/App'
import { jsonResponse } from '../../test/api'

const empty: HomeScreen = { learning: [], mentoring: [] }

function open(home: HomeScreen | 'error') {
  window.history.replaceState(null, '', '/home')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 2, name: 'Priya Nair', email: 'priya@example.com', is_admin: false } })
      if (url === '/api/v1/mentor-check') return jsonResponse(200, { data: { pending: false, courses: [] } })
      if (url === '/api/v1/registration-decisions') return jsonResponse(200, { data: { named: false, approved: [], refused: [] } })
      if (url === '/api/v1/home') {
        return home === 'error' ? jsonResponse(500, { message: 'Server Error' }) : jsonResponse(200, { data: home })
      }
      return jsonResponse(404, { message: 'Not Found' })
    }),
  )
  render(<App />)
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

it('keeps the empty Learning sentence and omits Mentoring when both lists are empty', async () => {
  open(empty)

  const learning = await screen.findByRole('region', { name: 'Learning' })
  expect(await within(learning).findByText("You aren't learning a course yet.")).toBeTruthy()
  expect(within(learning).getByRole('link', { name: 'Courses' }).getAttribute('href')).toBe('/courses')
  expect(screen.queryByRole('region', { name: 'Mentoring' })).toBeNull()
})

it('links a not-yet-started Course to the Course page with a grey bar', async () => {
  open({
    learning: [{ course_id: 3, course_title: 'Python Basics', status: 'not_yet_started', match_id: null }],
    mentoring: [],
  })

  const learning = await screen.findByRole('region', { name: 'Learning' })
  const row = await within(learning).findByRole('listitem')
  expect(within(row).getByRole('link', { name: 'Python Basics' }).getAttribute('href')).toBe('/courses/3')
  expect(within(row).getByRole('img', { name: 'Progress: Not yet started' })).toBeTruthy()
  expect(row.querySelector('.progress__fill--not-yet-started')).toBeTruthy()
  expect(screen.queryByRole('region', { name: 'Mentoring' })).toBeNull()
  expect(within(learning).queryByRole('button')).toBeNull()
})

it('links an in-progress Course to the Match and lists Mentoring for the mentor', async () => {
  open({
    learning: [{ course_id: 3, course_title: 'Python Basics', status: 'in_progress', match_id: 9 }],
    mentoring: [{ id: 9, person_name: 'Priya Nair', course_title: 'Python Basics' }],
  })

  const learning = await screen.findByRole('region', { name: 'Learning' })
  const link = await within(learning).findByRole('link', { name: 'Python Basics' })
  expect(link.getAttribute('href')).toBe('/matches/9')
  expect(within(learning).getByRole('img', { name: 'Progress: In progress' })).toBeTruthy()
  expect(learning.querySelector('.progress__fill--in-progress')).toBeTruthy()

  const mentoring = screen.getByRole('region', { name: 'Mentoring' })
  expect(within(mentoring).getByRole('link', { name: 'Priya Nair — Python Basics' }).getAttribute('href')).toBe('/matches/9')
  expect(within(mentoring).queryByRole('button')).toBeNull()
})

it('says something went wrong when Home cannot be read, and still omits Mentoring', async () => {
  open('error')

  expect((await screen.findByRole('alert')).textContent).toBe('Something went wrong. Try again.')
  expect(screen.queryByRole('region', { name: 'Mentoring' })).toBeNull()
  expect(screen.queryByText("You aren't learning a course yet.")).toBeNull()
})
