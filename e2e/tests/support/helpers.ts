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

/** Fails when an API body carries anything the SPA must never see: a route, a group, or a hidden reason. */
export function hidesSecrets(body: unknown) {
  const json = JSON.stringify(body)
  expect(json).not.toContain('"route"')
  expect(json).not.toContain('group_assignment_id')
  expect(json).not.toContain('gold_pass')
  expect(json).not.toContain('registration_approval')
  expect(json).not.toContain('group_assignment_accepted')
}

/** A new Employee who skips the Mentor check; their page stays signed in on Home. */
export async function newSignedUpEmployee(browser: Browser, label: string, first: string) {
  const employee = newEmployee(label, { first, nameWithId: true })
  const session = await newPage(browser)
  await signUp(session.page, employee)
  await expect(session.page).toHaveURL(/\/mentor-check$/)
  await session.page.getByRole('button', { name: 'Skip' }).click()
  await expect(session.page).toHaveURL(/\/home$/)
  return { ...employee, ...session }
}

/** Waits for the page's own GET of a path matching `path`. */
export function waitForGet(page: Page, path: RegExp) {
  return page.waitForResponse((response) => response.request().method() === 'GET' && path.test(new URL(response.url()).pathname))
}

/** Opens the Course page and returns the body of its own Stages read, once the Mentors card has loaded too. */
export async function openCourse(page: Page, courseId: number, title: string) {
  const stages = waitForGet(page, /^\/api\/v1\/courses\/\d+\/stages$/)
  await page.goto(`/courses/${courseId}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  const body = await (await stages).json()
  // The Mentors card has loaded too, so a missing Stages card is not just a slow one.
  await expect(page.getByRole('region', { name: 'Mentors' })).toBeVisible()
  return body
}

/**
 * The Mentor signs up naming the published Course at the Mentor check, and Admin approves that
 * Registration decisions row. `adminPage` is signed in as Admin.
 */
export async function approvedMentorOnCourse(adminPage: Page, mentorPage: Page, mentor: { name: string; email: string }, course: string) {
  await signUp(mentorPage, mentor)
  await expect(mentorPage).toHaveURL(/\/mentor-check$/)
  await mentorPage.getByRole('group', { name: 'Courses you can mentor' }).getByRole('checkbox', { name: course }).check()
  await mentorPage.getByRole('button', { name: 'Submit' }).click()
  await expect(mentorPage).toHaveURL(/\/home$/)

  await adminPage.getByRole('navigation').getByRole('link', { name: 'Registration decisions' }).click()
  await expect(adminPage).toHaveURL(/\/admin\/registration-decisions$/)
  await decide(adminPage, adminPage.getByRole('row').filter({ hasText: mentor.name }).filter({ hasText: course }), 'Approve', 'Approved')
}

/** The Learner Requests the Mentor on the Course page, the Mentor Accepts and then clicks Course Completed. */
export async function toCourseCompleted(
  learnerPage: Page,
  mentorPage: Page,
  { courseId, course, mentorName, learnerName }: { courseId: number; course: string; mentorName: string; learnerName: string },
) {
  await openCourse(learnerPage, courseId, course)
  const send = learnerPage.waitForResponse(
    (response) => response.request().method() === 'POST' && /\/api\/v1\/courses\/\d+\/requests$/.test(response.url()),
  )
  await learnerPage.getByRole('region', { name: 'Mentors' }).getByRole('listitem').filter({ hasText: mentorName }).getByRole('button', { name: 'Request' }).click()
  expect((await send).status()).toBe(201)

  await mentorPage.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
  const accepted = mentorPage.waitForResponse((response) => /\/api\/v1\/requests\/\d+\/accept$/.test(response.url()))
  await mentorPage.getByRole('listitem').filter({ hasText: learnerName }).getByRole('button', { name: 'Accept' }).click()
  expect((await accepted).status()).toBe(201)

  await mentorPage.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
  await mentorPage.getByRole('region', { name: 'Mentoring' }).getByRole('link', { name: new RegExp(learnerName) }).click()
  await expect(mentorPage).toHaveURL(/\/matches\/\d+$/)
  await mentorPage.getByRole('button', { name: 'Course Completed' }).click()
  const completed = mentorPage.waitForResponse((response) => /\/api\/v1\/matches\/\d+\/course-completed$/.test(response.url()))
  await mentorPage.getByRole('dialog', { name: 'Course Completed' }).getByRole('button', { name: 'Course Completed' }).click()
  expect((await completed).status()).toBe(204)
  await expect(mentorPage).toHaveURL(/\/home$/)
}
