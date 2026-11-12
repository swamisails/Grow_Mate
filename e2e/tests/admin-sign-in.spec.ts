import { expect, test } from '@playwright/test'

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} must be set (it comes from the root .env through docker-compose.e2e.yml)`)
  }
  return value
}

const admin = {
  name: requiredEnv('ADMIN_NAME'),
  email: requiredEnv('ADMIN_EMAIL'),
  password: requiredEnv('ADMIN_PASSWORD'),
}

test('Admin signs in, sees the seeded Admin Courses page and signs out', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/sign-in$/)

  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(admin.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/admin\/courses$/)
  await expect(page.getByRole('row', { name: 'Python Basics Published' })).toBeVisible()
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Courses' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.getByRole('banner').getByText(admin.name)).toBeVisible()

  // Nothing auth-related is kept in localStorage (AD-9).
  expect(await page.evaluate(() => window.localStorage.length)).toBe(0)

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)

  // The session is gone: a protected call is refused and a reload stays on Sign in.
  // The Referer names the stateful origin, so Sanctum reads the session and the 401 proves it was invalidated.
  const me = await page.request.get('/api/v1/me', {
    headers: { Accept: 'application/json', Referer: new URL('/', page.url()).toString() },
  })
  expect(me.status()).toBe(401)
  await page.goto('/admin/courses')
  await expect(page).toHaveURL(/\/sign-in\?return=%2Fadmin%2Fcourses$/)
})

test('a wrong password keeps Admin on Sign in with a generic message', async ({ page }) => {
  await page.goto('/sign-in')

  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(`${admin.password}-wrong`)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByLabel('Email')).toHaveAccessibleDescription('These credentials do not match our records.')
  await expect(page).toHaveURL(/\/sign-in$/)
})

test('Admin Courses with no Courses shows its empty state and New Course', async ({ page }) => {
  // The e2e database is seeded with demo Courses, so the empty list comes from a mocked response.
  await page.route('**/api/v1/admin/courses', (route) => route.fulfill({ json: { data: [] } }))
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(admin.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/admin\/courses$/)
  await expect(page.getByText('No courses yet.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'New Course' })).toBeVisible()
})
