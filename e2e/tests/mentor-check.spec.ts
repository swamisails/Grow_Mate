import { expect, test, type Browser } from '@playwright/test'
import { adminSignIn, apiRequest, newEmployee, newPage, publishCourse, signIn, signOut, signUp } from './support/helpers'

// The demo Courses (Python Basics, Git Essentials) are seeded and published before any test signs up.

/** A new Admin page in its own browser context, so its session doesn't replace the Employee's. */
async function adminPage(browser: Browser) {
  const admin = await newPage(browser)
  await adminSignIn(admin.page)
  return admin
}

test('a new Employee names two Courses at step 2, lands on Home, and never sees the step again', async ({ page }) => {
  const sam = newEmployee('submit')
  await signUp(page, sam)

  await expect(page).toHaveURL(/\/mentor-check$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mentor check')
  await expect(page).toHaveTitle('Mentor check · GrowMate')

  // The step's bar: GrowMate, the theme toggle, the name and Sign out, with no links.
  const banner = page.getByRole('banner')
  await expect(banner.getByText('GrowMate')).toBeVisible()
  await expect(banner.getByRole('link')).toHaveCount(0)
  await expect(page.getByRole('navigation')).toHaveCount(0)
  await expect(banner.getByRole('button')).toHaveCount(2)
  await expect(banner.getByText(sam.name)).toBeVisible()

  const group = page.getByRole('group', { name: 'Courses you can mentor' })
  await expect(group.getByRole('checkbox', { name: 'Python Basics' })).toBeVisible()
  await expect(group.getByRole('checkbox', { name: 'Git Essentials' })).toBeVisible()
  const submit = page.getByRole('button', { name: 'Submit' })
  await expect(submit).toBeDisabled()
  await group.getByRole('checkbox', { name: 'Python Basics' }).check()
  await group.getByRole('checkbox', { name: 'Git Essentials' }).check()
  await expect(submit).toBeEnabled()
  await submit.click()

  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home')
  await page.goto('/mentor-check')
  await expect(page).toHaveURL(/\/home$/)

  await signOut(page)
  await signIn(page, sam.email)
  await expect(page).toHaveURL(/\/home$/)
  await page.goto('/mentor-check')
  await expect(page).toHaveURL(/\/home$/)

  // The API holds the rule: a second submission changes nothing.
  const again = await apiRequest(page, 'POST', '/api/v1/mentor-check', { skip: true })
  expect(again).toEqual({ status: 409, body: { message: "You've already done the Mentor check.", code: 'MENTORS_CHECK_DONE' } })
  expect((await apiRequest(page, 'GET', '/api/v1/mentor-check')).body).toEqual({ data: { pending: false, courses: [] } })
})

test('Skip ends the check with no Courses and goes Home', async ({ page }) => {
  await signUp(page, newEmployee('skip'))
  await expect(page).toHaveURL(/\/mentor-check$/)

  await page.getByRole('button', { name: 'Skip' }).click()

  await expect(page).toHaveURL(/\/home$/)
  expect((await apiRequest(page, 'GET', '/api/v1/mentor-check')).body).toEqual({ data: { pending: false, courses: [] } })
  const named = await apiRequest(page, 'POST', '/api/v1/mentor-check', { course_ids: [1] })
  expect(named.status).toBe(409)
  expect(named.body.code).toBe('MENTORS_CHECK_DONE')
})

test('while the check is pending, every Employee page and every sign-in comes back to it', async ({ page }) => {
  const sam = newEmployee('pending')
  await signUp(page, sam)
  await expect(page).toHaveURL(/\/mentor-check$/)

  for (const path of ['/courses/1', '/home', '/courses', '/']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/mentor-check$/)
  }

  await signOut(page)
  await signIn(page, sam.email)
  await expect(page).toHaveURL(/\/mentor-check$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mentor check')
})

test('with no Courses to name, only Skip is shown', async ({ page }) => {
  await page.route('**/api/v1/mentor-check', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: { data: { pending: true, courses: [] } } }) : route.continue(),
  )
  await signUp(page, newEmployee('nocourses'))
  await expect(page).toHaveURL(/\/mentor-check$/)

  await expect(page.getByRole('main').getByRole('button')).toHaveText(['Skip'])
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page).toHaveURL(/\/home$/)
})

test('the API refuses a later, draft or unknown Course and a bad shape, storing nothing', async ({ page, browser }) => {
  await signUp(page, newEmployee('refused'))
  await expect(page).toHaveURL(/\/mentor-check$/)
  const before = (await apiRequest(page, 'GET', '/api/v1/mentor-check')).body.data
  expect(before.pending).toBe(true)
  const eligible: number = before.courses.find((course: { title: string }) => course.title === 'Python Basics').id

  // Admin publishes a Course after the sign-up, and keeps another as a draft.
  const admin = await adminPage(browser)
  const draft = (await apiRequest(admin.page, 'POST', '/api/v1/admin/courses', { title: 'Mentor check draft', description: null })).body.data.id
  const later = await publishCourse(admin.page, 'Mentor check later')
  // Admin has no Mentor check.
  expect((await apiRequest(admin.page, 'GET', '/api/v1/mentor-check')).status).toBe(403)
  expect((await apiRequest(admin.page, 'POST', '/api/v1/mentor-check', { skip: true })).status).toBe(403)
  await admin.close()

  for (const ineligible of [later, draft, 999999]) {
    const refused = await apiRequest(page, 'POST', '/api/v1/mentor-check', { course_ids: [eligible, ineligible] })
    expect(refused).toEqual({ status: 409, body: { message: "One or more of these courses can't be named.", code: 'MENTORS_COURSE_NOT_ELIGIBLE' } })
  }
  for (const bad of [{}, { course_ids: [] }, { course_ids: [eligible], skip: true }, { course_ids: [eligible, eligible] }, { course_ids: [String(eligible)] }]) {
    expect((await apiRequest(page, 'POST', '/api/v1/mentor-check', bad)).status).toBe(422)
  }

  // Nothing was stored, and the later Course is never offered.
  expect((await apiRequest(page, 'GET', '/api/v1/mentor-check')).body.data).toEqual(before)
  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Python Basics' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Mentor check later' })).toHaveCount(0)
})

test('a guest has no Mentor check', async ({ page }) => {
  await page.goto('/sign-in')
  const response = await page.request.get('/api/v1/mentor-check', {
    headers: { Accept: 'application/json', Referer: new URL('/', page.url()).toString() },
  })
  expect(response.status()).toBe(401)

  await page.goto('/mentor-check')
  await expect(page).toHaveURL(/\/sign-in\?return=%2Fmentor-check$/)
})
