import { expect, test, type Page } from '@playwright/test'

// Seeded by MentorsSeeder in the e2e environment: Rafi and Imani mentor Python Basics; Priya mentors nothing.
const demoPassword = 'demo-password'
const rafi = { name: 'Rafi Haddad', email: 'rafi.haddad@example.com' }

async function signIn(page: Page, email: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(demoPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/home$/)
}

async function openCourse(page: Page, title: string) {
  await page.getByRole('navigation').getByRole('link', { name: 'Courses' }).click()
  await page.getByRole('link', { name: title }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
}

test('a demo Mentor sees every other Mentor of Python Basics, never themselves or a route', async ({ page }) => {
  await signIn(page, rafi.email)
  const mentorsResponse = page.waitForResponse((response) => /\/api\/v1\/courses\/\d+\/mentors$/.test(response.url()))
  await openCourse(page, 'Python Basics')

  const card = page.getByRole('region', { name: 'Mentors' })
  await expect(card.getByRole('listitem')).toHaveText(['Imani Okafor'])
  await expect(card.getByText(rafi.name)).toHaveCount(0)
  await expect(card.getByRole('button')).toHaveCount(0)
  await expect(page.getByText(/registration|approval|gold pass|group assignment/i)).toHaveCount(0)

  const response = await mentorsResponse
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.data).toHaveLength(1)
  expect(body.data[0]).toEqual({ id: expect.any(Number), name: 'Imani Okafor' })
  expect(JSON.stringify(body)).not.toContain('route')
})

test('a Course with no Mentors shows the empty state', async ({ page }) => {
  await signIn(page, rafi.email)
  await openCourse(page, 'Git Essentials')

  await expect(page.getByRole('region', { name: 'Mentors' })).toContainText('No mentors for this course yet.')
})
