import { expect, test, type Page } from '@playwright/test'
import {
  adminSignIn,
  apiRequest,
  approvedMentorOnCourse,
  hidesSecrets,
  newEmployee,
  newPage,
  newSignedUpEmployee,
  openCourse as openCourseAndReadStages,
  publishCourse,
  waitForGet,
} from './support/helpers'

// Epic 3's tracer bullet (UJ-1 step 7, through Bronze): a run-tagged Course, a Mentor approved at
// registration, and a Learner. Before Course Completed the Course page has no Stages card; after it,
// Take Bronze leads to "Passed." and Bronze then reads Passed, with Take Silver and no Gold. No API
// response the Learner gets ever says which option is correct, nor a score or count. Seeded
// Employees and demo Courses are never used.

/** Fails when a body carries the correct option, a score, a count or the Pass mark. */
function hidesAnswers(body: unknown) {
  const json = JSON.stringify(body)
  for (const key of ['is_correct', 'correct_count', 'question_count', 'pass_mark', 'score', 'correct']) {
    expect(json).not.toContain(`"${key}"`)
  }
  hidesSecrets(body)
}

/** Opens the Course page and returns the body of its own Stages read, which must hide the answers. */
async function openCourse(page: Page, courseId: number, title: string) {
  const body = await openCourseAndReadStages(page, courseId, title)
  hidesAnswers(body)
  return body
}

test('a Learner takes Bronze after Course Completed and sees "Passed."', async ({ page, browser }) => {
  // Two sign-ups, a decision, a Match and an Assessment run past the default 30 s timeout.
  test.slow()
  await page.emulateMedia({ colorScheme: 'light' })
  const mentor = newEmployee('bronze', { first: 'Rafi', nameWithId: true })
  const course = `Bronze Practice ${mentor.id}`

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
  await test.step('before Course Completed the Course page has no Stages card, and Bronze is refused', async () => {
    expect((await openCourse(learnerPage, courseId, course)).data).toEqual([])
    await expect(learnerPage.getByRole('region', { name: 'Stages' })).toHaveCount(0)

    const send = learnerPage.waitForResponse(
      (response) => response.request().method() === 'POST' && /\/api\/v1\/courses\/\d+\/requests$/.test(response.url()),
    )
    await learnerPage.getByRole('region', { name: 'Mentors' }).getByRole('listitem').filter({ hasText: mentor.name }).getByRole('button', { name: 'Request' }).click()
    expect((await send).status()).toBe(201)

    const read = await apiRequest(learnerPage, 'GET', `/api/v1/courses/${courseId}/stages/bronze/assessment`)
    expect(read.status).toBe(409)
    expect(read.body.code).toBe('ASSESSMENTS_STAGE_UNAVAILABLE')
    hidesAnswers(read.body)
  })

  await test.step('the Mentor Accepts, and a live Match still shows no Stages card', async () => {
    await mentorPage.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
    const accepted = mentorPage.waitForResponse((response) => /\/api\/v1\/requests\/\d+\/accept$/.test(response.url()))
    await mentorPage.getByRole('listitem').filter({ hasText: learner.name }).getByRole('button', { name: 'Accept' }).click()
    expect((await accepted).status()).toBe(201)

    expect((await openCourse(learnerPage, courseId, course)).data).toEqual([])
    await expect(learnerPage.getByRole('img', { name: 'Progress: In progress' })).toBeVisible()
    await expect(learnerPage.getByRole('region', { name: 'Stages' })).toHaveCount(0)
  })

  await test.step('the Mentor clicks Course Completed', async () => {
    await mentorPage.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
    await mentorPage.getByRole('region', { name: 'Mentoring' }).getByRole('link', { name: new RegExp(learner.name) }).click()
    await expect(mentorPage).toHaveURL(/\/matches\/\d+$/)
    await mentorPage.getByRole('button', { name: 'Course Completed' }).click()
    const dialog = mentorPage.getByRole('dialog', { name: 'Course Completed' })
    const completed = mentorPage.waitForResponse((response) => /\/api\/v1\/matches\/\d+\/course-completed$/.test(response.url()))
    await dialog.getByRole('button', { name: 'Course Completed' }).click()
    expect((await completed).status()).toBe(204)
    await expect(mentorPage).toHaveURL(/\/home$/)
  })

  await test.step('the Learner sees Bronze with Take Bronze, and no Silver or Gold', async () => {
    expect((await openCourse(learnerPage, courseId, course)).data).toEqual([{ level: 'bronze', state: 'available' }])
    const card = learnerPage.getByRole('region', { name: 'Stages' })
    await expect(card.getByRole('listitem')).toHaveCount(1)
    await expect(card.getByRole('listitem')).toContainText('Bronze')
    await expect(card).not.toContainText('Silver')
    await expect(card).not.toContainText('Gold')
    await expect(card.getByRole('link', { name: 'Take Bronze' })).toBeVisible()
  })

  await test.step('Take Bronze opens the Assessment; Submit answers waits for every answer, then shows "Passed."', async () => {
    const read = waitForGet(learnerPage, /^\/api\/v1\/courses\/\d+\/stages\/bronze\/assessment$/)
    await learnerPage.getByRole('region', { name: 'Stages' }).getByRole('link', { name: 'Take Bronze' }).click()
    await expect(learnerPage).toHaveURL(new RegExp(`/courses/${courseId}/stages/bronze$`))
    const readBody = await (await read).json()
    hidesAnswers(readBody)
    expect(readBody.data).toEqual({
      course: { id: courseId, title: course },
      level: 'bronze',
      questions: [{ id: expect.any(Number), text: 'Question?', options: [{ id: expect.any(Number), text: 'Yes' }, { id: expect.any(Number), text: 'No' }] }],
    })

    await expect(learnerPage.getByRole('heading', { level: 1 })).toHaveText(`${course} — Bronze`)
    const question = learnerPage.getByRole('group', { name: '1. Question?' })
    await expect(question.getByRole('radio')).toHaveCount(2)
    const submit = learnerPage.getByRole('button', { name: 'Submit answers' })
    await expect(submit).toBeDisabled()
    await question.getByRole('radio', { name: 'Yes' }).check()
    await expect(submit).toBeEnabled()

    const attempt = learnerPage.waitForResponse(
      (response) => response.request().method() === 'POST' && /\/api\/v1\/courses\/\d+\/stages\/bronze\/attempts$/.test(response.url()),
    )
    await submit.click()
    const response = await attempt
    expect(response.status()).toBe(201)
    const body = await response.json()
    hidesAnswers(body)
    expect(body).toEqual({ data: { passed: true } })

    await expect(learnerPage.getByRole('status')).toHaveText('Passed.')
    await expect(learnerPage.getByRole('group')).toHaveCount(0)
    await expect(learnerPage).toHaveURL(new RegExp(`/courses/${courseId}/stages/bronze$`))
  })

  await test.step('back on the Course, Bronze reads Passed with Take Silver and no Gold, and Bronze is refused again', async () => {
    const stages = waitForGet(learnerPage, /^\/api\/v1\/courses\/\d+\/stages$/)
    await learnerPage.getByRole('link', { name: `Back to ${course}` }).click()
    await expect(learnerPage).toHaveURL(new RegExp(`/courses/${courseId}$`))
    const stagesBody = await (await stages).json()
    hidesAnswers(stagesBody)
    expect(stagesBody.data).toEqual([
      { level: 'bronze', state: 'passed' },
      { level: 'silver', state: 'available' },
    ])
    const card = learnerPage.getByRole('region', { name: 'Stages' })
    await expect(card.getByRole('listitem')).toHaveText(['BronzePassed', 'SilverTake Silver'])
    await expect(card).not.toContainText('Gold')
    await expect(card.getByRole('link')).toHaveCount(1)
    const takeSilver = card.getByRole('link', { name: 'Take Silver' })
    await expect(takeSilver).toHaveAttribute('href', `/courses/${courseId}/stages/silver`)

    const gold = await apiRequest(learnerPage, 'GET', `/api/v1/courses/${courseId}/stages/gold/assessment`)
    expect(gold.status).toBe(409)
    expect(gold.body.code).toBe('ASSESSMENTS_STAGE_UNAVAILABLE')
    hidesAnswers(gold.body)

    const again = await apiRequest(learnerPage, 'GET', `/api/v1/courses/${courseId}/stages/bronze/assessment`)
    expect(again.status).toBe(409)
    expect(again.body.code).toBe('ASSESSMENTS_STAGE_ALREADY_PASSED')
    hidesAnswers(again.body)
  })

  await mentorSession.close()
  await learner.close()
})
