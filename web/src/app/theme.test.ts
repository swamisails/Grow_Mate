import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_KEY } from './theme'
import { ThemeToggle } from './ThemeToggle'

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.dataset.theme = 'light'
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ThemeToggle', () => {
  it('switches at once and remembers the choice', () => {
    render(createElement(ThemeToggle))

    act(() => fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' })))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark')

    act(() => fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' })))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem(THEME_KEY)).toBe('light')
  })

  it('starts from the theme already on <html>', () => {
    document.documentElement.dataset.theme = 'dark'
    render(createElement(ThemeToggle))
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy()
  })

  it('still switches when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    render(createElement(ThemeToggle))

    act(() => fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' })))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy()
  })
})
