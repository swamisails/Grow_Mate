import { expect, test, type Page } from '@playwright/test'
import { hidesSecrets } from './support/helpers'

// Seeded by MentorsSeeder: Rafi and Imani mentor Python Basics. Priya mentors nothing.
const demoPassword = 'demo-password'
const priya = { name: 'Priya Nair', email: 'priya.nair@example.com' }
const rafi = { name: 'Rafi Haddad', email: 'rafi.haddad@example.com' }
const imani = { name: 'Imani Okafor', email: 'imani.okafor@example.com' }

async function signIn(page: Page, email: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(demoPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/home$/)
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
}

async function openCourse(page: Page, title: string) {
  await page.getByRole('navigation').getByRole('link', { name: 'Courses' }).click()
  await page.getByRole('link', { name: title }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
}

async function expectBar(page: Page, word: 'Not yet started' | 'In progress') {
  const bar = page.getByRole('img', { name: `Progress: ${word}` })
  await expect(bar).toHaveText(word)
  const fill = bar.locator('.progress__fill')
  const track = bar.locator('.progress__track')
  await expect(fill).toHaveCSS('background-color', word === 'In progress' ? 'rgb(47, 111, 219)' : 'rgb(128, 134, 139)')
  const fillBox = await fill.boundingBox()
  const trackBox = await track.boundingBox()
  expect(fillBox).not.toBeNull()
  expect(trackBox).not.toBeNull()
  const ratio = fillBox!.width / trackBox!.width
  expect(ratio).toBeGreaterThan(word === 'In progress' ? 0.4 : 0.9)
  expect(ratio).toBeLessThan(word === 'In progress' ? 0.6 : 1.01)
}

test('an Employee with nothing waiting sees no requests', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await signIn(page, rafi.email)
  const list = page.waitForResponse((response) => response.url().endsWith('/api/v1/requests') && response.request().method() === 'GET')
  await page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Requests')
  await expect(page.getByText('No requests.')).toBeVisible()
  hidesSecrets(await (await list).json())
})

test('Priya requests Rafi, Rafi Accepts, and Request stays hidden for a live Match and for a Mentor', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await signIn(page, priya.email)
  await openCourse(page, 'Python Basics')

  const mentors = page.getByRole('region', { name: 'Mentors' })
  const send = page.waitForResponse(
    (response) => /\/api\/v1\/courses\/\d+\/requests$/.test(response.url()) && response.request().method() === 'POST',
  )
  await mentors.getByRole('listitem').filter({ hasText: rafi.name }).getByRole('button', { name: 'Request' }).click()
  hidesSecrets(await (await send).json())

  await expectBar(page, 'Not yet started')
  await expect(mentors.getByRole('button', { name: 'Request' })).toHaveCount(0)

  const learnerBefore = page.waitForResponse((response) => response.url().endsWith('/api/v1/notices') && response.request().method() === 'GET')
  await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  const learnerBeforeBody = await (await learnerBefore).json()
  hidesSecrets(learnerBeforeBody)
  expect(learnerBeforeBody.data).toEqual([])
  await expect(page.getByText('No notices.')).toBeVisible()

  await signOut(page)
  await signIn(page, rafi.email)
  const incoming = page.waitForResponse((response) => response.url().endsWith('/api/v1/requests') && response.request().method() === 'GET')
  await page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
  hidesSecrets(await (await incoming).json())
  const priyaRow = page.getByRole('listitem').filter({ hasText: `${priya.name} requested you to guide them with Python Basics` })
  await expect(priyaRow).toBeVisible()

  const mentorNotices = page.waitForResponse((response) => response.url().endsWith('/api/v1/notices') && response.request().method() === 'GET')
  await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  const mentorBody = await (await mentorNotices).json()
  hidesSecrets(mentorBody)
  expect(mentorBody.data).toEqual([
    expect.objectContaining({ type: 'request_sent', person_name: priya.name, course_title: 'Python Basics' }),
  ])
  expect(Object.keys(mentorBody.data[0])).toEqual(['id', 'type', 'occurred_at', 'person_name', 'course_title'])
  await expect(page.locator('.notice-row__sentence')).toHaveText([`${priya.name} requested you to guide them with Python Basics`])

  await page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
  const accepted = page.waitForResponse((response) => /\/api\/v1\/requests\/\d+\/accept$/.test(response.url()))
  await page.getByRole('listitem').filter({ hasText: `${priya.name} requested you to guide them with Python Basics` }).getByRole('button', { name: 'Accept' }).click()
  hidesSecrets(await (await accepted).json())
  await expect(page.getByText('No requests.')).toBeVisible()

  const mentorAfter = page.waitForResponse((response) => response.url().endsWith('/api/v1/notices') && response.request().method() === 'GET')
  await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  const mentorAfterBody = await (await mentorAfter).json()
  hidesSecrets(mentorAfterBody)
  expect(mentorAfterBody.data.map((notice: { type: string }) => notice.type)).toEqual(['request_sent'])
  await expect(page.getByText(`${rafi.name} is your mentor for Python Basics.`)).toHaveCount(0)

  await signOut(page)
  await signIn(page, priya.email)
  const progress = page.waitForResponse((response) => /\/api\/v1\/courses\/\d+\/progress$/.test(response.url()))
  const eligibility = page.waitForResponse((response) => /\/api\/v1\/courses\/\d+\/request-eligibility$/.test(response.url()))
  await openCourse(page, 'Python Basics')
  hidesSecrets(await (await progress).json())
  const eligibilityBody = await (await eligibility).json()
  hidesSecrets(eligibilityBody)
  expect(eligibilityBody.data.can_request).toBe(false)
  await expectBar(page, 'In progress')
  await expect(mentors.getByRole('listitem').filter({ hasText: rafi.name })).toBeVisible()
  await expect(mentors.getByRole('button', { name: 'Request' })).toHaveCount(0)
  const learnerNotices = page.waitForResponse((response) => response.url().endsWith('/api/v1/notices') && response.request().method() === 'GET')
  await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  const learnerBody = await (await learnerNotices).json()
  hidesSecrets(learnerBody)
  expect(learnerBody.data).toEqual([
    expect.objectContaining({ type: 'request_accepted', person_name: rafi.name, course_title: 'Python Basics' }),
  ])
  expect(Object.keys(learnerBody.data[0])).toEqual(['id', 'type', 'occurred_at', 'person_name', 'course_title'])
  await expect(page.locator('.notice-row__sentence')).toHaveText([`${rafi.name} is your mentor for Python Basics.`])

  await signOut(page)
  await signIn(page, imani.email)
  const mentorEligibility = page.waitForResponse((response) => /\/api\/v1\/courses\/\d+\/request-eligibility$/.test(response.url()))
  await openCourse(page, 'Python Basics')
  const mentorCard = page.getByRole('region', { name: 'Mentors' })
  const mentorEligibilityBody = await (await mentorEligibility).json()
  hidesSecrets(mentorEligibilityBody)
  expect(mentorEligibilityBody.data.can_request).toBe(false)
  await expect(mentorCard.getByRole('listitem').filter({ hasText: rafi.name })).toBeVisible()
  await expect(mentorCard.getByRole('button', { name: 'Request' })).toHaveCount(0)
})
