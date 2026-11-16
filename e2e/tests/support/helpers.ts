import { expect, type Browser, type Locator, type Page } from '@playwright/test'

// Helpers shared by the specs. Not a spec itself: Playwright collects only `*.spec.ts` under tests/.

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} must be set (it comes from the root .env through docker-compose.e2e.yml)`)
  }
  return value
}

/** The seeded Admin. */
export const admin = {
  name: requiredEnv('ADMIN_NAME'),
  email: requiredEnv('ADMIN_EMAIL'),
  password: requiredEnv('ADMIN_PASSWORD'),
}

/** The password every Employee a spec signs up uses. */
export const employeePassword = 'employee-password'

/**
 * A fresh Employee per test: run.sh resets the database per run, and each test needs its own email.
 * The name is `<first> <label>`, or `<first> <id>` with `nameWithId`, so the name alone finds the
 * Employee's rows in a shared list.
 */
export function newEmployee(label: string, { first = 'Sam', nameWithId = false } = {}) {
  const id = `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  return { id, name: `${first} ${nameWithId ? id : label}`, email: `${first.toLowerCase()}-${id}@example.com` }
}

/** Fills and sends Sign up; opens it first unless `goto` is false. */
export async function signUp(page: Page, employee: { name: string; email: string }, { goto = true } = {}) {
  if (goto) {
    await page.goto('/sign-up')
  }
  await page.getByLabel('Name').fill(employee.name)
  await page.getByLabel('Email').fill(employee.email)
  await page.getByLabel('Password').fill(employeePassword)
  await page.getByRole('button', { name: 'Sign up' }).click()
}

/**
 * Fills and sends Sign in; opens it first unless `goto` is false. With `url`, waits until the page
 * lands there.
 */
export async function signIn(
  page: Page,
  email: string,
  secret = employeePassword,
  { goto = true, url }: { goto?: boolean; url?: RegExp } = {},
) {
  if (goto) {
    await page.goto('/sign-in')
  }
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(secret)
  await page.getByRole('button', { name: 'Sign in' }).click()
  if (url) {
    await expect(page).toHaveURL(url)
  }
}

/** Sign out from the top bar, back on Sign in. */
export async function signOut(page: Page) {
  await page.getByRole('banner').getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
}

/** Admin signs in and lands on Admin Courses. */
export async function adminSignIn(page: Page) {
  await signIn(page, admin.email, admin.password, { url: /\/admin\/courses$/ })
}

/** A same-origin JSON call from the page, carrying its session and XSRF token. */
export async function apiRequest(page: Page, method: 'GET' | 'PUT' | 'POST', path: string, body?: unknown) {
  return page.evaluate(async ({ method, path, body }) => {
    const token = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length)
    const response = await fetch(path, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(token ?? '') },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    return { status: response.status, body: await response.json() }
  }, { method, path, body })
}

/** A new page in its own browser context, so its session doesn't replace another page's. */
export async function newPage(browser: Browser) {
  const context = await browser.newContext()
  return { page: await context.newPage(), close: () => context.close() }
}

/** Admin creates and publishes a complete Course through the API; resolves to its id. */
export async function publishCourse(adminPage: Page, title: string): Promise<number> {
  const id: number = (await apiRequest(adminPage, 'POST', '/api/v1/admin/courses', { title, description: null })).body.data.id
  const document = {
    title, description: null,
    stages: ['bronze', 'silver', 'gold'].map((level) => ({
      level, pass_mark: 70, questions: [{ text: 'Question?', options: [{ text: 'Yes', is_correct: true }, { text: 'No', is_correct: false }] }],
    })),
  }
  expect((await apiRequest(adminPage, 'PUT', `/api/v1/admin/courses/${id}`, document)).status).toBe(200)
  expect((await apiRequest(adminPage, 'POST', `/api/v1/admin/courses/${id}/publish`, {})).status).toBe(200)
  return id
}

/** Waits for the SPA's own read of the Employee's Registration decisions. */
export function decisionsRead(page: Page) {
  return page.waitForResponse(
    (response) => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/registration-decisions',
  )
}

/**
 * Admin decides one Registration decisions row: the dialog says the decision is final and offers Cancel
 * and the action; confirming leaves the row with its tag and no buttons.
 */
export async function decide(adminPage: Page, row: Locator, action: 'Approve' | 'Refuse', tag: string) {
  await row.getByRole('button', { name: action }).click()
  const dialog = adminPage.getByRole('dialog', { name: action })
  await expect(dialog).toContainText('This decision is final.')
  await expect(dialog.getByRole('button')).toHaveText(['Cancel', action])
  await dialog.getByRole('button', { name: action }).click()
  await expect(dialog).toHaveCount(0)
  await expect(row.locator('.tag')).toHaveText(tag)
  await expect(row.getByRole('button')).toHaveCount(0)
}
