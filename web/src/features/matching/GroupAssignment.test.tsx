import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Employee } from '../../api/types/accounts'
import type { CourseListItem } from '../../api/types/courses'
import { App } from '../../app/App'
import { jsonResponse, stubApi, type Handler } from '../../test/api'

const assignPath = '/api/v1/admin/group-assignments'

const courses: CourseListItem[] = [
  { id: 1, title: 'SQL Fundamentals', status: 'published' },
  { id: 2, title: 'Draft Course', status: 'draft' },
  { id: 3, title: 'Python Basics', status: 'published' },
]

const employees: Employee[] = [
  { id: 11, name: 'Asha Rao' },
  { id: 12, name: 'Ben Carter' },
  { id: 13, name: 'Imani Okafor' },
]

const created = {
  course_title: 'SQL Fundamentals',
  mentor_name: 'Imani Okafor',
  learner_names: ['Asha Rao', 'Ben Carter'],
  created_at: '2026-11-10T09:00:00.000000Z',
}

/** Opens Group assignment as Admin; `POST` answers `assign(body)`. Returns the fetch mock. */
async function open(assign: Handler = () => jsonResponse(201, { data: created }), routes: Record<string, Handler> = {}) {
  window.history.replaceState(null, '', '/admin/group-assignments')
  const fetchMock = stubApi({
    'GET /api/v1/admin/courses': () => jsonResponse(200, { data: courses }),
    'GET /api/v1/admin/employees': () => jsonResponse(200, { data: employees }),
    [`POST ${assignPath}`]: assign,
    ...routes,
  })
  render(<App />)
  await screen.findByRole('region', { name: 'Assign learners' })
  return fetchMock
}

function posted(fetchMock: Awaited<ReturnType<typeof open>>): unknown[] {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').map(([, init]) => JSON.parse(String(init?.body)))
}

function choose(label: string, option: string) {
  const select = screen.getByLabelText(label) as HTMLSelectElement
  const value = within(select).getByRole('option', { name: option }).getAttribute('value') ?? ''
  fireEvent.change(select, { target: { value } })
}

function assignButton() {
  return screen.getByRole('button', { name: 'Assign' }) as HTMLButtonElement
}

async function assign() {
  await act(async () => {
    fireEvent.click(assignButton())
  })
}

/** Fills the mock-up's form: SQL Fundamentals, Imani, Asha and Ben ticked. */
function fill() {
  choose('Course', 'SQL Fundamentals')
  choose('Chosen Employee', 'Imani Okafor')
  const learners = screen.getByRole('group', { name: 'Learners' })
  fireEvent.click(within(learners).getByRole('checkbox', { name: 'Asha Rao' }))
  fireEvent.click(within(learners).getByRole('checkbox', { name: 'Ben Carter' }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

describe('Group assignment', () => {
  it('sits third in the Admin bar and offers published Courses, every Employee, and Learners without the chosen one', async () => {
    await open()

    expect(document.title).toBe('Group assignment · GrowMate')
    const nav = screen.getByRole('navigation')
    expect(within(nav).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Courses', '/admin/courses'],
      ['Registration decisions', '/admin/registration-decisions'],
      ['Group assignment', '/admin/group-assignments'],
    ])
    expect(within(nav).getByRole('link', { name: 'Group assignment' }).getAttribute('aria-current')).toBe('page')

    const course = screen.getByLabelText('Course')
    expect(within(course).getAllByRole('option').map((option) => option.textContent)).toEqual(['', 'SQL Fundamentals', 'Python Basics'])
    const mentor = screen.getByLabelText('Chosen Employee')
    expect(within(mentor).getAllByRole('option').map((option) => option.textContent)).toEqual(['', 'Asha Rao', 'Ben Carter', 'Imani Okafor'])

    expect(screen.queryByRole('group', { name: 'Learners' })).toBeNull()
    expect(assignButton().disabled).toBe(true)

    choose('Chosen Employee', 'Imani Okafor')
    const learners = screen.getByRole('group', { name: 'Learners' })
    expect(within(learners).getAllByRole('checkbox').map((box) => box.parentElement?.textContent)).toEqual(['Asha Rao', 'Ben Carter'])
    expect(assignButton().disabled).toBe(true)

    fireEvent.click(within(learners).getByRole('checkbox', { name: 'Asha Rao' }))
    expect(assignButton().disabled).toBe(false)
  })

  it('assigns, shows only the assignment just created, and starts the form again', async () => {
    let answer: (response: Response) => void = () => undefined
    const fetchMock = await open(() => new Promise<Response>((resolve) => { answer = resolve }) as unknown as Response)
    fill()

    await assign()
    expect(posted(fetchMock)).toEqual([{ course_id: 1, mentor_id: 13, learner_ids: [11, 12] }])
    expect(assignButton().disabled).toBe(true)
    await assign()
    expect(posted(fetchMock)).toHaveLength(1)

    await act(async () => {
      answer(jsonResponse(201, { data: created }))
    })

    const card = await screen.findByRole('region', { name: 'Assignment created' })
    expect(card.closest('[role="status"]')).not.toBeNull()
    expect(within(card).getAllByRole('term').map((term) => term.textContent)).toEqual(['Course', 'Chosen Employee', 'Learners', 'Created'])
    expect(within(card).getAllByRole('definition').map((value) => value.textContent)).toEqual([
      'SQL Fundamentals',
      'Imani Okafor',
      'Asha RaoBen Carter',
      '10 Nov 2026',
    ])
    expect(within(card).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Asha Rao', 'Ben Carter'])
    expect(card.textContent).not.toMatch(/accept|pending|request|match/i)

    expect((screen.getByLabelText('Course') as HTMLSelectElement).value).toBe('')
    expect((screen.getByLabelText('Chosen Employee') as HTMLSelectElement).value).toBe('')
    expect(screen.queryByRole('group', { name: 'Learners' })).toBeNull()
    expect(assignButton().disabled).toBe(true)
  })

  it('shows a 422 under its field and focuses it', async () => {
    const fetchMock = await open(() =>
      jsonResponse(422, { message: 'Choose a course.', errors: { course_id: ['Choose a course.'], 'learner_ids.1': ['Duplicate.'] } }),
    )
    choose('Chosen Employee', 'Imani Okafor')
    fireEvent.click(within(screen.getByRole('group', { name: 'Learners' })).getByRole('checkbox', { name: 'Asha Rao' }))

    await assign()

    expect(posted(fetchMock)).toEqual([{ course_id: null, mentor_id: 13, learner_ids: [11] }])
    const course = screen.getByLabelText('Course')
    await waitFor(() => expect(document.activeElement).toBe(course))
    expect(course.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(course.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Choose a course.')
    expect(within(screen.getByRole('group', { name: 'Learners' })).getByText('Duplicate.')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Assignment created' })).toBeNull()
    expect((screen.getByLabelText('Chosen Employee') as HTMLSelectElement).value).toBe('13')
  })

  it('shows a 409 next to Assign, keeps the form, and re-reads the choices', async () => {
    const fetchMock = await open(() =>
      jsonResponse(409, { message: "This course isn't published.", code: 'MATCHING_COURSE_NOT_PUBLISHED' }),
    )
    fill()

    await assign()

    expect(await screen.findByText("This course isn't published.")).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Assignment created' })).toBeNull()
    expect((screen.getByLabelText('Course') as HTMLSelectElement).value).toBe('1')
    expect(assignButton().disabled).toBe(false)
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([input]) => String(input) === '/api/v1/admin/courses')).toHaveLength(2),
    )
  })
})
