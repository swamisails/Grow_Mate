import { expect, test, type Page } from '@playwright/test'

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

async function signIn(page: Page, password = admin.password) {
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test.describe('theme', () => {
  test('a first visit follows the OS setting, before the app script runs', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/sign-in')

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('banner').getByRole('button', { name: 'Switch to light mode' })).toBeVisible()

    // The pre-paint script alone sets the theme: with the app bundle blocked, it is still dark.
    await page.route('**/assets/*.js', (route) => route.abort())
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('the choice made on Sign in survives a reload and carries into the Admin bar', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/sign-in')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible()

    await signIn(page)
    await expect(page).toHaveURL(/\/admin\/courses$/)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.getByRole('banner').getByRole('button', { name: 'Switch to light mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByRole('banner').getByRole('button', { name: 'Switch to dark mode' })).toBeVisible()
  })
})

test('pages name themselves in the h1 and the title', async ({ page }) => {
  await page.goto('/sign-in')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in')
  await expect(page).toHaveTitle('Sign in · GrowMate')

  await signIn(page)
  await expect(page).toHaveURL(/\/admin\/courses$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Courses')
  await expect(page).toHaveTitle('Courses · GrowMate')
})

test('"Loading…" shows while the session is checked', async ({ page }) => {
  let release!: () => void
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route('**/api/v1/me', async (route) => {
    await held
    await route.continue()
  })

  await page.goto('/sign-in')
  await expect(page.getByRole('main')).toHaveText('Loading…')

  release()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in')
})

test.describe('Not found', () => {
  test('signed out, an unknown URL shows Not found in the bare layout with a link to Sign in', async ({ page }) => {
    await page.goto('/nope')

    await expect(page).toHaveURL(/\/nope$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.')
    await expect(page).toHaveTitle('Page not found · GrowMate')
    await expect(page.getByRole('navigation')).toHaveCount(0)

    await page.getByRole('main').getByRole('link', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/sign-in$/)
  })

  test('signed in, an unknown URL shows Not found in the Admin layout with a link home', async ({ page }) => {
    await page.goto('/sign-in')
    await signIn(page)
    await expect(page).toHaveURL(/\/admin\/courses$/)

    await page.goto('/nope')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.')
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Courses' })).toBeVisible()

    await page.getByRole('main').getByRole('link', { name: 'Home' }).click()
    await expect(page).toHaveURL(/\/admin\/courses$/)
  })
})

test.describe('401 and the return path', () => {
  test('signed out on an admin page, Sign in returns to it', async ({ page }) => {
    await page.goto('/admin/courses')
    await expect(page).toHaveURL(/\/sign-in\?return=%2Fadmin%2Fcourses$/)

    await signIn(page)
    await expect(page).toHaveURL(/\/admin\/courses$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Courses')
  })

  test('when the session expires, Sign in returns to the open page', async ({ page, context }) => {
    await page.goto('/sign-in')
    await signIn(page)
    await expect(page).toHaveURL(/\/admin\/courses$/)

    await context.clearCookies()
    await page.reload()
    await expect(page).toHaveURL(/\/sign-in\?return=%2Fadmin%2Fcourses$/)

    await signIn(page)
    await expect(page).toHaveURL(/\/admin\/courses$/)
  })

  test('a hostile return path is ignored and Sign in goes home', async ({ page }) => {
    await page.goto('/sign-in?return=//evil.com')
    await signIn(page)

    await expect(page).toHaveURL(/^http:\/\/[^/]+\/admin\/courses$/)
  })
})

test('a wrong password shows the message under Email and focuses Email', async ({ page }) => {
  await page.goto('/sign-in')
  await signIn(page, `${admin.password}-wrong`)

  const email = page.getByLabel('Email')
  await expect(email).toHaveAccessibleDescription('These credentials do not match our records.')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toBeFocused()
  await expect(page).toHaveURL(/\/sign-in$/)
})
