// Light and dark mode (EXPERIENCE.md, Interaction Primitives). The first visit follows
// `prefers-color-scheme`; a click stores the choice under THEME_KEY, the only localStorage key
// the SPA writes (nothing auth-related, AD-9). index.html applies it before first paint.

import { useCallback, useState } from 'react'

export type Theme = 'light' | 'dark'

/** Keep in step with the pre-paint script in index.html. */
export const THEME_KEY = 'growmate-theme'

/** The theme `<html data-theme>` carries now (set before first paint by index.html). */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

/** Remembers the choice; when storage is unavailable the toggle still works for this page view. */
export function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Private mode or blocked storage: nothing to remember the choice in.
  }
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  const toggle = useCallback(() => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    storeTheme(next)
    setTheme(next)
  }, [])

  return { theme, toggle }
}
