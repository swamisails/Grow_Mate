import { expect, test, type Page } from '@playwright/test'
import { signIn } from './support/helpers'

// Seeded by MentorsSeeder in the e2e environment: Rafi and Imani mentor Python Basics; Priya mentors nothing.
const demoPassword = 'demo-password'
const rafi = { name: 'Rafi Haddad', email: 'rafi.haddad@example.com' }

async function openCourse(page: Page, title: string) {
  await page.getByRole('navigation').getByRole('link', { name: 'Courses' }).click()
  await page.getByRole('link', { name: title }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
}

test('a demo Mentor sees every other Mentor of Python Basics, never themselves or a route', async ({ page }) => {
  await signIn(page, rafi.email, demoPassword, { url: /\/home$/ })
  const mentorsResponse = page.waitForResponse((response) => /\/api\/v1\/courses\/\d+\/mentors$/.test(response.url()))
  await openCourse(page, 'Python Basics')

  const card = page.getByRole('region', { name: 'Mentors' })
  await expect(card.getByRole('listitem')).toContainText('Imani Okafor')
  await expect(card.getByRole('button', { name: 'Request' })).toHaveCount(1)
  await expect(card.getByText(rafi.name)).toHaveCount(0)
  await expect(page.getByText(/registration|approval|gold pass|group assignment/i)).toHaveCount(0)

  const response = await mentorsResponse
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.data).toHaveLength(1)
  expect(body.data[0]).toEqual({ id: expect.any(Number), name: 'Imani Okafor' })
  expect(JSON.stringify(body)).not.toContain('route')
})

test('a Course with no Mentors shows the empty state', async ({ page }) => {
  await signIn(page, rafi.email, demoPassword, { url: /\/home$/ })
  await openCourse(page, 'Git Essentials')

  await expect(page.getByRole('region', { name: 'Mentors' })).toContainText('No mentors for this course yet.')
})
