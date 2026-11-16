import { expect, test, type Browser, type Page } from '@playwright/test'

// An Employee sees Admin's Registration decisions (R3): one notice per decision on Notices, newest
// first, and the approved and refused Courses as separate lists on Home (AD-8, AD-11). The spec
// publishes its own three Courses, so the demo Courses stay as seeded.
const password = 'employee-password'

/** A fresh Employee per test: each needs its own email, and its name finds its rows in the shared list. */
function newEmployee(label: string) {
  const id = `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  return { id, name: `Sam ${id}`, email: `sam-${id}@example.com` }
}

async function signUp(page: Page, employee: { name: string; email: string }) {
  await page.goto('/sign-up')
  await page.getByLabel('Name').fill(employee.name)
  await page.getByLabel('Email').fill(employee.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign up' }).click()
}

async function adminSignIn(page: Page) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(process.env.ADMIN_EMAIL!)
  await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/admin\/courses$/)
}

async function apiRequest(page: Page, method: 'GET' | 'PUT' | 'POST', path: string, body?: unknown) {
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
async function newPage(browser: Browser) {
  const context = await browser.newContext()
  return { page: await context.newPage(), close: () => context.close() }
}

/** Admin creates and publishes a complete Course through the API. */
async function publishCourse(admin: Page, title: string) {
  const id: number = (await apiRequest(admin, 'POST', '/api/v1/admin/courses', { title, description: null })).body.data.id
  const document = {
    title, description: null,
    stages: ['bronze', 'silver', 'gold'].map((level) => ({
      level, pass_mark: 70, questions: [{ text: 'Question?', options: [{ text: 'Yes', is_correct: true }, { text: 'No', is_correct: false }] }],
    })),
  }
  expect((await apiRequest(admin, 'PUT', `/api/v1/admin/courses/${id}`, document)).status).toBe(200)
  expect((await apiRequest(admin, 'POST', `/api/v1/admin/courses/${id}/publish`, {})).status).toBe(200)
}

/** Admin decides the Employee's row for `title` on the Registration decisions page, confirming it. */
async function decide(admin: Page, employeeName: string, title: string, action: 'Approve' | 'Refuse') {
  const row = admin.getByRole('row').filter({ hasText: employeeName }).filter({ hasText: title })
  await row.getByRole('button', { name: action }).click()
  await admin.getByRole('dialog', { name: action }).getByRole('button', { name: action }).click()
  await expect(row.getByRole('button')).toHaveCount(0)
}

/** A timestamp the API returned, as the SPA shows its UTC calendar date: "16 Nov 2026". */
function utcDate(iso: string) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const date = new Date(iso)
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** Waits for the SPA's own read of the Employee's Registration decisions. */
function decisionsRead(page: Page) {
  return page.waitForResponse(
    (response) => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/registration-decisions',
  )
}

test('an Employee sees one notice per decision, newest first, and the two lists on Home', async ({ page, browser }) => {
  const sam = newEmployee('notices')
  const approved = `Approved course ${sam.id}`
  const refused = `Refused course ${sam.id}`
  const undecided = `Undecided course ${sam.id}`

  const admin = await newPage(browser)
  await adminSignIn(admin.page)
  for (const title of [approved, refused, undecided]) {
    await publishCourse(admin.page, title)
  }
  // Only Courses published strictly before the account's creation (to the second) can be named.
  await page.waitForTimeout(1100)

  await signUp(page, sam)
  await expect(page).toHaveURL(/\/mentor-check$/)
  const group = page.getByRole('group', { name: 'Courses you can mentor' })
  for (const title of [approved, refused, undecided]) {
    await group.getByRole('checkbox', { name: title }).check()
  }
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page).toHaveURL(/\/home$/)

  // Named but nothing decided: the card shows both headings, each with "None.".
  const card = page.getByRole('region', { name: 'Mentor check' })
  await expect(card.getByRole('heading', { level: 3 })).toHaveText(['Approved', 'Refused'])
  await expect(card.getByRole('region', { name: 'Approved' })).toContainText('None.')
  await expect(card.getByRole('region', { name: 'Refused' })).toContainText('None.')
  await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  await expect(page).toHaveURL(/\/notices$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Notices')
  await expect(page).toHaveTitle('Notices · GrowMate')
  await expect(page.getByRole('region', { name: 'Notices' })).toContainText('No notices.')

  // Admin approves one, then refuses another, and leaves the third.
  await admin.page.goto('/admin/registration-decisions')
  await decide(admin.page, sam.name, approved, 'Approve')
  await decide(admin.page, sam.name, refused, 'Refuse')

  // Notices: two, newest first, each a sentence and its date, with no link, button or route.
  await page.reload()
  const notices = page.getByRole('region', { name: 'Notices' })
  const rows = notices.getByRole('listitem')
  await expect(rows).toHaveCount(2)
  await expect(rows.locator('.notice-row__sentence')).toHaveText([
    `You weren't approved to mentor ${refused}.`,
    `You can now mentor ${approved}.`,
  ])
  await expect(notices.getByRole('link')).toHaveCount(0)
  await expect(notices.getByRole('button')).toHaveCount(0)

  const inbox = await apiRequest(page, 'GET', '/api/v1/notices')
  expect(inbox.status).toBe(200)
  expect(JSON.stringify(inbox.body)).not.toContain('route')
  expect(inbox.body.data).toEqual([
    { id: expect.any(String), type: 'registration_decision', occurred_at: expect.stringMatching(/Z$/), course_title: refused, outcome: 'refused' },
    { id: expect.any(String), type: 'registration_decision', occurred_at: expect.stringMatching(/Z$/), course_title: approved, outcome: 'approved' },
  ])
  // Each row's date is the UTC calendar date of the API's own `occurred_at`.
  await expect(rows.locator('.meta')).toHaveText(inbox.body.data.map((notice: { occurred_at: string }) => utcDate(notice.occurred_at)))

  // Home: one approved and one refused Course; the undecided one is in neither list.
  await page.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
  await expect(card.getByRole('region', { name: 'Approved' }).getByRole('listitem')).toHaveText([approved])
  await expect(card.getByRole('region', { name: 'Refused' }).getByRole('listitem')).toHaveText([refused])
  await expect(card).not.toContainText(undecided)
  await expect(page.locator('main .card-grid').getByRole('region', { name: 'Learning' })).toBeVisible()
  expect((await apiRequest(page, 'GET', '/api/v1/registration-decisions')).body).toEqual({
    data: { named: true, approved: [{ id: expect.any(Number), title: approved }], refused: [{ id: expect.any(Number), title: refused }] },
  })

  // A second decision is refused and sends nothing.
  const list = await apiRequest(admin.page, 'GET', '/api/v1/admin/registration-decisions')
  const decidedRow = list.body.data.find((row: { employee_name: string; course_title: string }) => row.employee_name === sam.name && row.course_title === approved)
  expect((await apiRequest(admin.page, 'POST', `/api/v1/admin/registration-decisions/${decidedRow.id}/refuse`, {})).status).toBe(409)
  expect((await apiRequest(page, 'GET', '/api/v1/notices')).body.data).toHaveLength(2)

  // Admin has no Notices link, no Notices page and no notices.
  await expect(admin.page.getByRole('navigation').getByRole('link')).toHaveText(['Courses', 'Registration decisions'])
  expect((await apiRequest(admin.page, 'GET', '/api/v1/notices')).status).toBe(403)
  expect((await apiRequest(admin.page, 'GET', '/api/v1/registration-decisions')).status).toBe(403)
  await admin.page.goto('/notices')
  await expect(admin.page.getByRole('heading', { level: 1 })).toHaveText('Page not found.')
  await admin.close()
})

test('an Employee who skipped the Mentor check has no Mentor check card', async ({ page }) => {
  await signUp(page, newEmployee('skipped'))
  await expect(page).toHaveURL(/\/mentor-check$/)
  const homeRead = decisionsRead(page)
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page).toHaveURL(/\/home$/)

  await expect(page.getByRole('region', { name: 'Learning' })).toBeVisible()
  // Home's own read has answered before the card is checked absent.
  expect(await (await homeRead).json()).toEqual({ data: { named: false, approved: [], refused: [] } })
  await expect(page.getByRole('region', { name: 'Mentor check' })).toHaveCount(0)
})

test('a guest has no notices and no decision lists', async ({ page }) => {
  await page.goto('/sign-in')
  const headers = { Accept: 'application/json', Referer: new URL('/', page.url()).toString() }
  expect((await page.request.get('/api/v1/notices', { headers })).status()).toBe(401)
  expect((await page.request.get('/api/v1/registration-decisions', { headers })).status()).toBe(401)

  await page.goto('/notices')
  await expect(page).toHaveURL(/\/sign-in\?return=%2Fnotices$/)
})
