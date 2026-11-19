import { expect, test, type Page } from '@playwright/test'
import { clearClock, setClock } from '../helpers/clock'
import { adminSignIn, employeePassword, newEmployee, signIn, signOut, signUp, hidesSecrets } from './support/helpers'

// Seeded by MentorsSeeder. The clock spec accepts Priya's request to Rafi before this file runs,
// so that Match is already live. Imani has no Match yet, so a new Learner's request stays pending.
const demoPassword = 'demo-password'
const priya = { name: 'Priya Nair', email: 'priya.nair@example.com' }
const rafi = { name: 'Rafi Haddad', email: 'rafi.haddad@example.com' }
const imani = { name: 'Imani Okafor', email: 'imani.okafor@example.com' }

function plus(iso: string, hours: number): string {
  const date = new Date(iso)
  date.setUTCMinutes(date.getUTCMinutes() + hours * 60)
  return date.toISOString()
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

type HomeData = {
  learning: { course_id: number; course_title: string; status: string; match_id: number | null }[]
  mentoring: { id: number; person_name: string; course_title: string }[]
}

function homeResponse(page: Page) {
  return page.waitForResponse(
    (response) => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/v1/home' && response.ok(),
  )
}

/** The Home read started by `goto('/home')`. Registering first ties the body to that navigation. */
async function homeBody(page: Page): Promise<HomeData> {
  const home = homeResponse(page)
  await page.goto('/home')
  const body = await (await home).json()
  hidesSecrets(body)
  return body.data
}

/** Signs in and returns the Home body from the landing navigation. */
async function signInHome(page: Page, email: string, password: string): Promise<HomeData> {
  const home = homeResponse(page)
  await signIn(page, email, password, { url: /\/home$/ })
  const body = await (await home).json()
  hidesSecrets(body)
  return body.data
}

/** A new Learner requests Imani for Python Basics. Imani has not Accepted. */
async function requestImani(page: Page, label: string) {
  const learner = newEmployee(label, { first: 'Leela', nameWithId: true })
  await signUp(page, learner)
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await openCourse(page, 'Python Basics')
  const send = page.waitForResponse(
    (response) => /\/api\/v1\/courses\/\d+\/requests$/.test(response.url()) && response.request().method() === 'POST',
  )
  await page.getByRole('region', { name: 'Mentors' }).getByRole('listitem').filter({ hasText: imani.name }).getByRole('button', { name: 'Request' }).click()
  const body = await (await send).json()
  hidesSecrets(body)
  return { learner, sentAt: body.data.sent_at as string, courseId: body.data.course_id as number }
}

test('a pending request is on Learning, and the Mentor has no Mentoring card', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  const { learner, courseId } = await requestImani(page, 'pending')

  const learning = await homeBody(page)
  expect(learning.learning).toEqual([
    { course_id: courseId, course_title: 'Python Basics', status: 'not_yet_started', match_id: null },
  ])
  expect(learning.mentoring).toEqual([])
  const row = page.getByRole('region', { name: 'Learning' }).getByRole('listitem')
  await expect(row.getByRole('link', { name: 'Python Basics' })).toHaveAttribute('href', `/courses/${courseId}`)
  await expectBar(page, 'Not yet started')
  await expect(page.getByRole('region', { name: 'Mentoring' })).toHaveCount(0)

  await signOut(page)
  const mentoring = await signInHome(page, imani.email, demoPassword)
  expect(mentoring.mentoring.find((item) => item.person_name === learner.name)).toBeUndefined()
  await expect(page.getByRole('region', { name: 'Learning' })).toContainText("You aren't learning a course yet.")
  await expect(page.getByRole('region', { name: 'Mentoring' })).toHaveCount(0)
})

test("after Accept, Priya's Home and Rafi's Mentoring card open the same Match", async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  const learning = await signInHome(page, priya.email, demoPassword)
  expect(learning.learning).toEqual([
    { course_id: expect.any(Number), course_title: 'Python Basics', status: 'in_progress', match_id: expect.any(Number) },
  ])
  const matchId = learning.learning[0].match_id
  const row = page.getByRole('region', { name: 'Learning' }).getByRole('listitem')
  await expect(row.getByRole('link', { name: 'Python Basics' })).toHaveAttribute('href', `/matches/${matchId}`)
  await expectBar(page, 'In progress')

  await signOut(page)
  const mentoring = await signInHome(page, rafi.email, demoPassword)
  expect(mentoring.mentoring).toContainEqual({ id: matchId, person_name: priya.name, course_title: 'Python Basics' })
  const card = page.getByRole('region', { name: 'Mentoring' })
  await expect(card.locator(`a[href="/matches/${matchId}"]`)).toHaveText(`${priya.name} — Python Basics`)
})

test('either party opens the Match and sees the other person, the Course, and the bar', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  const learning = await signInHome(page, priya.email, demoPassword)
  const matchId = learning.learning[0].match_id
  const opened = page.waitForResponse((response) => response.url().endsWith(`/api/v1/matches/${matchId}`))
  await page.goto(`/matches/${matchId}`)
  hidesSecrets(await (await opened).json())

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Python Basics')
  await expect(page).toHaveTitle('Python Basics · GrowMate')
  const card = page.getByRole('region', { name: rafi.name })
  await expect(card).toContainText('Python Basics')
  await expectBar(page, 'In progress')
  await expect(page.getByRole('main').getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('main').getByRole('link')).toHaveCount(0)

  await signOut(page)
  await signIn(page, rafi.email, demoPassword, { url: /\/home$/ })
  const mentorOpened = page.waitForResponse((response) => response.url().endsWith(`/api/v1/matches/${matchId}`))
  await page.goto(`/matches/${matchId}`)
  const mentorBody = await (await mentorOpened).json()
  hidesSecrets(mentorBody)
  expect(mentorBody.data).toEqual({ person_name: priya.name, course_title: 'Python Basics', status: 'in_progress' })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Python Basics')
  await expect(page.getByRole('region', { name: priya.name })).toBeVisible()
  await expectBar(page, 'In progress')
  await expect(page.getByRole('main').getByRole('button')).toHaveCount(0)
})

test('someone who is not a party gets the not-found page', async ({ page }) => {
  const learning = await signInHome(page, priya.email, demoPassword)
  const matchId = learning.learning[0].match_id

  await signOut(page)
  await signIn(page, imani.email, demoPassword, { url: /\/home$/ })
  const missing = page.waitForResponse((response) => response.url().endsWith(`/api/v1/matches/${matchId}`))
  await page.goto(`/matches/${matchId}`)
  expect((await missing).status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.')
})

test('a cancelled request leaves Learning empty and creates no Match', async ({ page }) => {
  test.setTimeout(120_000)
  const { learner, sentAt } = await requestImani(page, 'cancelled')
  try {
    await setClock(page, plus(sentAt, 144))
    const learning = await signInHome(page, learner.email, employeePassword)
    expect(learning.learning).toEqual([])
    await expect(page.getByRole('region', { name: 'Learning' })).toContainText("You aren't learning a course yet.")
    await expect(page.getByRole('alert')).toHaveCount(0)

    await signOut(page)
    const mentoring = await signInHome(page, imani.email, demoPassword)
    expect(mentoring.mentoring.find((item) => item.person_name === learner.name)).toBeUndefined()
  } finally {
    await clearClock(page)
  }
})

test('Admin gets no Match screen', async ({ page }) => {
  const learning = await signInHome(page, priya.email, demoPassword)
  const matchId = learning.learning[0].match_id
  await signOut(page)

  await adminSignIn(page)
  const home = await page.request.get('/api/v1/home', {
    headers: { Accept: 'application/json', Referer: new URL('/', page.url()).toString() },
  })
  const match = await page.request.get(`/api/v1/matches/${matchId}`, {
    headers: { Accept: 'application/json', Referer: new URL('/', page.url()).toString() },
  })
  expect(home.status()).toBe(403)
  expect(match.status()).toBe(403)

  await page.goto(`/matches/${matchId}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.')
})
