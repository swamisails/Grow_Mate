import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Course } from '../../api/types/courses'
import { App } from '../../app/App'
import { jsonResponse, requests, stubApi } from './testApi'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

function course(overrides: Partial<Course> = {}): Course {
  return {
    id: 7,
    title: 'SQL Fundamentals',
    description: 'Queries and joins.',
    status: 'draft',
    can_publish: false,
    stages: [
      {
        id: 1,
        level: 'bronze',
        pass_mark: 60,
        questions: [
          {
            id: 10,
            text: 'Which clause filters rows?',
            options: [
              { id: 100, text: 'WHERE', is_correct: true },
              { id: 101, text: 'ORDER BY', is_correct: false },
            ],
          },
          {
            id: 11,
            text: 'Which keyword removes duplicates?',
            options: [
              { id: 102, text: 'UNIQUE', is_correct: false },
              { id: 103, text: 'DISTINCT', is_correct: true },
            ],
          },
        ],
      },
      { id: 2, level: 'silver', pass_mark: null, questions: [] },
      { id: 3, level: 'gold', pass_mark: null, questions: [] },
    ],
    ...overrides,
  }
}

async function openEditor() {
  window.history.replaceState(null, '', '/admin/courses/7')
  render(<App />)
  return screen.findByRole('heading', { level: 1, name: 'SQL Fundamentals' })
}

function stage(name: string) {
  return screen.getByRole('region', { name })
}

async function save() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  })
}

describe('Course editor', () => {
  it('shows the saved Course: details, then Bronze, Silver and Gold in order', async () => {
    stubApi({ 'GET /api/v1/admin/courses/7': () => jsonResponse(200, { data: course() }) })
    await openEditor()

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Course details',
      'Bronze',
      'Silver',
      'Gold',
    ])
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('SQL Fundamentals')
    const bronze = stage('Bronze')
    expect((within(bronze).getByLabelText('Pass mark (%)') as HTMLInputElement).value).toBe('60')
    const second = within(bronze).getByRole('group', { name: 'Question 2' })
    expect((within(second).getByLabelText('Question') as HTMLTextAreaElement).value).toBe('Which keyword removes duplicates?')
    expect((within(second).getByLabelText('Option 2') as HTMLInputElement).value).toBe('DISTINCT')
    expect((within(second).getByRole('radio', { name: 'Correct, option 2' }) as HTMLInputElement).checked).toBe(true)
    expect((within(second).getByRole('radio', { name: 'Correct, option 1' }) as HTMLInputElement).checked).toBe(false)
    expect(within(stage('Gold')).queryAllByRole('group')).toHaveLength(0)
  })

  it('puts a nested 422 under its control and focuses the first invalid one in form order', async () => {
    stubApi({
      'GET /api/v1/admin/courses/7': () => jsonResponse(200, { data: course() }),
      'PUT /api/v1/admin/courses/7': () =>
        jsonResponse(422, {
          message: 'The pass mark must be a whole number from 1 to 100. (and 2 more errors)',
          errors: {
            'stages.2.pass_mark': ['The pass mark must be a whole number from 1 to 100.'],
            'stages.0.questions.1.options.0.text': ['The option field is required.'],
            'stages.0.questions.1.options': ['Mark exactly one option as correct.'],
          },
        }),
    })
    await openEditor()
    await save()

    const second = within(stage('Bronze')).getByRole('group', { name: 'Question 2' })
    const options = within(second).getByRole('group', { name: 'Options' })
    const groupMessage = within(options).getByText('Mark exactly one option as correct.')
    expect(groupMessage.className).toBe('field-error')
    expect(options.getAttribute('aria-describedby')).toBe(groupMessage.id)

    const optionText = within(options).getByLabelText('Option 1')
    expect(optionText.getAttribute('aria-invalid')).toBe('true')
    expect(optionText.getAttribute('aria-describedby')).toBe(within(options).getByText('The option field is required.').id)
    // Bronze's option comes before Gold's Pass mark in the form.
    expect(document.activeElement).toBe(optionText)

    const goldPassMark = within(stage('Gold')).getByLabelText('Pass mark (%)')
    expect(goldPassMark.getAttribute('aria-invalid')).toBe('true')
    expect(goldPassMark.getAttribute('aria-describedby')).toBe(
      within(stage('Gold')).getByText('The pass mark must be a whole number from 1 to 100.').id,
    )
    expect(within(stage('Silver')).getByLabelText('Pass mark (%)').getAttribute('aria-invalid')).toBeNull()
  })

  it('sends a Pass mark of "1e" as typed and shows the API\'s 422 under that Pass mark', async () => {
    let saved: { stages: { pass_mark: unknown }[] } | null = null
    stubApi({
      'GET /api/v1/admin/courses/7': () => jsonResponse(200, { data: course() }),
      'PUT /api/v1/admin/courses/7': (body) => {
        saved = body as { stages: { pass_mark: unknown }[] }
        return jsonResponse(422, {
          message: 'The pass mark must be a whole number from 1 to 100.',
          errors: { 'stages.1.pass_mark': ['The pass mark must be a whole number from 1 to 100.'] },
        })
      },
    })
    await openEditor()

    const silverPassMark = within(stage('Silver')).getByLabelText('Pass mark (%)') as HTMLInputElement
    expect(silverPassMark.type).toBe('text')
    fireEvent.change(silverPassMark, { target: { value: '1e' } })
    await save()

    expect(saved!.stages.map((s) => s.pass_mark)).toEqual([60, '1e', null])
    expect(silverPassMark.value).toBe('1e')
    expect(silverPassMark.getAttribute('aria-invalid')).toBe('true')
    expect(silverPassMark.getAttribute('aria-describedby')).toBe(
      within(stage('Silver')).getByText('The pass mark must be a whole number from 1 to 100.').id,
    )
    expect(document.activeElement).toBe(silverPassMark)
  })

  it("focuses an options group's first control when the group is the only error", async () => {
    stubApi({
      'GET /api/v1/admin/courses/7': () => jsonResponse(200, { data: course() }),
      'PUT /api/v1/admin/courses/7': () =>
        jsonResponse(422, {
          message: 'A question needs at least 2 options.',
          errors: { 'stages.0.questions.0.options': ['A question needs at least 2 options.'] },
        }),
    })
    await openEditor()
    await save()

    const first = within(stage('Bronze')).getByRole('group', { name: 'Question 1' })
    expect(within(first).getByText('A question needs at least 2 options.')).toBeTruthy()
    expect(document.activeElement).toBe(within(first).getByLabelText('Option 1'))
  })

  it('sends the whole draft, then re-fetches and shows the server state', async () => {
    let saved: unknown = null
    const afterSave = course({ title: 'SQL Fundamentals (server)' })
    const fetchMock = stubApi({
      'GET /api/v1/admin/courses/7': () => jsonResponse(200, { data: saved ? afterSave : course() }),
      'PUT /api/v1/admin/courses/7': (body) => {
        saved = body
        return jsonResponse(200, { data: course() })
      },
    })
    await openEditor()

    // Gold gets a question: add it, fill it and mark option 2 correct.
    const gold = stage('Gold')
    fireEvent.click(within(gold).getByRole('button', { name: 'Add question' }))
    const question = within(gold).getByRole('group', { name: 'Question 1' })
    fireEvent.change(within(question).getByLabelText('Question'), { target: { value: 'A CTE starts with?' } })
    fireEvent.change(within(question).getByLabelText('Option 1'), { target: { value: 'AS' } })
    fireEvent.change(within(question).getByLabelText('Option 2'), { target: { value: 'WITH' } })
    fireEvent.click(within(question).getByRole('radio', { name: 'Correct, option 2' }))
    fireEvent.change(within(gold).getByLabelText('Pass mark (%)'), { target: { value: '90' } })
    // Bronze loses its first question.
    fireEvent.click(within(stage('Bronze')).getByRole('button', { name: 'Remove question 1' }))

    await save()

    expect(saved).toEqual({
      title: 'SQL Fundamentals',
      description: 'Queries and joins.',
      stages: [
        {
          level: 'bronze',
          pass_mark: 60,
          questions: [
            {
              text: 'Which keyword removes duplicates?',
              options: [
                { text: 'UNIQUE', is_correct: false },
                { text: 'DISTINCT', is_correct: true },
              ],
            },
          ],
        },
        { level: 'silver', pass_mark: null, questions: [] },
        {
          level: 'gold',
          pass_mark: 90,
          questions: [
            {
              text: 'A CTE starts with?',
              options: [
                { text: 'AS', is_correct: false },
                { text: 'WITH', is_correct: true },
              ],
            },
          ],
        },
      ],
    })
    expect(requests(fetchMock).filter((request) => request.includes('/admin/courses/7'))).toEqual([
      'GET /api/v1/admin/courses/7',
      'PUT /api/v1/admin/courses/7',
      'GET /api/v1/admin/courses/7',
    ])
    // The re-fetched server state replaces the edits.
    expect(await screen.findByRole('heading', { level: 1, name: 'SQL Fundamentals (server)' })).toBeTruthy()
    expect(within(stage('Bronze')).getAllByRole('group', { name: /^Question/ })).toHaveLength(2)
    expect(within(stage('Gold')).queryAllByRole('group')).toHaveLength(0)
  })

  it('creates a Course from New Course and opens its editor', async () => {
    window.history.replaceState(null, '', '/admin/courses/new')
    let created: unknown = null
    stubApi({
      'POST /api/v1/admin/courses': (body) => {
        created = body
        return jsonResponse(201, { data: course() })
      },
      'GET /api/v1/admin/courses/7': () => jsonResponse(200, { data: course() }),
    })
    render(<App />)

    expect(await screen.findByRole('heading', { level: 1, name: 'New Course' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Bronze' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'SQL Fundamentals' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Queries and joins.' } })
    await save()

    expect(created).toEqual({ title: 'SQL Fundamentals', description: 'Queries and joins.' })
    await waitFor(() => expect(window.location.pathname).toBe('/admin/courses/7'))
    expect(await screen.findByRole('region', { name: 'Gold' })).toBeTruthy()
  })

  it('shows a blank-title refusal under Title on New Course and focuses it', async () => {
    window.history.replaceState(null, '', '/admin/courses/new')
    stubApi({
      'POST /api/v1/admin/courses': () =>
        jsonResponse(422, { message: 'The title field is required.', errors: { title: ['The title field is required.'] } }),
    })
    render(<App />)

    await screen.findByRole('heading', { level: 1, name: 'New Course' })
    await save()

    const title = screen.getByLabelText('Title')
    expect(title.getAttribute('aria-describedby')).toBe(screen.getByText('The title field is required.').id)
    expect(document.activeElement).toBe(title)
    expect(window.location.pathname).toBe('/admin/courses/new')
  })

  it('shows Not found for an unknown Course and for an id that is not a number', async () => {
    const fetchMock = stubApi({})
    window.history.replaceState(null, '', '/admin/courses/999')
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found.' })).toBeTruthy()
    cleanup()

    window.history.replaceState(null, '', '/admin/courses/abc')
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found.' })).toBeTruthy()
    expect(requests(fetchMock)).not.toContain('GET /api/v1/admin/courses/abc')
  })
})

describe('Course publishing', () => {
  // jsdom has no native dialog implementation; real focus and Escape behavior is also checked in Playwright.
  function supportDialog() {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  }

  it('uses API eligibility and disables Publish during unsaved changes until Save refetches', async () => {
    let saved = false
    const fetchMock = stubApi({
      'GET /api/v1/admin/courses/7': () => jsonResponse(200, { data: course({ can_publish: true, title: saved ? 'Changed' : 'SQL Fundamentals' }) }),
      'PUT /api/v1/admin/courses/7': () => { saved = true; return jsonResponse(200, { data: course() }) },
    })
    await openEditor()
    const publish = screen.getByRole('button', { name: 'Publish' }) as HTMLButtonElement
    expect(publish.disabled).toBe(false)
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Changed' } })
    expect(publish.disabled).toBe(true)
    fireEvent.click(publish)
    expect(requests(fetchMock)).not.toContain('POST /api/v1/admin/courses/7/publish')
    await save()
    expect(publish.disabled).toBe(false)
  })

  it('keeps Publish disabled when the API says the saved draft is incomplete', async () => {
    stubApi({ 'GET /api/v1/admin/courses/7': () => jsonResponse(200, { data: course() }) })
    await openEditor()
    expect((screen.getByRole('button', { name: 'Publish' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('cancels without a request and restores focus, then publishes and refetches the frozen editor', async () => {
    supportDialog()
    let published = false
    const fetchMock = stubApi({
      'GET /api/v1/admin/courses/7': () => jsonResponse(200, { data: course({ status: published ? 'published' : 'draft', can_publish: !published }) }),
      'POST /api/v1/admin/courses/7/publish': () => { published = true; return jsonResponse(200, { data: course() }) },
    })
    await openEditor()
    const publish = screen.getByRole('button', { name: 'Publish' })
    publish.focus()
    fireEvent.click(publish)
    const dialog = screen.getByRole('dialog', { name: 'Publish' })
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' })
    expect(document.activeElement).toBe(cancel)
    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Publish' }))
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' })
    expect(document.activeElement).toBe(cancel)
    fireEvent.click(cancel)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(publish)

    // Esc: the browser fires `cancel` on the dialog.
    fireEvent.click(publish)
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(publish)
    expect(published).toBe(false)

    fireEvent.click(publish)
    await act(async () => { fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Publish' })) })
    expect(await screen.findByText('Published')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('radio')).toBeNull()
    // The Publish button is gone, so focus moves to the page title.
    const heading = screen.getByRole('heading', { level: 1 })
    expect(document.activeElement).toBe(heading)
    expect(heading.getAttribute('tabindex')).toBe('-1')
    expect(within(screen.getByRole('region', { name: 'Course details' })).getByText('Queries and joins.')).toBeTruthy()
    expect(requests(fetchMock).filter((request) => request.includes('/admin/courses/7'))).toEqual([
      'GET /api/v1/admin/courses/7', 'POST /api/v1/admin/courses/7/publish', 'GET /api/v1/admin/courses/7',
    ])
  })

  it.each(['Save', 'Publish'])('refetches a %s 409 and shows its API message beside the frozen course', async (action) => {
    supportDialog()
    let refused = false
    stubApi({
      'GET /api/v1/admin/courses/7': () => jsonResponse(200, { data: course({ status: refused ? 'published' : 'draft', can_publish: !refused }) }),
      [`${action === 'Save' ? 'PUT /api/v1/admin/courses/7' : 'POST /api/v1/admin/courses/7/publish'}`]: () => {
        refused = true
        return jsonResponse(409, { message: "Published courses can't be edited.", code: 'COURSES_PUBLISHED' })
      },
    })
    await openEditor()
    if (action === 'Publish') {
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
      await act(async () => { fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Publish' })) })
    } else {
      await save()
    }
    expect(await screen.findByText('Published')).toBeTruthy()
    expect(screen.getByText("Published courses can't be edited.").getAttribute('aria-live')).toBe('polite')
    // Not a Publish made here: the title stays out of focus and unfocusable.
    expect(screen.getByRole('heading', { level: 1 }).hasAttribute('tabindex')).toBe(false)
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
  })
})
