import { expect, test, type Browser, type Locator, type Page } from '@playwright/test'

// Admin decides each Course an Employee named in the Mentor check (R3). The spec publishes its own two
// Courses, so the demo Courses' Mentor lists stay as seeded. Priya (seeded) is the demo Employee.
const password = 'employee-password'
const priya = { email: 'priya.nair@example.com', password: 'demo-password' }

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

async function signIn(page: Page, email: string, secret = password) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(secret)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

async function adminSignIn(page: Page) {
  await signIn(page, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!)
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

async function decide(admin: Page, row: Locator, action: 'Approve' | 'Refuse', tag: string) {
  await row.getByRole('button', { name: action }).click()
  const dialog = admin.getByRole('dialog', { name: action })
  await expect(dialog).toContainText('This decision is final.')
  await expect(dialog.getByRole('button')).toHaveText(['Cancel', action])
  await dialog.getByRole('button', { name: action }).click()
  await expect(dialog).toHaveCount(0)
  await expect(row.locator('.tag')).toHaveText(tag)
  await expect(row.getByRole('button')).toHaveCount(0)
}

test('Admin approves one named Course and refuses another; only the approved one lists the Employee', async ({ page, browser }) => {
  const sam = newEmployee('decisions')
  const approved = `Approved course ${sam.id}`
  const refused = `Refused course ${sam.id}`

  const admin = await newPage(browser)
  await adminSignIn(admin.page)
  await publishCourse(admin.page, approved)
  await publishCourse(admin.page, refused)
  // Only Courses published strictly before the account's creation (to the second) can be named.
  await page.waitForTimeout(1100)

  // The new Employee names both Courses at step 2.
  await signUp(page, sam)
  await expect(page).toHaveURL(/\/mentor-check$/)
  const group = page.getByRole('group', { name: 'Courses you can mentor' })
  await group.getByRole('checkbox', { name: approved }).check()
  await group.getByRole('checkbox', { name: refused }).check()
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page).toHaveURL(/\/home$/)

  // Admin opens Registration decisions from the top bar, after Courses.
  await admin.page.reload()
  const nav = admin.page.getByRole('navigation')
  await expect(nav.getByRole('link')).toHaveText(['Courses', 'Registration decisions'])
  await nav.getByRole('link', { name: 'Registration decisions' }).click()
  await expect(admin.page).toHaveURL(/\/admin\/registration-decisions$/)
  await expect(admin.page.getByRole('heading', { level: 1 })).toHaveText('Registration decisions')
  await expect(admin.page).toHaveTitle('Registration decisions · GrowMate')
  await expect(admin.page.getByRole('columnheader')).toHaveText(['Employee', 'Course', 'Decision'])

  const rowFor = (title: string) => admin.page.getByRole('row').filter({ hasText: sam.name }).filter({ hasText: title })
  await expect(rowFor(approved).getByRole('button')).toHaveText(['Approve', 'Refuse'])
  await expect(rowFor(refused).getByRole('button')).toHaveText(['Approve', 'Refuse'])

  // Cancel sends nothing.
  await rowFor(approved).getByRole('button', { name: 'Refuse' }).click()
  await admin.page.getByRole('dialog', { name: 'Refuse' }).getByRole('button', { name: 'Cancel' }).click()
  await expect(rowFor(approved).getByRole('button')).toHaveText(['Approve', 'Refuse'])

  await decide(admin.page, rowFor(approved), 'Approve', 'Approved')
  await decide(admin.page, rowFor(refused), 'Refuse', 'Refused')

  await admin.page.reload()
  await expect(rowFor(approved).locator('.tag')).toHaveText('Approved')
  await expect(rowFor(refused).locator('.tag')).toHaveText('Refused')
  await expect(rowFor(approved).getByRole('button')).toHaveCount(0)
  await expect(rowFor(refused).getByRole('button')).toHaveCount(0)

  // The API holds the rule: a second decision on either row is refused, and no response carries a route.
  const list = await apiRequest(admin.page, 'GET', '/api/v1/admin/registration-decisions')
  expect(JSON.stringify(list.body)).not.toContain('route')
  const rows = Object.fromEntries(
    list.body.data
      .filter((row: { employee_name: string }) => row.employee_name === sam.name)
      .map((row: { id: number; course_title: string; outcome: string }) => [row.course_title, row]),
  )
  expect(rows[approved]).toEqual({ id: expect.any(Number), employee_name: sam.name, course_title: approved, outcome: 'approved' })
  expect(rows[refused]).toEqual({ id: expect.any(Number), employee_name: sam.name, course_title: refused, outcome: 'refused' })
  const conflict = { status: 409, body: { message: 'This course has already been decided.', code: 'MENTORS_ALREADY_DECIDED' } }
  for (const row of [rows[approved], rows[refused]]) {
    for (const decision of ['approve', 'refuse']) {
      expect(await apiRequest(admin.page, 'POST', `/api/v1/admin/registration-decisions/${row.id}/${decision}`, {})).toEqual(conflict)
    }
  }
  expect((await apiRequest(admin.page, 'POST', '/api/v1/admin/registration-decisions/999999/approve', {})).status).toBe(404)
  // An Employee has no access.
  expect((await apiRequest(page, 'GET', '/api/v1/admin/registration-decisions')).status).toBe(403)
  await admin.close()

  // A demo Employee sees Sam as a Mentor of the approved Course only.
  const demo = await newPage(browser)
  await signIn(demo.page, priya.email, priya.password)
  await expect(demo.page).toHaveURL(/\/home$/)
  for (const [title, listed] of [[approved, true], [refused, false]] as const) {
    await demo.page.getByRole('navigation').getByRole('link', { name: 'Courses' }).click()
    await demo.page.getByRole('link', { name: title }).click()
    await expect(demo.page.getByRole('heading', { level: 1 })).toHaveText(title)
    const card = demo.page.getByRole('region', { name: 'Mentors' })
    if (listed) {
      await expect(card.getByRole('listitem')).toHaveText([sam.name])
    } else {
      await expect(card).toContainText('No mentors for this course yet.')
      await expect(card.getByText(sam.name)).toHaveCount(0)
    }
  }
  await demo.close()
})

test('a guest has no Registration decisions', async ({ page }) => {
  await page.goto('/sign-in')
  const response = await page.request.get('/api/v1/admin/registration-decisions', {
    headers: { Accept: 'application/json', Referer: new URL('/', page.url()).toString() },
  })
  expect(response.status()).toBe(401)

  await page.goto('/admin/registration-decisions')
  await expect(page).toHaveURL(/\/sign-in\?return=%2Fadmin%2Fregistration-decisions$/)
})
