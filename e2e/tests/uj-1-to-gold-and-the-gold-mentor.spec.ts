import { expect, test, type Page } from '@playwright/test'
import { clearClock, setClock } from '../helpers/clock'
import {
  adminSignIn,
  apiRequest,
  approvedMentorOnCourse,
  hidesSecrets,
  newEmployee,
  newPage,
  newSignedUpEmployee,
  openCourse,
  passStageThroughApi,
  publishCourse,
  signIn,
  toCourseCompleted,
  waitForGet,
} from './support/helpers'

// Epic 3 end to end. UJ-1 step 4 through the UI: after Course Completed a Learner passes Bronze, fails
// Silver once and retakes it at once, then passes Gold; the bar reads Completed, and the new Gold
// Mentor Accepts another Employee's Request (SM-2, epic R7). Then a Lock on a later Stage: Silver
// failed twice under the test clock keeps Gold hidden, and Take Silver comes back when the Lock ends.
// Each test uses fresh Employees and a run-tagged Course; seeded Employees and demo Courses are never used.

type Level = 'bronze' | 'silver' | 'gold'
const levelName: Record<Level, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' }

/**
 * From the Course page, takes one Stage through the UI with one answer and expects the result; then
 * goes Back to the Course and returns the body of its Stages read.
 */
async function takeInUi(page: Page, courseId: number, course: string, level: Level, answer: 'Yes' | 'No', result: 'Passed.' | 'Not passed.') {
  await page.getByRole('region', { name: 'Stages' }).getByRole('link', { name: `Take ${levelName[level]}` }).click()
  await expect(page).toHaveURL(new RegExp(`/courses/${courseId}/stages/${level}$`))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${course} — ${levelName[level]}`)
  await page.getByRole('group', { name: '1. Question?' }).getByRole('radio', { name: answer }).check()

  const attempt = page.waitForResponse(
    (response) => response.request().method() === 'POST' && new RegExp(`/api/v1/courses/\\d+/stages/${level}/attempts$`).test(response.url()),
  )
  await page.getByRole('button', { name: 'Submit answers' }).click()
  const response = await attempt
  expect(response.status()).toBe(201)
  const body = await response.json()
  hidesSecrets(body)
  expect(body).toEqual({ data: { passed: result === 'Passed.' } })
  await expect(page.getByRole('status')).toHaveText(result)

  const stages = waitForGet(page, /^\/api\/v1\/courses\/\d+\/stages$/)
  await page.getByRole('link', { name: `Back to ${course}` }).click()
  await expect(page).toHaveURL(new RegExp(`/courses/${courseId}$`))
  const stagesBody = await (await stages).json()
  hidesSecrets(stagesBody)
  return stagesBody
}

/** Fails a Stage through the API, choosing the wrong "No" option. */
async function failStageThroughApi(page: Page, courseId: number, level: Level) {
  const read = await apiRequest(page, 'GET', `/api/v1/courses/${courseId}/stages/${level}/assessment`)
  expect(read.status).toBe(200)
  const question = read.body.data.questions[0]
  const no = question.options.find((option: { text: string }) => option.text === 'No')
  const submit = await apiRequest(page, 'POST', `/api/v1/courses/${courseId}/stages/${level}/attempts`, {
    answers: [{ question_id: question.id, option_id: no.id }],
  })
  expect(submit.status).toBe(201)
  hidesSecrets(submit.body)
  expect(submit.body).toEqual({ data: { passed: false } })
}

/** The clock moved, which signed the page out: sign the Learner in again. */
async function signInAgain(page: Page, email: string) {
  await signIn(page, email, undefined, { url: /\/home$/ })
}

test('UJ-1 through the UI to Gold and Completed, then the new Gold Mentor Accepts a Request', async ({ page, browser }) => {
  // Four sign-ups, a decision, two Matches and four Assessments run past the default 30 s timeout.
  test.slow()
  await page.emulateMedia({ colorScheme: 'light' })
  const mentor = newEmployee('uj1', { first: 'Rafi', nameWithId: true })
  const course = `UJ-1 Practice ${mentor.id}`

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

  await test.step('Bronze answered "Yes" reads "Passed.", and Silver opens', async () => {
    expect((await openCourse(learnerPage, courseId, course)).data).toEqual([{ level: 'bronze', state: 'available' }])
    const stages = await takeInUi(learnerPage, courseId, course, 'bronze', 'Yes', 'Passed.')
    expect(stages.data).toEqual([
      { level: 'bronze', state: 'passed' },
      { level: 'silver', state: 'available' },
    ])
  })

  await test.step('Silver answered "No" reads "Not passed.", and the retake is offered straight away', async () => {
    const stages = await takeInUi(learnerPage, courseId, course, 'silver', 'No', 'Not passed.')
    expect(stages.data).toEqual([
      { level: 'bronze', state: 'passed' },
      { level: 'silver', state: 'available' },
    ])
    const card = learnerPage.getByRole('region', { name: 'Stages' })
    await expect(card.getByRole('listitem')).toHaveText(['BronzePassed', 'SilverTake Silver'])
    await expect(card).not.toContainText('Locked')
    await expect(card).not.toContainText('Gold')
  })

  await test.step('Silver retaken at once with "Yes" reads "Passed.", and Gold opens', async () => {
    const stages = await takeInUi(learnerPage, courseId, course, 'silver', 'Yes', 'Passed.')
    expect(stages.data).toEqual([
      { level: 'bronze', state: 'passed' },
      { level: 'silver', state: 'passed' },
      { level: 'gold', state: 'available' },
    ])
    await expect(learnerPage.getByRole('img', { name: 'Progress: In progress' })).toBeVisible()
  })

  await test.step('Gold answered "Yes" reads "Passed.", and the Course page and Home read Completed', async () => {
    const progress = waitForGet(learnerPage, /^\/api\/v1\/courses\/\d+\/progress$/)
    const stages = await takeInUi(learnerPage, courseId, course, 'gold', 'Yes', 'Passed.')
    expect(stages.data).toEqual([
      { level: 'bronze', state: 'passed' },
      { level: 'silver', state: 'passed' },
      { level: 'gold', state: 'passed' },
    ])
    const progressBody = await (await progress).json()
    hidesSecrets(progressBody)
    expect(progressBody).toEqual({ data: { status: 'completed' } })
    await expect(learnerPage.getByRole('img', { name: 'Progress: Completed' })).toBeVisible()

    const home = waitForGet(learnerPage, /^\/api\/v1\/home$/)
    await learnerPage.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
    await expect(learnerPage).toHaveURL(/\/home$/)
    hidesSecrets(await (await home).json())
    const row = learnerPage.getByRole('region', { name: 'Learning' }).getByRole('listitem').filter({ hasText: course })
    await expect(row.getByRole('img', { name: 'Progress: Completed' })).toBeVisible()
  })

  const requester = await newSignedUpEmployee(browser, `${mentor.id}-requester`, 'Sam')
  const requesterPage = requester.page
  await test.step('another Employee finds the new Mentor in the Course\'s Mentors list, with a Request button', async () => {
    const mentors = waitForGet(requesterPage, /^\/api\/v1\/courses\/\d+\/mentors$/)
    await openCourse(requesterPage, courseId, course)
    const mentorsBody = await (await mentors).json()
    hidesSecrets(mentorsBody)
    expect(mentorsBody.data.map((row: { name: string }) => row.name)).toContain(learner.name)
    const listed = requesterPage.getByRole('region', { name: 'Mentors' }).getByRole('listitem').filter({ hasText: learner.name })
    await expect(listed).toHaveCount(1)
    await expect(listed.getByRole('button', { name: 'Request' })).toBeVisible()
  })

  await test.step('that Employee Requests the new Mentor, who Accepts (SM-2)', async () => {
    const send = requesterPage.waitForResponse(
      (response) => response.request().method() === 'POST' && /\/api\/v1\/courses\/\d+\/requests$/.test(response.url()),
    )
    await requesterPage.getByRole('region', { name: 'Mentors' }).getByRole('listitem').filter({ hasText: learner.name }).getByRole('button', { name: 'Request' }).click()
    const sent = await send
    expect(sent.status()).toBe(201)
    hidesSecrets(await sent.json())

    const incoming = waitForGet(learnerPage, /^\/api\/v1\/requests$/)
    await learnerPage.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
    hidesSecrets(await (await incoming).json())
    const accepted = learnerPage.waitForResponse((response) => /\/api\/v1\/requests\/\d+\/accept$/.test(response.url()))
    await learnerPage.getByRole('listitem').filter({ hasText: requester.name }).getByRole('button', { name: 'Accept' }).click()
    const acceptedResponse = await accepted
    expect(acceptedResponse.status()).toBe(201)
    hidesSecrets(await acceptedResponse.json())
  })

  await test.step('the Requester\'s bar reads In progress, and the new Mentor\'s Home lists them under Mentoring', async () => {
    const progress = waitForGet(requesterPage, /^\/api\/v1\/courses\/\d+\/progress$/)
    await openCourse(requesterPage, courseId, course)
    hidesSecrets(await (await progress).json())
    await expect(requesterPage.getByRole('img', { name: 'Progress: In progress' })).toBeVisible()

    const home = waitForGet(learnerPage, /^\/api\/v1\/home$/)
    await learnerPage.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
    await expect(learnerPage).toHaveURL(/\/home$/)
    hidesSecrets(await (await home).json())
    await expect(learnerPage.getByRole('region', { name: 'Mentoring' }).getByRole('link', { name: new RegExp(requester.name) })).toBeVisible()
  })

  await requester.close()
  await learner.close()
})

const lockStart = '2027-03-10T10:00:00Z'
const lockedUntil = '2027-04-10T10:00:00Z'

test('a Silver Lock keeps Gold hidden, and Take Silver comes back when the Lock ends', async ({ page, browser }) => {
  // Two sign-ups, a decision, a Match and two clock moves run past the default 30 s timeout.
  test.slow()
  await page.emulateMedia({ colorScheme: 'light' })
  const mentor = newEmployee('silver-lock', { first: 'Rafi', nameWithId: true })
  const course = `Silver Lock Practice ${mentor.id}`

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

  await test.step('the Learner passes Bronze through the API', async () => {
    await passStageThroughApi(learnerPage, courseId, 'bronze')
  })

  try {
    await test.step('on 10 Mar 2027 two Silver failures Lock Silver, and Gold stays hidden', async () => {
      await setClock(learnerPage, lockStart)
      await signInAgain(learnerPage, learner.email)
      await failStageThroughApi(learnerPage, courseId, 'silver')
      await failStageThroughApi(learnerPage, courseId, 'silver')

      const body = await openCourse(learnerPage, courseId, course)
      hidesSecrets(body)
      expect(body.data).toEqual([
        { level: 'bronze', state: 'passed' },
        { level: 'silver', state: 'locked', locked_until: lockedUntil },
      ])
      const card = learnerPage.getByRole('region', { name: 'Stages' })
      await expect(card.getByRole('listitem')).toHaveText(['BronzePassed', 'SilverLocked until 10 Apr 2027'])
      await expect(card.getByRole('link')).toHaveCount(0)
      await expect(card).not.toContainText('Gold')

      const gold = await apiRequest(learnerPage, 'GET', `/api/v1/courses/${courseId}/stages/gold/assessment`)
      expect(gold.status).toBe(409)
      expect(gold.body.code).toBe('ASSESSMENTS_STAGE_UNAVAILABLE')
      hidesSecrets(gold.body)
    })

    await test.step('at 10:00Z on 10 Apr the Lock has ended: Take Silver is back, and Gold waits for Silver', async () => {
      await setClock(learnerPage, lockedUntil)
      await signInAgain(learnerPage, learner.email)
      const body = await openCourse(learnerPage, courseId, course)
      hidesSecrets(body)
      expect(body.data).toEqual([
        { level: 'bronze', state: 'passed' },
        { level: 'silver', state: 'available' },
      ])
      const card = learnerPage.getByRole('region', { name: 'Stages' })
      await expect(card.getByRole('link', { name: 'Take Silver' })).toBeVisible()
      await expect(card).not.toContainText('Locked')
      await expect(card).not.toContainText('Gold')

      const gold = await apiRequest(learnerPage, 'GET', `/api/v1/courses/${courseId}/stages/gold/assessment`)
      expect(gold.status).toBe(409)
      expect(gold.body.code).toBe('ASSESSMENTS_STAGE_UNAVAILABLE')

      await passStageThroughApi(learnerPage, courseId, 'silver')
      expect((await openCourse(learnerPage, courseId, course)).data).toEqual([
        { level: 'bronze', state: 'passed' },
        { level: 'silver', state: 'passed' },
        { level: 'gold', state: 'available' },
      ])
      await expect(card.getByRole('link', { name: 'Take Gold' })).toBeVisible()
    })
  } finally {
    await clearClock(learnerPage)
  }

  await learner.close()
})
