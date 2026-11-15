import { expect, test, type Page } from '@playwright/test'
import { admin, decisionsRead, employeePassword, newEmployee, signIn, signUp } from './support/helpers'

/** Sign-up step 2: a new Employee skips the Mentor check and lands on Home. */
async function skipMentorCheck(page: Page) {
  await expect(page).toHaveURL(/\/mentor-check$/)
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page).toHaveURL(/\/home$/)
}

test('an Employee signs up from Sign in, passes the Mentor check step and lands on Home under the Employee bar', async ({ page }) => {
  const priya = newEmployee('signup', { first: 'Priya' })

  await page.goto('/')
  await expect(page).toHaveURL(/\/sign-in$/)
  await page.getByRole('main').getByRole('link', { name: 'Sign up' }).click()
  await expect(page).toHaveURL(/\/sign-up$/)
  await expect(page).toHaveTitle('Sign up · GrowMate')

  await signUp(page, priya, { goto: false })

  await expect(page).toHaveURL(/\/mentor-check$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mentor check')
  // Home's own read of the Registration decisions, awaited before checking the card is absent.
  const homeRead = decisionsRead(page)
  await skipMentorCheck(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home')
  await expect(page.getByRole('region', { name: 'Learning' })).toContainText("You aren't learning a course yet.")
  // A skipped check names nothing, so Home has no Mentor check card.
  expect((await homeRead).status()).toBe(200)
  await expect(page.getByRole('region', { name: 'Mentor check' })).toHaveCount(0)

  // The bar: GrowMate, Home, Courses, Requests, Notices, the theme toggle, the name and Sign out.
  const banner = page.getByRole('banner')
  await expect(banner.getByRole('link')).toHaveText(['GrowMate', 'Home', 'Courses', 'Requests', 'Notices'])
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
  const priya = newEmployee('signout', { first: 'Priya' })
  await page.goto('/sign-up')
  await signUp(page, priya, { goto: false })
  await skipMentorCheck(page)

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)

  await page.goto('/home')
  await expect(page).toHaveURL(/\/sign-in\?return=%2Fhome$/)

  // Emails are stored lowercased, and Sign in still matches the address as typed.
  await signIn(page, priya.email.toUpperCase(), employeePassword, { goto: false })
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('banner').getByText(priya.name)).toBeVisible()
})

test('a taken email, in any case, is refused under Email', async ({ page }) => {
  const priya = newEmployee('duplicate', { first: 'Priya' })
  await page.goto('/sign-up')
  await signUp(page, priya, { goto: false })
  await skipMentorCheck(page)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)

  await page.goto('/sign-up')
  await signUp(page, { name: 'Someone else', email: priya.email.toUpperCase() }, { goto: false })

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
    await signUp(page, newEmployee('wrongrole', { first: 'Priya' }), { goto: false })
    await skipMentorCheck(page)

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
    await signIn(page, admin.email, admin.password, { goto: false })
    await expect(page).toHaveURL(/\/admin\/courses$/)

    await page.goto('/home')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.')
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Courses' })).toBeVisible()
  })
})

test('when the session expires on Home, Sign in returns to it', async ({ page, context }) => {
  const priya = newEmployee('expired', { first: 'Priya' })
  await page.goto('/sign-up')
  await signUp(page, priya, { goto: false })
  const homeRead = decisionsRead(page)
  await skipMentorCheck(page)
  // Home's own read answers first: its Set-Cookie would otherwise restore the session cleared below.
  await homeRead

  await context.clearCookies()
  await page.reload()
  await expect(page).toHaveURL(/\/sign-in\?return=%2Fhome$/)

  await signIn(page, priya.email, employeePassword, { goto: false })
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home')
})
