import { expect, test, type Page } from '@playwright/test'
import {
  adminSignIn,
  apiRequest,
  decide,
  hidesSecrets,
  newEmployee,
  newPage,
  newSignedUpEmployee,
  publishCourse,
  signUp,
  waitForGet,
} from './support/helpers'

// Story 3.4 (UJ-1 step 8): passing Gold makes the Learner a Mentor. On a run-tagged Course with a
// Mentor approved at registration, a Learner after Course Completed passes Bronze and Silver through
// the API and Gold through the UI. The result reads "Passed." as for Bronze; the bar reads Completed
// on the Course page and Home; the Learner leaves the Upskilling list; and another Employee finds them
// in the Course's Mentors list, with no route or badge. Seeded Employees and demo Courses are never used.

/** Opens the Course page and returns the body of its own Stages read. */
async function openCourse(page: Page, courseId: number, title: string) {
  const stages = waitForGet(page, /^\/api\/v1\/courses\/\d+\/stages$/)
  await page.goto(`/courses/${courseId}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  const body = await (await stages).json()
  await expect(page.getByRole('region', { name: 'Mentors' })).toBeVisible()
  return body
}

/** Passes a Stage through the API, choosing the correct "Yes" option. */
async function passThroughApi(page: Page, courseId: number, level: 'bronze' | 'silver') {
  const read = await apiRequest(page, 'GET', `/api/v1/courses/${courseId}/stages/${level}/assessment`)
  expect(read.status).toBe(200)
  const question = read.body.data.questions[0]
  const yes = question.options.find((option: { text: string }) => option.text === 'Yes')
  const submit = await apiRequest(page, 'POST', `/api/v1/courses/${courseId}/stages/${level}/attempts`, {
    answers: [{ question_id: question.id, option_id: yes.id }],
  })
  expect(submit.status).toBe(201)
  expect(submit.body).toEqual({ data: { passed: true } })
}

test('a Learner who passes Gold sees "Passed.", reads Completed and becomes a Mentor', async ({ page, browser }) => {
  // Three sign-ups, a decision, a Match and three Stages run past the default 30 s timeout.
  test.slow()
  await page.emulateMedia({ colorScheme: 'light' })
  const mentor = newEmployee('gold', { first: 'Rafi', nameWithId: true })
  const course = `Gold Practice ${mentor.id}`

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
    await signUp(mentorPage, mentor)
    await expect(mentorPage).toHaveURL(/\/mentor-check$/)
    await mentorPage.getByRole('group', { name: 'Courses you can mentor' }).getByRole('checkbox', { name: course }).check()
    await mentorPage.getByRole('button', { name: 'Submit' }).click()
    await expect(mentorPage).toHaveURL(/\/home$/)

    await admin.getByRole('navigation').getByRole('link', { name: 'Registration decisions' }).click()
    await expect(admin).toHaveURL(/\/admin\/registration-decisions$/)
    await decide(admin, admin.getByRole('row').filter({ hasText: mentor.name }).filter({ hasText: course }), 'Approve', 'Approved')
  })

  const learner = await newSignedUpEmployee(browser, `${mentor.id}-learner`, 'Priya')
  const learnerPage = learner.page
  await test.step('the Learner Requests, the Mentor Accepts and clicks Course Completed', async () => {
    await openCourse(learnerPage, courseId, course)
    const send = learnerPage.waitForResponse(
      (response) => response.request().method() === 'POST' && /\/api\/v1\/courses\/\d+\/requests$/.test(response.url()),
    )
    await learnerPage.getByRole('region', { name: 'Mentors' }).getByRole('listitem').filter({ hasText: mentor.name }).getByRole('button', { name: 'Request' }).click()
    expect((await send).status()).toBe(201)

    await mentorPage.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
    const accepted = mentorPage.waitForResponse((response) => /\/api\/v1\/requests\/\d+\/accept$/.test(response.url()))
    await mentorPage.getByRole('listitem').filter({ hasText: learner.name }).getByRole('button', { name: 'Accept' }).click()
    expect((await accepted).status()).toBe(201)

    await mentorPage.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
    await mentorPage.getByRole('region', { name: 'Mentoring' }).getByRole('link', { name: new RegExp(learner.name) }).click()
    await expect(mentorPage).toHaveURL(/\/matches\/\d+$/)
    await mentorPage.getByRole('button', { name: 'Course Completed' }).click()
    const completed = mentorPage.waitForResponse((response) => /\/api\/v1\/matches\/\d+\/course-completed$/.test(response.url()))
    await mentorPage.getByRole('dialog', { name: 'Course Completed' }).getByRole('button', { name: 'Course Completed' }).click()
    expect((await completed).status()).toBe(204)
    await expect(mentorPage).toHaveURL(/\/home$/)
  })
  await mentorSession.close()

  await test.step('the Learner passes Bronze and Silver through the API and is still In progress', async () => {
    await passThroughApi(learnerPage, courseId, 'bronze')
    await passThroughApi(learnerPage, courseId, 'silver')

    expect((await openCourse(learnerPage, courseId, course)).data).toEqual([
      { level: 'bronze', state: 'passed' },
      { level: 'silver', state: 'passed' },
      { level: 'gold', state: 'available' },
    ])
    await expect(learnerPage.getByRole('img', { name: 'Progress: In progress' })).toBeVisible()
  })

  await test.step('Take Gold, answer correctly: the result reads "Passed." as plainly as Bronze', async () => {
    await learnerPage.getByRole('region', { name: 'Stages' }).getByRole('link', { name: 'Take Gold' }).click()
    await expect(learnerPage).toHaveURL(new RegExp(`/courses/${courseId}/stages/gold$`))
    await expect(learnerPage.getByRole('heading', { level: 1 })).toHaveText(`${course} — Gold`)
    await learnerPage.getByRole('group', { name: '1. Question?' }).getByRole('radio', { name: 'Yes' }).check()

    const attempt = learnerPage.waitForResponse(
      (response) => response.request().method() === 'POST' && /\/api\/v1\/courses\/\d+\/stages\/gold\/attempts$/.test(response.url()),
    )
    await learnerPage.getByRole('button', { name: 'Submit answers' }).click()
    const response = await attempt
    expect(response.status()).toBe(201)
    const body = await response.json()
    hidesSecrets(body)
    expect(body).toEqual({ data: { passed: true } })
    await expect(learnerPage.getByRole('status')).toHaveText('Passed.')
  })

  await test.step('the Course page and Home read Completed', async () => {
    const progress = waitForGet(learnerPage, /^\/api\/v1\/courses\/\d+\/progress$/)
    await openCourse(learnerPage, courseId, course)
    const progressBody = await (await progress).json()
    hidesSecrets(progressBody)
    expect(progressBody).toEqual({ data: { status: 'completed' } })
    await expect(learnerPage.getByRole('img', { name: 'Progress: Completed' })).toBeVisible()
    await expect(learnerPage.locator('.progress__fill--completed')).toBeVisible()

    const home = waitForGet(learnerPage, /^\/api\/v1\/home$/)
    await learnerPage.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
    await expect(learnerPage).toHaveURL(/\/home$/)
    const homeBody = await (await home).json()
    hidesSecrets(homeBody)
    expect(homeBody.data.learning).toEqual([{ course_id: courseId, course_title: course, status: 'completed', match_id: null }])
    const row = learnerPage.getByRole('region', { name: 'Learning' }).getByRole('listitem').filter({ hasText: course })
    await expect(row.getByRole('img', { name: 'Progress: Completed' })).toBeVisible()
  })

  await test.step('the Learner is not on the Upskilling list', async () => {
    const upskilling = waitForGet(learnerPage, /^\/api\/v1\/upskilling$/)
    await learnerPage.getByRole('navigation').getByRole('link', { name: 'Upskilling' }).click()
    await expect(learnerPage).toHaveURL(/\/upskilling$/)
    const rows: { person_name: string }[] = (await (await upskilling).json()).data
    expect(rows.map((row) => row.person_name)).not.toContain(learner.name)
    await expect(learnerPage.getByRole('region', { name: 'Upskilling' })).not.toContainText(learner.name)
  })

  const other = await newSignedUpEmployee(browser, `${mentor.id}-other`, 'Sam')
  await test.step('another Employee finds the new Mentor in the Course\'s Mentors list, with no route or badge', async () => {
    const mentors = waitForGet(other.page, /^\/api\/v1\/courses\/\d+\/mentors$/)
    await openCourse(other.page, courseId, course)
    const mentorsBody = await (await mentors).json()
    hidesSecrets(mentorsBody)
    expect(mentorsBody.data.map((row: { name: string }) => row.name)).toContain(learner.name)

    const listed = other.page.getByRole('region', { name: 'Mentors' }).getByRole('listitem').filter({ hasText: learner.name })
    await expect(listed).toHaveCount(1)
    await expect(listed.getByRole('button', { name: 'Request' })).toBeVisible()
    await expect(listed).not.toContainText('Gold')
  })

  await other.close()
  await learner.close()
})
