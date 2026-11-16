import type { Page } from '@playwright/test'

/**
 * Freezes API time at one UTC instant. The next request uses it.
 * A jump past the session lifetime expires the cookie, so this signs the page out.
 * Sign in again afterwards. Exists only when APP_ENV is e2e.
 */
export async function setClock(page: Page, instant: string): Promise<unknown> {
  // No SPA session: a forward jump makes the old cookie fail CSRF, and the clock route is public.
  await page.goto('about:blank')
  await page.context().clearCookies()
  const response = await page.request.post('/api/v1/testing/clock', {
    data: { now: instant },
    headers: { Accept: 'application/json' },
  })
  const body: unknown = await response.json()
  if (response.status() !== 200) {
    throw new Error(`setClock failed (${response.status()}): ${JSON.stringify(body)}`)
  }
  await page.context().clearCookies()

  return body
}

/** Drops the frozen instant. The next request uses real time, which keeps moving. */
export async function clearClock(page: Page): Promise<void> {
  await page.goto('about:blank')
  await page.context().clearCookies()
  const response = await page.request.delete('/api/v1/testing/clock', {
    headers: { Accept: 'application/json' },
  })
  if (response.status() !== 200) {
    const body: unknown = await response.json()
    throw new Error(`clearClock failed (${response.status()}): ${JSON.stringify(body)}`)
  }
  await page.context().clearCookies()
}
