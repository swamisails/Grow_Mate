import { expect, test } from '@playwright/test'
import { adminSignIn, apiRequest, decide, newEmployee, newPage, publishCourse, signIn, signUp } from './support/helpers'

// Admin decides each Course an Employee named in the Mentor check (R3). The spec publishes its own two
// Courses, so the demo Courses' Mentor lists stay as seeded. Priya (seeded) is the demo Employee.
const priya = { email: 'priya.nair@example.com', password: 'demo-password' }

test('Admin approves one named Course and refuses another; only the approved one lists the Employee', async ({ page, browser }) => {
  const sam = newEmployee('decisions', { nameWithId: true })
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
