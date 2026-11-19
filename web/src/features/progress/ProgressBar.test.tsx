import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { ProgressBar } from './ProgressBar'

afterEach(cleanup)

it('renders Quit as a full red bar with the word Quit and nothing else', () => {
  const { container } = render(<ProgressBar status="quit" />)

  expect(screen.getByRole('img', { name: 'Progress: Quit' })).toBeTruthy()
  expect(container.querySelector('.progress__fill--quit')).toBeTruthy()
  expect(container.textContent).toBe('Quit')
})
