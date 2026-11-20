import { expect, test, type Browser, type Page } from '@playwright/test'
import { clearClock, setClock } from '../helpers/clock'
import {
  adminSignIn,
  decide,
  hidesSecrets,
  newEmployee,
  newPage,
  newSignedUpEmployee,
  publishCourse,
  signIn,
  signUp,
  waitForGet,
} from './support/helpers'

// Epic 2's journeys end to end, beyond the day 3 and day 6 reminders that request-clock.spec.ts covers:
// UJ-1 through Course Completed with its Bronze notice, UJ-2 (a Mentor quits and the Learner requests
// another Mentor), a Learner who quits, Quit then a new Request then a Cancel at day 6, and the
// Upskilling list for an Employee and for Admin. Every Course and Employee carries the run's id, so the
// seeded Priya, Rafi and Imani Matches are never touched. A test that moves the test clock clears it again.

type Person = { id: string; name: string; email: string }
type Session = Person & { page: Page; close: () => Promise<void> }

/** The Quit note's sentence and the Bronze notice, as the Notices list shows them. */
const quitNote = (person: string, course: string) => `${person} quit ${course}.`
const bronzeNote = (course: string) => `Bronze is open for ${course}.`

function plus(iso: string, hours: number): string {
  const date = new Date(iso)
  date.setUTCMinutes(date.getUTCMinutes() + hours * 60)
  return date.toISOString()
}

async function expectBar(page: Page, word: 'Not yet started' | 'In progress' | 'Quit') {
  await expect(page.getByRole('img', { name: `Progress: ${word}` })).toHaveText(word)
}

/** Admin approves a new Mentor who named the Course at sign-up; the Mentor ends on Home. */
async function approvedMentor(admin: Page, browser: Browser, mentor: Person, course: string) {
  const session = await newPage(browser)
  await signUp(session.page, mentor)
  await expect(session.page).toHaveURL(/\/mentor-check$/)
  await session.page.getByRole('group', { name: 'Courses you can mentor' }).getByRole('checkbox', { name: course }).check()
  await session.page.getByRole('button', { name: 'Submit' }).click()
  await expect(session.page).toHaveURL(/\/home$/)

  await admin.goto('/admin/registration-decisions')
  await decide(admin, admin.getByRole('row').filter({ hasText: mentor.name }).filter({ hasText: course }), 'Approve', 'Approved')
  return session
}

/** The Learner Requests the Mentor on the Course page; resolves to the Request's `sent_at`. */
async function sendRequest(learner: Page, courseId: number, mentorName: string): Promise<string> {
  await learner.goto(`/courses/${courseId}`)
  const send = learner.waitForResponse(
    (response) => response.request().method() === 'POST' && /\/api\/v1\/courses\/\d+\/requests$/.test(response.url()),
  )
  await learner.getByRole('region', { name: 'Mentors' }).getByRole('listitem').filter({ hasText: mentorName }).getByRole('button', { name: 'Request' }).click()
  const response = await send
  expect(response.status()).toBe(201)
  const body = await response.json()
  hidesSecrets(body)
  return body.data.sent_at
}

/** The Mentor Accepts the Learner's Request, which makes the Match. */
async function acceptRequest(mentor: Page, learnerName: string) {
  await mentor.goto('/requests')
  const accepted = mentor.waitForResponse((response) => /\/api\/v1\/requests\/\d+\/accept$/.test(response.url()))
  await mentor.getByRole('listitem').filter({ hasText: learnerName }).getByRole('button', { name: 'Accept' }).click()
  expect((await accepted).status()).toBe(201)
}

/** Opens the live Match from Home through the named card's row. */
async function openMatch(page: Page, card: 'Learning' | 'Mentoring', row: string | RegExp) {
  await page.goto('/home')
  await page.getByRole('region', { name: card }).getByRole('link', { name: row }).click()
  await expect(page).toHaveURL(/\/matches\/\d+$/)
}

/** On the Match screen: opens Quit Course, sends the reason and waits for the Match to end. */
async function quit(page: Page, reason: string) {
  await page.getByRole('button', { name: 'Quit Course' }).click()
  const dialog = page.getByRole('dialog', { name: 'Quit Course' })
  await dialog.getByLabel('Reason').fill(reason)
  const quitting = page.waitForResponse((response) => response.request().method() === 'POST' && /\/api\/v1\/matches\/\d+\/quit$/.test(response.url()))
  await dialog.getByRole('button', { name: 'Quit Course' }).click()
  const response = await quitting
  expect(response.ok()).toBe(true)
  await expect(page).toHaveURL(/\/home$/)
}

/** The Employee's Notices list. */
async function openNotices(page: Page) {
  await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  const notices = page.getByRole('region', { name: 'Notices' })
  await expect(notices).toBeVisible()
  return notices
}

/** A live Match's absence from Home: the Mentoring card is gone, and the Learner's row no longer opens a Match. */
async function expectNoMatchOnHome(page: Page, who: 'Mentor' | 'Learner') {
  await page.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
  await expect(page.getByRole('region', { name: 'Learning' })).toBeVisible()
  if (who === 'Mentor') {
    await expect(page.getByRole('region', { name: 'Mentoring' })).toHaveCount(0)
  }
  await expect(page.locator('a[href^="/matches/"]')).toHaveCount(0)
}

test('UJ-1: Course Completed ends the Match, opens Bronze with a notice, and the bar stays In progress', async ({ page, browser }) => {
  // Three sign-ups, a decision and a Match run past the default 30 s timeout.
  test.slow()
  await page.emulateMedia({ colorScheme: 'light' })
  const mentor = newEmployee('uj1', { first: 'Rafi', nameWithId: true })
  const course = `Completion Practice ${mentor.id}`

  const admin = page
  await adminSignIn(admin)
  let courseId = 0
  await test.step('Noor publishes the Course through the API', async () => {
    courseId = await publishCourse(admin, course)
    // Only Courses published strictly before the account's creation (to the second) can be named.
    await admin.waitForTimeout(1100)
  })
  const mentorSession = await approvedMentor(admin, browser, mentor, course)
  const learner = await newSignedUpEmployee(browser, `${mentor.id}-learner`, 'Priya')

  await test.step('the Learner Requests and the Mentor Accepts', async () => {
    await sendRequest(learner.page, courseId, mentor.name)
    await acceptRequest(mentorSession.page, learner.name)
    await openMatch(learner.page, 'Learning', course)
    await expectBar(learner.page, 'In progress')
  })

  await test.step('the Mentor confirms Course Completed', async () => {
    await openMatch(mentorSession.page, 'Mentoring', new RegExp(learner.name))
    await mentorSession.page.getByRole('button', { name: 'Course Completed' }).click()
    const dialog = mentorSession.page.getByRole('dialog', { name: 'Course Completed' })
    const completed = mentorSession.page.waitForResponse((response) => /\/api\/v1\/matches\/\d+\/course-completed$/.test(response.url()))
    await dialog.getByRole('button', { name: 'Course Completed' }).click()
    expect((await completed).status()).toBe(204)
    await expect(mentorSession.page).toHaveURL(/\/home$/)
  })

  await test.step('the Match is gone for both', async () => {
    await expectNoMatchOnHome(mentorSession.page, 'Mentor')
    await expectNoMatchOnHome(learner.page, 'Learner')
  })

  await test.step('the Learner has the Bronze notice, an In progress bar, no Request button and Bronze available', async () => {
    const notices = await openNotices(learner.page)
    await expect(notices.getByRole('listitem').filter({ hasText: bronzeNote(course) })).toHaveCount(1)

    const eligibility = waitForGet(learner.page, /\/request-eligibility$/)
    const stages = waitForGet(learner.page, /^\/api\/v1\/courses\/\d+\/stages$/)
    await learner.page.goto(`/courses/${courseId}`)
    await eligibility
    expect((await (await stages).json()).data).toEqual([{ level: 'bronze', state: 'available' }])
    await expect(learner.page.getByRole('region', { name: 'Mentors' })).toBeVisible()
    await expectBar(learner.page, 'In progress')
    await expect(learner.page.getByRole('button', { name: 'Request' })).toHaveCount(0)
    const card = learner.page.getByRole('region', { name: 'Stages' })
    await expect(card.getByRole('listitem')).toHaveCount(1)
    await expect(card.getByRole('listitem')).toContainText('Bronze')
    await expect(card.getByRole('link', { name: 'Take Bronze' })).toBeVisible()
  })

  await Promise.all([mentorSession.close(), learner.close()])
})

test('UJ-2: a Mentor quits, the Learner sees why and requests another Mentor; a blank reason is refused', async ({ page, browser }) => {
  test.slow()
  await page.emulateMedia({ colorScheme: 'light' })
  const first = newEmployee('uj2', { first: 'Rafi', nameWithId: true })
  const second = newEmployee('uj2b', { first: 'Imani', nameWithId: true })
  const course = `Quit Practice ${first.id}`

  const admin = page
  await adminSignIn(admin)
  let courseId = 0
  await test.step('Noor publishes the Course through the API', async () => {
    courseId = await publishCourse(admin, course)
    await admin.waitForTimeout(1100)
  })
  const firstSession = await approvedMentor(admin, browser, first, course)
  const secondSession = await approvedMentor(admin, browser, second, course)
  const learner = await newSignedUpEmployee(browser, `${first.id}-learner`, 'Priya')

  await test.step('a Match is made', async () => {
    await sendRequest(learner.page, courseId, first.name)
    await acceptRequest(firstSession.page, learner.name)
  })

  await test.step('a blank reason shows an inline error and the Match stays live', async () => {
    await openMatch(firstSession.page, 'Mentoring', new RegExp(learner.name))
    const matchUrl = firstSession.page.url()
    await firstSession.page.getByRole('button', { name: 'Quit Course' }).click()
    const dialog = firstSession.page.getByRole('dialog', { name: 'Quit Course' })
    await dialog.getByRole('button', { name: 'Quit Course' }).click()
    await expect(dialog.getByRole('alert')).toBeVisible()
    await expect(dialog).toBeVisible()
    await expect(firstSession.page).toHaveURL(matchUrl)
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toHaveCount(0)
    await openMatch(learner.page, 'Learning', course)
    await expectBar(learner.page, 'In progress')
  })

  await test.step('the Mentor quits with a reason', async () => {
    await openMatch(firstSession.page, 'Mentoring', new RegExp(learner.name))
    await quit(firstSession.page, 'Moving teams, sorry')
  })

  await test.step('the Learner has the notice with the quoted reason and a Quit bar, and the Match is gone', async () => {
    const notices = await openNotices(learner.page)
    const note = notices.getByRole('listitem').filter({ hasText: quitNote(first.name, course) })
    await expect(note).toHaveCount(1)
    await expect(note).toContainText('“Moving teams, sorry”')

    await learner.page.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
    await expect(learner.page.getByRole('region', { name: 'Learning' }).getByRole('listitem').filter({ hasText: course })).toContainText('Quit')
    await expectNoMatchOnHome(learner.page, 'Learner')
    await expectNoMatchOnHome(firstSession.page, 'Mentor')
  })

  await test.step('the Learner requests another Mentor', async () => {
    await sendRequest(learner.page, courseId, second.name)
    await expectBar(learner.page, 'Not yet started')
    await acceptRequest(secondSession.page, learner.name)
    await learner.page.goto(`/courses/${courseId}`)
    await expectBar(learner.page, 'In progress')
  })

  await Promise.all([firstSession.close(), secondSession.close(), learner.close()])
})

test('a Learner quits: the Mentor gets the Quit note and the Learner bar is Quit', async ({ page, browser }) => {
  test.slow()
  await page.emulateMedia({ colorScheme: 'light' })
  const mentor = newEmployee('uj2l', { first: 'Rafi', nameWithId: true })
  const course = `Learner Quit Practice ${mentor.id}`

  const admin = page
  await adminSignIn(admin)
  let courseId = 0
  await test.step('Noor publishes the Course through the API', async () => {
    courseId = await publishCourse(admin, course)
    await admin.waitForTimeout(1100)
  })
  const mentorSession = await approvedMentor(admin, browser, mentor, course)
  const learner = await newSignedUpEmployee(browser, `${mentor.id}-learner`, 'Priya')

  await sendRequest(learner.page, courseId, mentor.name)
  await acceptRequest(mentorSession.page, learner.name)

  await test.step('the Learner quits with a reason', async () => {
    await openMatch(learner.page, 'Learning', course)
    await quit(learner.page, 'This is not the right fit')
  })

  await test.step('the Mentor gets the Quit note, and the Learner bar is Quit', async () => {
    const notices = await openNotices(mentorSession.page)
    const note = notices.getByRole('listitem').filter({ hasText: quitNote(learner.name, course) })
    await expect(note).toHaveCount(1)
    await expect(note).toContainText('“This is not the right fit”')
    await expectNoMatchOnHome(mentorSession.page, 'Mentor')

    await learner.page.goto(`/courses/${courseId}`)
    await expectBar(learner.page, 'Quit')
    await expectNoMatchOnHome(learner.page, 'Learner')
  })

  await Promise.all([mentorSession.close(), learner.close()])
})

test('Quit, then a new Request, then a Cancel at day 6 leaves no bar and no status', async ({ page, browser }) => {
  test.slow()
  await page.emulateMedia({ colorScheme: 'light' })
  const mentor = newEmployee('uj2c', { first: 'Rafi', nameWithId: true })
  const course = `Cancel Practice ${mentor.id}`

  const admin = page
  await adminSignIn(admin)
  let courseId = 0
  await test.step('Noor publishes the Course through the API', async () => {
    courseId = await publishCourse(admin, course)
    await admin.waitForTimeout(1100)
  })
  const mentorSession = await approvedMentor(admin, browser, mentor, course)
  const learner = await newSignedUpEmployee(browser, `${mentor.id}-learner`, 'Priya')
  const later = await newPage(browser)

  try {
    await sendRequest(learner.page, courseId, mentor.name)
    await acceptRequest(mentorSession.page, learner.name)
    await openMatch(learner.page, 'Learning', course)
    await quit(learner.page, 'Changed my mind')
    await learner.page.goto(`/courses/${courseId}`)
    await expectBar(learner.page, 'Quit')

    await test.step('a new Request turns the Quit bar into Not yet started', async () => {
      const sentAt = await sendRequest(learner.page, courseId, mentor.name)
      await expectBar(learner.page, 'Not yet started')

      await test.step('the clock passes day 6 and the Request is cancelled', async () => {
        // setClock signs every page out, so the Learner signs in again in a new context.
        hidesSecrets(await setClock(page, plus(sentAt, 144)))
        await signIn(later.page, learner.email, undefined, { url: /\/home$/ })
        const progress = waitForGet(later.page, /\/courses\/\d+\/progress$/)
        await later.page.goto(`/courses/${courseId}`)
        const progressBody = await (await progress).json()
        hidesSecrets(progressBody)
        expect(progressBody.data).toEqual({ status: null })
        await expect(later.page.getByRole('region', { name: 'Mentors' })).toBeVisible()
        await expect(later.page.getByRole('img', { name: /Progress:/ })).toHaveCount(0)
        await later.page.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
        await expect(later.page.getByRole('region', { name: 'Learning' })).toBeVisible()
        await expect(later.page.getByRole('region', { name: 'Learning' }).getByRole('listitem').filter({ hasText: course })).toHaveCount(0)
      })
    })
  } finally {
    await clearClock(page)
  }

  await Promise.all([mentorSession.close(), learner.close(), later.close()])
})

test('the Upskilling list shows only this run\'s In progress rows, sorted, to an Employee and to Admin', async ({ page, browser }) => {
  // Seven sign-ups, four Requests and a Quit run past the default 30 s timeout.
  test.slow()
  await page.emulateMedia({ colorScheme: 'light' })
  const mentor = newEmployee('uj-up', { first: 'Rafi', nameWithId: true })
  const course = `Upskilling Practice ${mentor.id}`

  const admin = page
  await adminSignIn(admin)
  let courseId = 0
  await test.step('Noor publishes the Course through the API', async () => {
    courseId = await publishCourse(admin, course)
    await admin.waitForTimeout(1100)
  })
  const mentorSession = await approvedMentor(admin, browser, mentor, course)

  // Zara signs up before Asha, so the sorted list is not the order of creation.
  const zara: Session = await newSignedUpEmployee(browser, `${mentor.id}-z`, 'Zara')
  const asha: Session = await newSignedUpEmployee(browser, `${mentor.id}-a`, 'Asha')
  const ben: Session = await newSignedUpEmployee(browser, `${mentor.id}-b`, 'Ben')
  const chloe: Session = await newSignedUpEmployee(browser, `${mentor.id}-c`, 'Chloe')

  await test.step('Zara and Asha are In progress, Ben has Quit and Chloe has not yet started', async () => {
    for (const learner of [zara, asha, ben]) {
      await sendRequest(learner.page, courseId, mentor.name)
      await acceptRequest(mentorSession.page, learner.name)
    }
    await openMatch(ben.page, 'Learning', course)
    await quit(ben.page, 'Not for me')
    await sendRequest(chloe.page, courseId, mentor.name)
  })

  const expectList = async (viewer: Page) => {
    const read = waitForGet(viewer, /^\/api\/v1\/upskilling$/)
    await viewer.getByRole('navigation').getByRole('link', { name: 'Upskilling' }).click()
    await expect(viewer).toHaveURL(/\/upskilling$/)
    hidesSecrets(await (await read).json())
    const list = viewer.getByRole('region', { name: 'Upskilling' })
    await expect(list.getByRole('columnheader')).toHaveText(['Name', 'Course', 'Status'])
    const rows = list.getByRole('row').filter({ hasText: course })
    await expect(rows).toHaveCount(2)
    await expect(rows.nth(0)).toContainText(asha.name)
    await expect(rows.nth(1)).toContainText(zara.name)
    for (const index of [0, 1]) {
      await expect(rows.nth(index).getByRole('cell')).toHaveCount(3)
      await expect(rows.nth(index).getByRole('img', { name: 'Progress: In progress' })).toBeVisible()
    }
    await expect(list.getByText(ben.name)).toHaveCount(0)
    await expect(list.getByText(chloe.name)).toHaveCount(0)
    // Read-only: no counts, links or actions.
    await expect(list.getByRole('button')).toHaveCount(0)
    await expect(list.getByRole('link')).toHaveCount(0)
  }

  await test.step('an Employee sees them', async () => {
    await expectList(asha.page)
  })
  await test.step('Admin sees the same list', async () => {
    await expectList(admin)
  })

  await Promise.all([mentorSession.close(), zara.close(), asha.close(), ben.close(), chloe.close()])
})
