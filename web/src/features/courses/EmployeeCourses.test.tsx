import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../app/App'
import { jsonResponse } from './testApi'

const course = { id: 9, title: 'Python Basics', description: '<script>Variables</script>\nCollections.' }
function open(path: string, status = 200, courses = [course], detail: typeof course | (Omit<typeof course, 'description'> & { description: null }) = course) {
  window.history.replaceState(null, '', path)
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 2, name: 'Priya', email: 'priya@example.com', is_admin: false } })
    if (url === '/api/v1/courses') return jsonResponse(status, { data: courses })
    return jsonResponse(status, { data: detail })
  }))
  render(<App />)
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/') })

it('browses published Courses and opens their descriptions as text', async () => {
  open('/courses')
  fireEvent.click(await screen.findByRole('link', { name: 'Python Basics' }))
  expect(await screen.findByRole('heading', { level: 1, name: 'Python Basics' })).toBeTruthy()
  expect(screen.getByText(/<script>Variables<\/script>/)).toBeTruthy()
  expect(document.querySelector('main script')).toBeNull()
  expect(screen.queryByText('Stages')).toBeNull()
  expect(screen.queryByText('Mentors')).toBeNull()
  await waitFor(() => expect(document.title).toBe('Python Basics · GrowMate'))
})

it('shows no Description card for a Course without a description', async () => {
  open('/courses/9', 200, [], { ...course, description: null })
  expect(await screen.findByRole('heading', { level: 1, name: 'Python Basics' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Description' })).toBeNull()
})

it('shows the empty course list', async () => {
  open('/courses', 200, [])
  expect(await screen.findByText('No courses yet.')).toBeTruthy()
})

it.each([403, 404])('makes a hidden or forbidden course a Not found page (%s)', async (status) => {
  open('/courses/9', status)
  expect(await screen.findByRole('heading', { level: 1, name: 'Page not found.' })).toBeTruthy()
})

it('shows a failure when the course list cannot load', async () => {
  open('/courses', 500)
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Something went wrong. Try again.')
})

it('does not request a nonnumeric Course id', async () => {
  open('/courses/abc')
  await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Page not found.'))
  expect(vi.mocked(fetch).mock.calls).toHaveLength(1)
})
