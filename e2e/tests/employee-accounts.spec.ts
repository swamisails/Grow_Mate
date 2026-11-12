import { expect, test, type Page } from '@playwright/test'

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} must be set (it comes from the root .env through docker-compose.e2e.yml)`)
  }
  return value
}

const admin = {
  email: requiredEnv('ADMIN_EMAIL'),
  password: requiredEnv('ADMIN_PASSWORD'),
}

const password = 'employee-password'

/** A fresh Employee per test: run.sh resets the database per run, and each test needs its own email. */
function newEmployee(label: string) {
  const id = `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  return { name: `Priya ${label}`, email: `priya-${id}@example.com` }
}

async function signUp(page: Page, employee: { name: string; email: string }) {
  await page.getByLabel('Name').fill(employee.name)
  await page.getByLabel('Email').fill(employee.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign up' }).click()
}

async function signIn(page: Page, email: string, secret: string) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(secret)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('an Employee signs up from Sign in and lands on Home under the Employee bar', async ({ page }) => {
  const priya = newEmployee('signup')

  await page.goto('/')
  await expect(page).toHaveURL(/\/sign-in$/)
  await page.getByRole('main').getByRole('link', { name: 'Sign up' }).click()
  await expect(page).toHaveURL(/\/sign-up$/)
  await expect(page).toHaveTitle('Sign up · GrowMate')

  await signUp(page, priya)

  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home')
  await expect(page.getByRole('region', { name: 'Learning' })).toContainText("You aren't learning a course yet.")

  // The bar: GrowMate, Home, the theme toggle, the name and Sign out, and nothing else.
  const banner = page.getByRole('banner')
  await expect(banner.getByRole('link')).toHaveText(['GrowMate', 'Home', 'Courses'])
  await expect(banner.getByRole('button')).toHaveCount(2)
  await expect(banner.getByRole('button', { name: /^Switch to (dark|light) mode$/ })).toBeVisible()
  await expect(banner.getByRole('button', { name: 'Sign out' })).toBeVisible()
  await expect(banner.getByText(priya.name)).toBeVisible()
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')

  // Signed in, Sign up goes Home.
  await page.goto('/sign-up')
  await expect(page).toHaveURL(/\/home$/)
})

test('an Employee signs out, then back in, and Home needs a session again', async ({ page }) => {
  const priya = newEmployee('signout')
  await page.goto('/sign-up')
  await signUp(page, priya)
  await expect(page).toHaveURL(/\/home$/)

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)

  await page.goto('/home')
  await expect(page).toHaveURL(/\/sign-in\?return=%2Fhome$/)

  // Emails are stored lowercased, and Sign in still matches the address as typed.
  await signIn(page, priya.email.toUpperCase(), password)
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('banner').getByText(priya.name)).toBeVisible()
})

test('a taken email, in any case, is refused under Email', async ({ page }) => {
  const priya = newEmployee('duplicate')
  await page.goto('/sign-up')
  await signUp(page, priya)
  await expect(page).toHaveURL(/\/home$/)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)

  await page.goto('/sign-up')
  await signUp(page, { name: 'Someone else', email: priya.email.toUpperCase() })

  const email = page.getByLabel('Email')
  await expect(email).toHaveAccessibleDescription('The email has already been taken.')
  await expect(email).toBeFocused()
  await expect(page).toHaveURL(/\/sign-up$/)
})

test('weak or missing fields are each refused under their field, with focus on the first', async ({ page }) => {
  await page.goto('/sign-up')
  await page.getByLabel('Email').fill('not-an-email')
  await page.getByLabel('Password').fill('short')
  await page.getByRole('button', { name: 'Sign up' }).click()

  const name = page.getByLabel('Name')
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(name).toBeFocused()
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Password')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveURL(/\/sign-up$/)
})

test.describe('the wrong role sees Not found in its own layout', () => {
  test('an Employee on an Admin page', async ({ page }) => {
    await page.goto('/sign-up')
    await signUp(page, newEmployee('wrongrole'))
    await expect(page).toHaveURL(/\/home$/)

    await page.goto('/admin/courses')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.')
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Home' })).toBeVisible()

    // The API refuses too.
    const courses = await page.request.get('/api/v1/admin/courses', {
      headers: { Accept: 'application/json', Referer: new URL('/', page.url()).toString() },
    })
    expect(courses.status()).toBe(403)

    await page.getByRole('main').getByRole('link', { name: 'Home' }).click()
    await expect(page).toHaveURL(/\/home$/)
  })

  test('Admin on an Employee page', async ({ page }) => {
    await page.goto('/sign-in')
    await signIn(page, admin.email, admin.password)
    await expect(page).toHaveURL(/\/admin\/courses$/)

    await page.goto('/home')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.')
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Courses' })).toBeVisible()
  })
})

test('when the session expires on Home, Sign in returns to it', async ({ page, context }) => {
  const priya = newEmployee('expired')
  await page.goto('/sign-up')
  await signUp(page, priya)
  await expect(page).toHaveURL(/\/home$/)

  await context.clearCookies()
  await page.reload()
  await expect(page).toHaveURL(/\/sign-in\?return=%2Fhome$/)

  await signIn(page, priya.email, password)
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home')
})
