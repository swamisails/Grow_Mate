import { expect, test, type Page } from '@playwright/test'
import { clearClock, setClock } from '../helpers/clock'

// Seeded by MentorsSeeder: Rafi and Imani mentor Python Basics. Priya mentors nothing.
const demoPassword = 'demo-password'
const priya = { name: 'Priya Nair', email: 'priya.nair@example.com' }
const rafi = { name: 'Rafi Haddad', email: 'rafi.haddad@example.com' }

const learnerDay3 = 'Your request to Rafi Haddad for Python Basics is still waiting.'
const mentorDay3 = 'Reminder: Priya Nair requested you to guide them with Python Basics.'
const learnerDay6 = 'Your request to Rafi Haddad for Python Basics was cancelled. You can request a mentor again.'
const mentorDay6 = "Priya Nair's request for Python Basics was cancelled."

let pending: { sentAt: string; requestId: number } | null = null

function hidesSecrets(body: unknown) {
  const json = JSON.stringify(body)
  expect(json).not.toContain('"route"')
  expect(json).not.toContain('group_assignment_id')
}

function plus(iso: string, hours: number, minutes = 0): string {
  const date = new Date(iso)
  date.setUTCMinutes(date.getUTCMinutes() + hours * 60 + minutes)
  return date.toISOString()
}

/** A timestamp the API returned, as the SPA shows its UTC calendar date: "16 Nov 2026". */
function utcDate(iso: string) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const date = new Date(iso)
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

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

async function requestRafi(page: Page): Promise<{ sentAt: string; requestId: number }> {
  await openCourse(page, 'Python Basics')
  const mentors = page.getByRole('region', { name: 'Mentors' })
  const send = page.waitForResponse(
    (response) => /\/api\/v1\/courses\/\d+\/requests$/.test(response.url()) && response.request().method() === 'POST',
  )
  await mentors.getByRole('listitem').filter({ hasText: rafi.name }).getByRole('button', { name: 'Request' }).click()
  const body = await (await send).json()
  hidesSecrets(body)
  pending = { sentAt: body.data.sent_at, requestId: body.data.id }
  await expectBar(page, 'Not yet started')
  return pending
}

async function acceptLeftover(page: Page, requestId: number, sentAt: string) {
  await setClock(page, plus(sentAt, 1))
  await signIn(page, rafi.email)
  const status = await page.evaluate(async (id) => {
    const token = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length)
    const response = await fetch(`/api/v1/requests/${id}/accept`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(token ?? '') },
      body: '{}',
    })
    return response.status
  }, requestId)
  if (status !== 201 && status !== 404) {
    throw new Error(`cleanup accept failed: ${status}`)
  }
  const list = page.waitForResponse((response) => response.url().endsWith('/api/v1/requests') && response.request().method() === 'GET')
  await page.goto('/requests')
  const body = await (await list).json()
  const ids = (body.data as { id: number }[]).map((row) => row.id)
  expect(ids).not.toContain(requestId)
async function releaseLeftover(page: Page, requestId: number) {
  await page.goto('about:blank')
  await page.context().clearCookies()
  const response = await page.request.delete(`/api/v1/testing/requests/${requestId}`, {
    headers: { Accept: 'application/json' },
  })
  const body: unknown = await response.json()
  if (response.status() !== 200) {
    throw new Error(`cleanup delete failed (${response.status()}): ${JSON.stringify(body)}`)
  }
  hidesSecrets(body)
}

test.afterEach(async ({ page }) => {
  const leftover = pending
  pending = null
  try {
    if (leftover) {
      await acceptLeftover(page, leftover.requestId, leftover.sentAt)
      await releaseLeftover(page, leftover.requestId)
    }
  } finally {
    await clearClock(page)
  }
})

test('an unanswered request is reminded at 72 hours and cancelled at 144 hours', async ({ page }) => {
  test.setTimeout(120_000)
  await page.emulateMedia({ colorScheme: 'light' })
  await signIn(page, priya.email)
  const { sentAt } = await requestRafi(page)

  hidesSecrets(await setClock(page, plus(sentAt, 71, 59)))
  await signIn(page, priya.email)
  await openCourse(page, 'Python Basics')
  await expectBar(page, 'Not yet started')
  await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  await expect(page.getByText('No notices.')).toBeVisible()

  await signOut(page)
  await signIn(page, rafi.email)
  await page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
  await expect(page.getByText(`${priya.name} requested you to guide them with Python Basics`)).toBeVisible()
  await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  await expect(page.getByText('No notices.')).toBeVisible()

  hidesSecrets(await setClock(page, plus(sentAt, 72)))
  await signIn(page, rafi.email)
  await page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
  await expect(page.getByRole('region', { name: 'Requests' }).getByRole('listitem').filter({ hasText: `${priya.name} requested you to guide them with Python Basics` })).toBeVisible()
  const mentorNotices = page.waitForResponse((response) => response.url().endsWith('/api/v1/notices'))
  await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  hidesSecrets(await (await mentorNotices).json())
  const mentorRow = page.getByRole('region', { name: 'Notices' }).getByRole('listitem').filter({ hasText: mentorDay3 })
  await expect(mentorRow).toBeVisible()
  await expect(mentorRow).toContainText(utcDate(plus(sentAt, 72)))
  await expect(page.getByText(mentorDay6)).toHaveCount(0)

  await signOut(page)
  await signIn(page, priya.email)
  const eligibility = page.waitForResponse((response) => response.url().includes('/request-eligibility'))
  await openCourse(page, 'Python Basics')
  expect((await (await eligibility).json()).data.can_request).toBe(false)
  await expectBar(page, 'Not yet started')
  await expect(page.getByRole('button', { name: 'Request' })).toHaveCount(0)
  await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  const learnerRow = page.getByRole('region', { name: 'Notices' }).getByRole('listitem').filter({ hasText: learnerDay3 })
  await expect(learnerRow).toBeVisible()
  await expect(learnerRow).toContainText(utcDate(plus(sentAt, 72)))

  hidesSecrets(await setClock(page, plus(sentAt, 144)))
  await signIn(page, priya.email)
  const progress = page.waitForResponse((response) => /\/api\/v1\/courses\/\d+\/progress$/.test(response.url()))
  const day6Eligibility = page.waitForResponse((response) => response.url().includes('/request-eligibility'))
  await openCourse(page, 'Python Basics')
  const progressBody = await (await progress).json()
  hidesSecrets(progressBody)
  expect(progressBody.data).toEqual({ status: null })
  expect((await (await day6Eligibility).json()).data.can_request).toBe(true)
  await expect(page.getByRole('img', { name: /Progress:/ })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Mentors' }).getByRole('listitem').filter({ hasText: rafi.name }).getByRole('button', { name: 'Request' })).toBeVisible()
  await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  const learnerRows = page.getByRole('region', { name: 'Notices' }).getByRole('listitem')
  await expect(learnerRows).toHaveCount(2)
  await expect(learnerRows.nth(0)).toContainText(learnerDay6)
  await expect(learnerRows.nth(0)).toContainText(utcDate(plus(sentAt, 144)))
  await expect(learnerRows.nth(1)).toContainText(learnerDay3)

  await signOut(page)
  await signIn(page, rafi.email)
  const incoming = page.waitForResponse((response) => response.url().endsWith('/api/v1/requests') && response.request().method() === 'GET')
  await page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
  hidesSecrets(await (await incoming).json())
  await expect(page.getByText('No requests.')).toBeVisible()
  await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  const mentorRows = page.getByRole('region', { name: 'Notices' }).getByRole('listitem')
  await expect(mentorRows).toHaveCount(2)
  await expect(mentorRows.nth(0)).toContainText(mentorDay6)
  await expect(mentorRows.nth(0)).toContainText(utcDate(plus(sentAt, 144)))
  await expect(mentorRows.nth(1)).toContainText(mentorDay3)
})

test('a request accepted after one hour is still a match at 144 hours', async ({ page }) => {
  test.setTimeout(120_000)
  await page.emulateMedia({ colorScheme: 'light' })
  await signIn(page, priya.email)
  const { sentAt } = await requestRafi(page)

  hidesSecrets(await setClock(page, plus(sentAt, 1)))
  await signIn(page, rafi.email)
  await page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
  const row = page.getByRole('listitem').filter({ hasText: `${priya.name} requested you to guide them with Python Basics` })
  await row.getByRole('button', { name: 'Accept' }).click()
  await expect(page.getByText('No requests.')).toBeVisible()

  await signOut(page)
  await signIn(page, priya.email)
  await openCourse(page, 'Python Basics')
  await expectBar(page, 'In progress')

  hidesSecrets(await setClock(page, plus(sentAt, 144)))
  await signIn(page, priya.email)
  const progress = page.waitForResponse((response) => /\/api\/v1\/courses\/\d+\/progress$/.test(response.url()))
  await openCourse(page, 'Python Basics')
  const progressBody = await (await progress).json()
  hidesSecrets(progressBody)
  expect(progressBody.data).toEqual({ status: 'in_progress' })
  await expectBar(page, 'In progress')
  await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  await expect(page.getByText(learnerDay3)).toHaveCount(0)
  await expect(page.getByText(learnerDay6)).toHaveCount(0)

  await signOut(page)
  await signIn(page, rafi.email)
  await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  await expect(page.getByText(mentorDay3)).toHaveCount(0)
  await expect(page.getByText(mentorDay6)).toHaveCount(0)
})
