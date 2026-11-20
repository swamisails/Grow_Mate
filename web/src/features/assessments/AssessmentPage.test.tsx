import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { Assessment } from '../../api/types/assessments'
import { App } from '../../app/App'
import { jsonResponse } from '../../test/api'

const assessment: Assessment = {
  course: { id: 3, title: 'Python Basics' },
  level: 'bronze',
  questions: [
    { id: 11, text: 'What does len([1, 2]) return?', options: [{ id: 101, text: '1' }, { id: 102, text: '2' }] },
    { id: 12, text: 'Which keyword defines a function?', options: [{ id: 103, text: 'def' }, { id: 104, text: 'fun' }, { id: 105, text: '<b>func</b>' }] },
  ],
}

type Handlers = {
  read?: () => Response
  submit?: (body: unknown) => Response
}

/** Opens the Bronze Assessment of Course 3 as Priya. */
function open({ read = () => jsonResponse(200, { data: assessment }), submit = () => jsonResponse(201, { data: { passed: true } }) }: Handlers = {}, path = '/courses/3/stages/bronze') {
  window.history.replaceState(null, '', path)
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 2, name: 'Priya Nair', email: 'priya@example.com', is_admin: false } })
    if (url === '/api/v1/mentor-check') return jsonResponse(200, { data: { pending: false, courses: [] } })
    if (url === '/api/v1/courses/3/stages/bronze/assessment' && method === 'GET') return read()
    if (url === '/api/v1/courses/3/stages/bronze/attempts' && method === 'POST') return submit(init?.body ? JSON.parse(String(init.body)) : undefined)
    if (url === '/api/v1/courses/3') return jsonResponse(200, { data: { id: 3, title: 'Python Basics', description: null } })
    if (url === '/api/v1/courses/3/stages') return jsonResponse(200, { data: [{ level: 'bronze', state: 'passed' }] })
    if (url === '/api/v1/courses/3/mentors') return jsonResponse(200, { data: [] })
    if (url === '/api/v1/courses/3/request-eligibility') return jsonResponse(200, { data: { can_request: false } })
    if (url === '/api/v1/courses/3/progress') return jsonResponse(200, { data: { status: 'in_progress' } })
    return jsonResponse(404, { message: 'Not Found' })
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<App />)
  return fetchMock
}

function posts(fetchMock: ReturnType<typeof open>) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

it('shows every question in order, one radio group each, with no score, counter or timer', async () => {
  open()

  expect(await screen.findByRole('heading', { level: 1, name: 'Python Basics — Bronze' })).toBeTruthy()
  await waitFor(() => expect(document.title).toBe('Python Basics — Bronze · GrowMate'))
  const groups = screen.getAllByRole('group')
  expect(groups.map((group) => group.querySelector('legend')?.textContent)).toEqual([
    '1. What does len([1, 2]) return?',
    '2. Which keyword defines a function?',
  ])
  expect(within(groups[0]).getAllByRole('radio').map((radio) => radio.closest('label')?.textContent)).toEqual(['1', '2'])
  expect(within(groups[1]).getAllByRole('radio').map((radio) => radio.closest('label')?.textContent)).toEqual(['def', 'fun', '<b>func</b>'])
  expect(document.querySelector('main b')).toBeNull()
  expect(screen.queryByText(/of 2|score|%/i)).toBeNull()
})

it('keeps Submit answers disabled until every question is answered', async () => {
  const fetchMock = open()

  const submit = await screen.findByRole('button', { name: 'Submit answers' })
  expect((submit as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('radio', { name: '2' }))
  expect((submit as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(submit)
  fireEvent.click(screen.getByRole('radio', { name: 'def' }))
  expect((submit as HTMLButtonElement).disabled).toBe(false)
  expect(posts(fetchMock)).toHaveLength(0)
})

it('submits the answers once, in question order, and shows "Passed." with the way back', async () => {
  let sent: unknown
  const fetchMock = open({
    submit: (body) => {
      sent = body
      return jsonResponse(201, { data: { passed: true } })
    },
  })

  fireEvent.click(await screen.findByRole('radio', { name: 'fun' }))
  fireEvent.click(screen.getByRole('radio', { name: '2' }))
  const submit = screen.getByRole('button', { name: 'Submit answers' })
  fireEvent.click(submit)
  fireEvent.click(submit)

  const result = await screen.findByRole('status')
  expect(result.textContent).toBe('Passed.')
  expect(document.activeElement).toBe(result)
  expect(sent).toEqual({ answers: [{ question_id: 11, option_id: 102 }, { question_id: 12, option_id: 104 }] })
  expect(posts(fetchMock)).toHaveLength(1)
  expect(screen.queryByRole('group')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Submit answers' })).toBeNull()
  expect(screen.getByRole('heading', { level: 1, name: 'Python Basics — Bronze' })).toBeTruthy()
  expect(window.location.pathname).toBe('/courses/3/stages/bronze')

  // The way back is to the Course, where Bronze now reads Passed.
  const back = screen.getByRole('link', { name: 'Back to Python Basics' })
  expect(back.getAttribute('href')).toBe('/courses/3')
  fireEvent.click(back)
  const card = await screen.findByRole('region', { name: 'Stages' })
  expect(within(card).getByRole('listitem').textContent).toBe('BronzePassed')
})

it('shows "Not passed." when the attempt fails', async () => {
  open({ submit: () => jsonResponse(201, { data: { passed: false } }) })

  fireEvent.click(await screen.findByRole('radio', { name: '1' }))
  fireEvent.click(screen.getByRole('radio', { name: 'fun' }))
  fireEvent.click(screen.getByRole('button', { name: 'Submit answers' }))

  expect((await screen.findByRole('status')).textContent).toBe('Not passed.')
  expect(screen.getByRole('link', { name: 'Back to Python Basics' })).toBeTruthy()
  expect(screen.queryByText('Passed.')).toBeNull()
})

it('shows the API message when the Stage is not available to read', async () => {
  open({ read: () => jsonResponse(409, { message: 'You have already passed this stage.', code: 'ASSESSMENTS_STAGE_ALREADY_PASSED' }) })

  expect(await screen.findByText('You have already passed this stage.')).toBeTruthy()
  const message = screen.getByText('You have already passed this stage.')
  expect(message.getAttribute('aria-live')).toBe('polite')
  expect(message.className).toContain('field-error')
  expect(screen.getByRole('heading', { level: 1, name: 'Assessment' })).toBeTruthy()
  expect(screen.queryByRole('group')).toBeNull()
  expect(screen.getByRole('link', { name: 'Back to the course' }).getAttribute('href')).toBe('/courses/3')
})

it('shows the API message and re-reads when a submit is refused', async () => {
  let reads = 0
  const fetchMock = open({
    read: () => {
      reads++
      return reads === 1
        ? jsonResponse(200, { data: assessment })
        : jsonResponse(409, { message: "This stage isn't open to you.", code: 'ASSESSMENTS_STAGE_UNAVAILABLE' })
    },
    submit: () => jsonResponse(409, { message: "This stage isn't open to you.", code: 'ASSESSMENTS_STAGE_UNAVAILABLE' }),
  })

  fireEvent.click(await screen.findByRole('radio', { name: '2' }))
  fireEvent.click(screen.getByRole('radio', { name: 'def' }))
  fireEvent.click(screen.getByRole('button', { name: 'Submit answers' }))

  expect(await screen.findByText("This stage isn't open to you.")).toBeTruthy()
  await waitFor(() => expect(screen.queryByRole('group')).toBeNull())
  expect(reads).toBe(2)
  expect(posts(fetchMock)).toHaveLength(1)
  expect(screen.queryByRole('status', { name: /Passed/ })).toBeNull()
})

it('clears the refusal when the re-read after a refused submit returns the Stage', async () => {
  let reads = 0
  open({
    read: () => {
      reads++
      return jsonResponse(200, { data: assessment })
    },
    submit: () => jsonResponse(409, { message: "This stage isn't open to you.", code: 'ASSESSMENTS_STAGE_UNAVAILABLE' }),
  })

  fireEvent.click(await screen.findByRole('radio', { name: '2' }))
  fireEvent.click(screen.getByRole('radio', { name: 'def' }))
  fireEvent.click(screen.getByRole('button', { name: 'Submit answers' }))

  await waitFor(() => expect(reads).toBe(2))
  await waitFor(() => expect(screen.queryByText("This stage isn't open to you.")).toBeNull())
  expect(screen.getAllByRole('group')).toHaveLength(2)
  expect((screen.getByRole('button', { name: 'Submit answers' }) as HTMLButtonElement).disabled).toBe(true)
})

it('shows Not found when the Course is a draft or missing', async () => {
  open({ read: () => jsonResponse(404, { message: 'Not found.' }) })

  expect(await screen.findByRole('heading', { level: 1, name: 'Page not found.' })).toBeTruthy()
  expect(screen.queryByRole('group')).toBeNull()
})

it('shows Not found for an unknown Stage or a non-numeric id, without calling the API', async () => {
  for (const path of ['/courses/3/stages/platinum', '/courses/nope/stages/bronze']) {
    const fetchMock = open({}, path)
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found.' })).toBeTruthy()
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/assessment'))).toBe(false)
    cleanup()
  }
})
