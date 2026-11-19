import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { UpskillingRow } from '../../api/types/progress'
import { App } from '../../app/App'
import { jsonResponse } from '../../test/api'

const rows: UpskillingRow[] = [
  { person_name: 'Imani Okafor', course_title: 'Python Basics', status: 'in_progress' },
  { person_name: 'Priya Nair', course_title: '<b>SQL</b>', status: 'in_progress' },
]

function open(is_admin: boolean, upskilling: () => Response) {
  window.history.replaceState(null, '', '/upskilling')
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/api/v1/me') return jsonResponse(200, { data: { id: 4, name: 'Sam', email: 'sam@example.com', is_admin } })
    if (url === '/api/v1/mentor-check') return jsonResponse(200, { data: { pending: false, courses: [] } })
    if (url === '/api/v1/upskilling') return upskilling()
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

it.each([false, true])('lists each row in the API order with a bar and its state word, and no controls (admin: %s)', async (isAdmin) => {
  open(isAdmin, () => jsonResponse(200, { data: rows }))

  expect(await screen.findByRole('heading', { level: 1, name: 'Upskilling' })).toBeTruthy()
  await waitFor(() => expect(document.title).toBe('Upskilling · GrowMate'))
  const card = await screen.findByRole('region', { name: 'Upskilling' })
  expect(within(card).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Name', 'Course', 'Status'])
  const body = within(card).getAllByRole('row').slice(1)
  expect(body.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))).toEqual([
    ['Imani Okafor', 'Python Basics', 'In progress'],
    ['Priya Nair', '<b>SQL</b>', 'In progress'],
  ])
  expect(card.querySelector('b')).toBeNull()
  expect(within(card).getAllByRole('img', { name: 'Progress: In progress' })).toHaveLength(2)
  expect(within(card).queryByRole('button')).toBeNull()
  expect(within(card).queryByRole('link')).toBeNull()
  expect(within(card).queryByRole('combobox')).toBeNull()
  expect(within(card).queryByRole('textbox')).toBeNull()
})

it('says "No one is in progress." when the list is empty', async () => {
  open(false, () => jsonResponse(200, { data: [] }))

  const card = await screen.findByRole('region', { name: 'Upskilling' })
  expect(within(card).getByText('No one is in progress.')).toBeTruthy()
  expect(within(card).queryByRole('table')).toBeNull()
})

it('shows the generic error when the list cannot be read', async () => {
  open(false, () => jsonResponse(500, { message: 'Server Error' }))

  expect((await screen.findByRole('alert')).textContent).toBe('Something went wrong. Try again.')
})
