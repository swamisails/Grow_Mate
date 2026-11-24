import { expect, test, type Page } from '@playwright/test'
import { clearClock, setClock } from '../helpers/clock'
import {
  adminSignIn,
  apiRequest,
  approvedMentorOnCourse,
  newEmployee,
  newPage,
  newSignedUpEmployee,
  openCourse,
  publishCourse,
  signIn,
  toCourseCompleted,
  waitForGet,
} from './support/helpers'

// The Retake rule (AD-5) on MySQL: after Course Completed (in real time), the Learner fails Bronze once
// through the UI on 31 Jan 2027, then two failing submits race on the last attempt. Exactly one is
// stored; the other is refused as Locked. The Lock ends one month after the second failure without
// overflow (28 Feb), and holds until that instant. Seeded Employees and demo Courses are never used.

const lockStart = '2027-01-31T10:00:00Z'
const lockedUntil = '2027-02-28T10:00:00Z'

/** The clock moved, which signed the page out: sign the Learner in again. */
async function signInAgain(page: Page, email: string) {
  await signIn(page, email, undefined, { url: /\/home$/ })
}

test('two failures Lock Bronze until one month later, and a racing last attempt is stored once', async ({ page, browser }) => {
  // Two sign-ups, a decision, a Match, three clock moves and an Assessment run past the default timeout.
  test.slow()
  await page.emulateMedia({ colorScheme: 'light' })
  const mentor = newEmployee('lock', { first: 'Rafi', nameWithId: true })
  const course = `Lock Practice ${mentor.id}`

  const admin = page
  await adminSignIn(admin)
  let courseId = 0
  await test.step('Noor publishes the Course through the API', async () => {
    courseId = await publishCourse(admin, course)
    // Only Courses published strictly before the account's creation (to the second) can be named.
    await admin.waitForTimeout(1100)
  })

  const mentorSession = await newPage(browser)
  const mentorPage = mentorSession.page
  await test.step('the Mentor names the Course at the Mentor check and Noor approves it', async () => {
    await approvedMentorOnCourse(admin, mentorPage, mentor, course)
  })

  const learner = await newSignedUpEmployee(browser, `${mentor.id}-learner`, 'Priya')
  const learnerPage = learner.page
  await test.step('the Learner Requests, the Mentor Accepts and clicks Course Completed', async () => {
    await toCourseCompleted(learnerPage, mentorPage, { courseId, course, mentorName: mentor.name, learnerName: learner.name })
  })
  await mentorSession.close()

  const attempts = `/api/v1/courses/${courseId}/stages/bronze/attempts`
  try {
    let failing: { question_id: number; option_id: number }[] = []
    await test.step('on 31 Jan 2027 the Learner fails Bronze once through the UI', async () => {
      await setClock(learnerPage, lockStart)
      await signInAgain(learnerPage, learner.email)
      expect((await openCourse(learnerPage, courseId, course)).data).toEqual([{ level: 'bronze', state: 'available' }])

      const read = waitForGet(learnerPage, /^\/api\/v1\/courses\/\d+\/stages\/bronze\/assessment$/)
      await learnerPage.getByRole('region', { name: 'Stages' }).getByRole('link', { name: 'Take Bronze' }).click()
      const question = (await (await read).json()).data.questions[0]
      failing = [{ question_id: question.id, option_id: question.options[1].id }]

      await learnerPage.getByRole('group', { name: '1. Question?' }).getByRole('radio', { name: 'No' }).check()
      const attempt = learnerPage.waitForResponse(
        (response) => response.request().method() === 'POST' && /\/api\/v1\/courses\/\d+\/stages\/bronze\/attempts$/.test(response.url()),
      )
      await learnerPage.getByRole('button', { name: 'Submit answers' }).click()
      expect((await attempt).status()).toBe(201)
      await expect(learnerPage.getByRole('status')).toHaveText('Not passed.')
    })

    await test.step('two failing submits race on the last attempt: one is stored, the other is refused as Locked', async () => {
      const results = await Promise.all([
        apiRequest(learnerPage, 'POST', attempts, { answers: failing }),
        apiRequest(learnerPage, 'POST', attempts, { answers: failing }),
      ])
      const statuses = results.map((result) => result.status).sort()
      expect(statuses).toEqual([201, 409])
      const stored = results.find((result) => result.status === 201)
      const refused = results.find((result) => result.status === 409)
      expect(stored?.body).toEqual({ data: { passed: false } })
      expect(refused?.body).toEqual({ message: 'This stage is locked for now.', code: 'ASSESSMENTS_STAGE_LOCKED' })
    })

    await test.step('the Course page shows "Locked until 28 Feb 2027", with no button and no attempt count', async () => {
      const body = await openCourse(learnerPage, courseId, course)
      expect(body.data).toEqual([{ level: 'bronze', state: 'locked', locked_until: lockedUntil }])
      const card = learnerPage.getByRole('region', { name: 'Stages' })
      await expect(card.getByRole('listitem')).toHaveText('BronzeLocked until 28 Feb 2027')
      await expect(card.getByRole('link')).toHaveCount(0)
      await expect(card.getByRole('button')).toHaveCount(0)
      await expect(card).not.toContainText(/attempt|left/i)
    })

    await test.step('at 09:59Z on 28 Feb Bronze is still Locked and the API refuses the read and the submit', async () => {
      await setClock(learnerPage, '2027-02-28T09:59:00Z')
      await signInAgain(learnerPage, learner.email)
      expect((await openCourse(learnerPage, courseId, course)).data).toEqual([{ level: 'bronze', state: 'locked', locked_until: lockedUntil }])
      await expect(learnerPage.getByRole('region', { name: 'Stages' }).getByRole('listitem')).toHaveText('BronzeLocked until 28 Feb 2027')

      const read = await apiRequest(learnerPage, 'GET', `/api/v1/courses/${courseId}/stages/bronze/assessment`)
      expect(read.status).toBe(409)
      expect(read.body.code).toBe('ASSESSMENTS_STAGE_LOCKED')
      const submit = await apiRequest(learnerPage, 'POST', attempts, { answers: failing })
      expect(submit.status).toBe(409)
      expect(submit.body.code).toBe('ASSESSMENTS_STAGE_LOCKED')
    })

    await test.step('at 10:00Z on 28 Feb the Lock has ended and Take Bronze is back', async () => {
      await setClock(learnerPage, lockedUntil)
      await signInAgain(learnerPage, learner.email)
      expect((await openCourse(learnerPage, courseId, course)).data).toEqual([{ level: 'bronze', state: 'available' }])
      const card = learnerPage.getByRole('region', { name: 'Stages' })
      await expect(card.getByRole('link', { name: 'Take Bronze' })).toBeVisible()
      await expect(card).not.toContainText('Locked')
    })
  } finally {
    await clearClock(learnerPage)
  }

  await learner.close()
})
