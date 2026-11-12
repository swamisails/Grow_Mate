import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../app/App'
import { jsonResponse, stubApi } from './testApi'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

describe('Admin Courses', () => {
  it('lists each Course with a title link and its Draft tag, under "+ New Course"', async () => {
    window.history.replaceState(null, '', '/admin/courses')
    stubApi({
      'GET /api/v1/admin/courses': () =>
        jsonResponse(200, {
          data: [
            { id: 2, title: 'SQL Fundamentals', status: 'draft' },
            { id: 1, title: 'Python Basics', status: 'draft' },
          ],
        }),
    })
    render(<App />)

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((row) => row.textContent)).toEqual(['SQL FundamentalsDraft', 'Python BasicsDraft'])
    expect(within(rows[0]).getByRole('link', { name: 'SQL Fundamentals' }).getAttribute('href')).toBe('/admin/courses/2')
    expect(within(rows[0]).getByText('Draft').className).toBe('tag')
    expect(screen.getByRole('link', { name: 'New Course' }).getAttribute('href')).toBe('/admin/courses/new')
  })

  it('shows "No courses yet." and New Course when there are none', async () => {
    window.history.replaceState(null, '', '/admin/courses')
    stubApi({ 'GET /api/v1/admin/courses': () => jsonResponse(200, { data: [] }) })
    render(<App />)

    expect(await screen.findByText('No courses yet.')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByRole('link', { name: 'New Course' })).toBeTruthy()
  })
})
