import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { MentorCheck } from '../../api/types/mentors'
import { App } from '../../app/App'
import { jsonResponse } from '../courses/testApi'

const sam = { id: 12, name: 'Sam Lindqvist', email: 'sam@example.com', is_admin: false }
const courses = [
  { id: 4, title: 'Git Essentials' },
  { id: 3, title: '<b>Python</b> Basics' },
  { id: 9, title: 'SQL Fundamentals' },
]

/**
 * Opens `path` as Sam. `GET /api/v1/mentor-check` answers each status of `checks` in turn (the last
 * one repeats); `POST` answers `submit(body)`. Returns the fetch mock.
 */
function open(path: string, checks: MentorCheck[], submit: (body: unknown) => Response = () => jsonResponse(201, { data: { pending: false, courses: [] } })) {
  window.history.replaceState(null, '', path)
  let reads = 0
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/v1/me') return jsonResponse(200, { data: sam })
    if (url === '/api/v1/mentor-check' && method === 'GET') return jsonResponse(200, { data: checks[Math.min(reads++, checks.length - 1)] })
    if (url === '/api/v1/mentor-check' && method === 'POST') return submit(JSON.parse(String(init?.body)))
    if (url === '/api/v1/courses') return jsonResponse(200, { data: [] })
    return jsonResponse(404, { message: 'Not Found' })
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<App />)
  return fetchMock
}

function posted(fetchMock: ReturnType<typeof open>): unknown[] {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').map(([, init]) => JSON.parse(String(init?.body)))
}

async function click(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }))
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

it('offers a checkbox per Course in the API order, as text, then Submit and Skip', async () => {
  open('/mentor-check', [{ pending: true, courses }])

  const group = await screen.findByRole('group', { name: 'Courses you can mentor' })
  const boxes = within(group).getAllByRole('checkbox')
  expect(boxes.map((box) => box.closest('label')?.textContent)).toEqual(['Git Essentials', '<b>Python</b> Basics', 'SQL Fundamentals'])
  expect(group.querySelector('b')).toBeNull()
  expect(boxes.every((box) => !(box as HTMLInputElement).checked)).toBe(true)

  const buttons = within(screen.getByRole('main')).getAllByRole('button')
  expect(buttons.map((button) => [button.textContent, button.className])).toEqual([
    ['Submit', 'button button--primary'],
    ['Skip', 'button button--secondary'],
  ])
  expect(screen.getByRole('button', { name: 'Submit' })).toHaveProperty('disabled', true)
  expect(screen.getByRole('button', { name: 'Skip' })).toHaveProperty('disabled', false)
})

it('enables Submit only while at least one Course is ticked', async () => {
  open('/mentor-check', [{ pending: true, courses }])
  const git = await screen.findByRole('checkbox', { name: 'Git Essentials' })
  const submit = screen.getByRole('button', { name: 'Submit' })

  fireEvent.click(git)
  expect(submit).toHaveProperty('disabled', false)
  fireEvent.click(git)
  expect(submit).toHaveProperty('disabled', true)
})

it('submits the ticked Courses with no confirmation, goes Home, and never shows the step again', async () => {
  const fetchMock = open('/mentor-check', [{ pending: true, courses }])
  fireEvent.click(await screen.findByRole('checkbox', { name: 'SQL Fundamentals' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Git Essentials' }))

  await click('Submit')

  expect(posted(fetchMock)).toEqual([{ course_ids: [4, 9] }])
  expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeTruthy()
  expect(window.location.pathname).toBe('/home')
  expect(screen.queryByRole('dialog')).toBeNull()

  // The answer said done: the step now goes Home.
  await act(async () => {
    window.history.pushState(null, '', '/mentor-check')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await waitFor(() => expect(window.location.pathname).toBe('/home'))
})

it('skips and goes Home', async () => {
  const fetchMock = open('/mentor-check', [{ pending: true, courses }])
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Git Essentials' }))

  await click('Skip')

  expect(posted(fetchMock)).toEqual([{ skip: true }])
  expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeTruthy()
})

it('shows only Skip when there are no Courses to name', async () => {
  open('/mentor-check', [{ pending: true, courses: [] }])

  expect(await screen.findByRole('heading', { level: 1, name: 'Mentor check' })).toBeTruthy()
  expect(within(screen.getByRole('main')).getAllByRole('button').map((button) => button.textContent)).toEqual(['Skip'])
  expect(screen.queryByRole('checkbox')).toBeNull()
  expect(screen.queryByRole('group')).toBeNull()
})

it('disables both buttons while the call is in flight', async () => {
  let answer: (response: Response) => void = () => {}
  open('/mentor-check', [{ pending: true, courses }], () => new Promise<Response>((resolve) => (answer = resolve)) as unknown as Response)
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Git Essentials' }))

  await click('Submit')

  expect(screen.getByRole('button', { name: 'Submit' })).toHaveProperty('disabled', true)
  expect(screen.getByRole('button', { name: 'Skip' })).toHaveProperty('disabled', true)
  await act(async () => answer(jsonResponse(201, { data: { pending: false, courses: [] } })))
  expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeTruthy()
})

it('shows a 409 message as the API gives it, and refetches the Courses', async () => {
  const fewer = courses.filter((course) => course.id !== 9)
  const fetchMock = open('/mentor-check', [{ pending: true, courses }, { pending: true, courses: fewer }], () =>
    jsonResponse(409, { message: "One or more of these courses can't be named.", code: 'MENTORS_COURSE_NOT_ELIGIBLE' }),
  )
  fireEvent.click(await screen.findByRole('checkbox', { name: 'SQL Fundamentals' }))

  await click('Submit')

  const message = await screen.findByText("One or more of these courses can't be named.")
  expect(message.className).toBe('field-error')
  expect(message.getAttribute('aria-live')).toBe('polite')
  await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'SQL Fundamentals' })).toBeNull())
  expect(fetchMock.mock.calls.filter(([input, init]) => String(input) === '/api/v1/mentor-check' && init?.method === 'GET')).toHaveLength(2)
  // The dropped Course no longer counts as ticked.
  expect(screen.getByRole('button', { name: 'Submit' })).toHaveProperty('disabled', true)
  expect(window.location.pathname).toBe('/mentor-check')
})

it('goes Home when a 409 shows the check was already done elsewhere', async () => {
  open('/mentor-check', [{ pending: true, courses }, { pending: false, courses: [] }], () =>
    jsonResponse(409, { message: "You've already done the Mentor check.", code: 'MENTORS_CHECK_DONE' }),
  )
  await screen.findByRole('heading', { level: 1, name: 'Mentor check' })

  await click('Skip')

  expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeTruthy()
  expect(window.location.pathname).toBe('/home')
})

it('shows the generic error when the call fails otherwise, and stays on the step', async () => {
  open('/mentor-check', [{ pending: true, courses }], () => new Response('oops', { status: 500 }))
  await screen.findByRole('heading', { level: 1, name: 'Mentor check' })

  await click('Skip')

  expect(await screen.findByText('Something went wrong. Try again.')).toBeTruthy()
  expect(window.location.pathname).toBe('/mentor-check')
  expect(screen.getByRole('button', { name: 'Skip' })).toHaveProperty('disabled', false)
})
