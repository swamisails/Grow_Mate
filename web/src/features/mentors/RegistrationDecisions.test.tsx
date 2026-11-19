import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RegistrationDecisionRow } from '../../api/types/mentors'
import { App } from '../../app/App'
import { jsonResponse, requests, stubApi, type Handler } from '../../test/api'

const list = '/api/v1/admin/registration-decisions'

const rows: RegistrationDecisionRow[] = [
  { id: 3, employee_name: 'Sam Lindqvist', course_title: 'Python Basics', outcome: null },
  { id: 4, employee_name: 'Sam Lindqvist', course_title: '<b>SQL</b> Fundamentals', outcome: 'refused' },
  { id: 7, employee_name: 'Priya Nair', course_title: 'Git Essentials', outcome: 'approved' },
]

/** Opens the page as Admin; `GET` answers each list in `lists` in turn (the last one repeats). */
async function open(lists: RegistrationDecisionRow[][], routes: Record<string, Handler> = {}) {
  window.history.replaceState(null, '', '/admin/registration-decisions')
  let reads = 0
  const fetchMock = stubApi({
    [`GET ${list}`]: () => jsonResponse(200, { data: lists[Math.min(reads++, lists.length - 1)] }),
    ...routes,
  })
  render(<App />)
  await screen.findByRole('region', { name: 'Registration decisions' })
  return fetchMock
}

function row(name: RegExp) {
  return screen.getByRole('row', { name })
}

async function click(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element)
  })
}

// jsdom has no native dialog implementation; real focus and Escape behavior is checked in Playwright.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

describe('Registration decisions', () => {
  it('lists every row in the API order, as text, with Approve and Refuse or the decision tag', async () => {
    await open([rows])

    expect(document.title).toBe('Registration decisions · GrowMate')
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Employee', 'Course', 'Decision'])
    const bodyRows = within(table).getAllByRole('row').slice(1)
    expect(bodyRows.map((tr) => tr.textContent)).toEqual([
      'Sam LindqvistPython BasicsApproveRefuse',
      'Sam Lindqvist<b>SQL</b> FundamentalsRefused',
      'Priya NairGit EssentialsApproved',
    ])
    expect(table.querySelector('b')).toBeNull()

    const buttons = within(bodyRows[0]).getAllByRole('button')
    expect(buttons.map((button) => [button.textContent, button.className])).toEqual([
      ['Approve', 'button button--secondary'],
      ['Refuse', 'button button--secondary'],
    ])
    expect(within(bodyRows[1]).getByText('Refused').className).toBe('tag')
    expect(within(bodyRows[1]).queryAllByRole('button')).toHaveLength(0)
    expect(within(bodyRows[2]).getByText('Approved').className).toBe('tag')

    const nav = screen.getByRole('navigation')
    expect(within(nav).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Courses', '/admin/courses'],
      ['Registration decisions', '/admin/registration-decisions'],
      ['Group assignment', '/admin/group-assignments'],
      ['Upskilling', '/upskilling'],
    ])
  })

  it('confirms the decision as final, disables the row while it is sent, then shows its tag', async () => {
    let answer: (response: Response) => void = () => undefined
    const fetchMock = await open([rows], {
      [`POST ${list}/3/approve`]: () => new Promise<Response>((resolve) => { answer = resolve }) as unknown as Response,
    })
    const python = row(/Python Basics/)

    await click(within(python).getByRole('button', { name: 'Approve' }))
    const dialog = screen.getByRole('dialog', { name: 'Approve' })
    expect(within(dialog).getByText('This decision is final.')).toBeTruthy()
    expect(within(dialog).getAllByRole('button').map((button) => button.textContent)).toEqual(['Cancel', 'Approve'])
    expect(requests(fetchMock)).not.toContain(`POST ${list}/3/approve`)

    await click(within(dialog).getByRole('button', { name: 'Approve' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(requests(fetchMock)).toContain(`POST ${list}/3/approve`)
    expect(within(python).getAllByRole('button').every((button) => (button as HTMLButtonElement).disabled)).toBe(true)

    await act(async () => {
      answer(jsonResponse(201, { data: { id: 3, outcome: 'approved' } }))
    })
    await waitFor(() => expect(within(python).getByText('Approved').className).toBe('tag'))
    expect(within(python).queryAllByRole('button')).toHaveLength(0)
    // The buttons are gone, so focus moves to the row's Decision cell, not the page body.
    expect(document.activeElement).toBe(within(python).getByText('Approved').closest('td'))
  })

  it('keeps each of two concurrent decisions to its own row, and a 409 on one shows under it only', async () => {
    const both = [
      { id: 3, employee_name: 'Sam Lindqvist', course_title: 'Python Basics', outcome: null },
      { id: 5, employee_name: 'Priya Nair', course_title: 'Git Essentials', outcome: null },
    ]
    const answers: Record<number, (response: Response) => void> = {}
    const deferred = (id: number) => () => new Promise<Response>((resolve) => { answers[id] = resolve }) as unknown as Response
    const fetchMock = await open([both, [{ ...both[0], outcome: 'approved' }, both[1]]], {
      [`POST ${list}/3/approve`]: deferred(3),
      [`POST ${list}/5/refuse`]: deferred(5),
    })
    const python = row(/Python Basics/)
    const git = row(/Git Essentials/)
    const disabled = (tr: HTMLElement) => within(tr).getAllByRole('button').map((button) => (button as HTMLButtonElement).disabled)

    await click(within(python).getByRole('button', { name: 'Approve' }))
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve' }))
    await click(within(git).getByRole('button', { name: 'Refuse' }))
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Refuse' }))
    expect(disabled(python)).toEqual([true, true])
    expect(disabled(git)).toEqual([true, true])

    await act(async () => {
      answers[3](jsonResponse(409, { message: 'This course has already been decided.', code: 'MENTORS_ALREADY_DECIDED' }))
    })
    expect(await within(python).findByText('This course has already been decided.')).toBeTruthy()
    expect(disabled(git)).toEqual([true, true])
    expect(within(git).queryByText('This course has already been decided.')).toBeNull()
    expect(requests(fetchMock).filter((request) => request === `GET ${list}`)).toHaveLength(2)

    await act(async () => {
      answers[5](jsonResponse(201, { data: { id: 5, outcome: 'refused' } }))
    })
    await waitFor(() => expect(within(git).getByText('Refused').className).toBe('tag'))
    expect(within(python).getByText('Approved').className).toBe('tag')
    expect(within(python).getByText('This course has already been decided.')).toBeTruthy()
    expect(within(git).queryByText('This course has already been decided.')).toBeNull()
  })

  it('shows Refused after confirming Refuse', async () => {
    await open([rows], {
      [`POST ${list}/3/refuse`]: () => jsonResponse(201, { data: { id: 3, outcome: 'refused' } }),
    })
    const python = row(/Python Basics/)

    await click(within(python).getByRole('button', { name: 'Refuse' }))
    const dialog = screen.getByRole('dialog', { name: 'Refuse' })
    await click(within(dialog).getByRole('button', { name: 'Refuse' }))

    await waitFor(() => expect(within(python).getByText('Refused').className).toBe('tag'))
  })

  it('sends nothing on Cancel and keeps the buttons', async () => {
    const fetchMock = await open([rows])
    const python = row(/Python Basics/)

    await click(within(python).getByRole('button', { name: 'Refuse' }))
    await click(within(screen.getByRole('dialog', { name: 'Refuse' })).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(requests(fetchMock).filter((request) => request.startsWith('POST'))).toEqual([])
    expect(within(python).getAllByRole('button').map((button) => button.textContent)).toEqual(['Approve', 'Refuse'])
  })

  it('shows a 409 message next to the row, politely, and refetches the list', async () => {
    const decided = rows.map((r) => (r.id === 3 ? { ...r, outcome: 'refused' as const } : r))
    const fetchMock = await open([rows, decided], {
      [`POST ${list}/3/approve`]: () =>
        jsonResponse(409, { message: 'This course has already been decided.', code: 'MENTORS_ALREADY_DECIDED' }),
    })
    const python = row(/Python Basics/)

    await click(within(python).getByRole('button', { name: 'Approve' }))
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve' }))

    const message = await within(python).findByText('This course has already been decided.')
    expect(message.className).toBe('field-error')
    expect(message.getAttribute('aria-live')).toBe('polite')
    await waitFor(() => expect(within(python).getByText('Refused').className).toBe('tag'))
    expect(requests(fetchMock).filter((request) => request === `GET ${list}`)).toHaveLength(2)
    expect(within(row(/Git Essentials/)).queryByText('This course has already been decided.')).toBeNull()
  })

  it('shows "No registration decisions." when there are none', async () => {
    await open([[]])

    expect(await screen.findByText('No registration decisions.')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('shows the generic error when the list fails to load', async () => {
    window.history.replaceState(null, '', '/admin/registration-decisions')
    stubApi({ [`GET ${list}`]: () => jsonResponse(500, { message: 'Server Error' }) })
    render(<App />)

    expect((await screen.findByRole('alert')).textContent).toBe('Something went wrong. Try again.')
    expect(screen.queryByRole('table')).toBeNull()
  })
})
