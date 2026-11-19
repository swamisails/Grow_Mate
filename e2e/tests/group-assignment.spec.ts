import { expect, test } from '@playwright/test'
import { adminSignIn, hidesSecrets, newSignedUpEmployee, publishCourse, waitForGet } from './support/helpers'

// Admin assigns a group and the chosen Employee Accepts it (UJ-4, stories 4.1 and 4.2). The spec
// publishes its own Course and signs up its own chosen Employee and Learners: the seed has only
// three Employees, and their Requests stay as seeded.

test('Admin assigns three Learners to a chosen Employee, who sees them as one Request and Accepts them all at once', async ({ page, browser }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  const label = `group-${Date.now()}`
  const course = `Group course ${label}`

  await adminSignIn(page)
  const courseId = await publishCourse(page, course)

  const chosen = await newSignedUpEmployee(browser, `${label}-chosen`, 'Imani')
  const learners = [
    await newSignedUpEmployee(browser, `${label}-a`, 'Asha'),
    await newSignedUpEmployee(browser, `${label}-b`, 'Ben'),
    await newSignedUpEmployee(browser, `${label}-c`, 'Chloe'),
  ]
  const learnerNames = learners.map((learner) => learner.name)

  // Admin opens Group assignment from the top bar, third after Courses and Registration decisions.
  await page.reload()
  const nav = page.getByRole('navigation')
  await expect(nav.getByRole('link')).toHaveText(['Courses', 'Registration decisions', 'Group assignment'])
  await nav.getByRole('link', { name: 'Group assignment' }).click()
  await expect(page).toHaveURL(/\/admin\/group-assignments$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Group assignment')
  await expect(page).toHaveTitle('Group assignment · GrowMate')

  const form = page.getByRole('region', { name: 'Assign learners' })
  await form.getByLabel('Course').selectOption({ label: course })
  await form.getByLabel('Chosen Employee').selectOption({ label: chosen.name })
  const learnerGroup = form.getByRole('group', { name: 'Learners' })
  await expect(learnerGroup.getByRole('checkbox', { name: chosen.name })).toHaveCount(0)
  await expect(form.getByRole('button', { name: 'Assign' })).toBeDisabled()
  for (const name of learnerNames) {
    await learnerGroup.getByRole('checkbox', { name }).check()
  }

  const assigned = page.waitForResponse(
    (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/admin/group-assignments',
  )
  await form.getByRole('button', { name: 'Assign' }).click()
  const response = await assigned
  expect(response.status()).toBe(201)
  const body = await response.json()
  hidesSecrets(body)
  expect(Object.keys(body.data)).toEqual(['course_title', 'mentor_name', 'learner_names', 'created_at'])
  expect(body.data).toMatchObject({ course_title: course, mentor_name: chosen.name, learner_names: learnerNames })

  const createdCard = page.getByRole('region', { name: 'Assignment created' })
  await expect(createdCard).toContainText(course)
  await expect(createdCard).toContainText(chosen.name)
  await expect(createdCard.getByRole('listitem')).toHaveText(learnerNames)
  await expect(form.getByLabel('Course')).toHaveValue('')
  await expect(form.getByLabel('Chosen Employee')).toHaveValue('')
  await expect(form.getByRole('group', { name: 'Learners' })).toHaveCount(0)

  // The chosen Employee: one row naming the three, with one Accept, and one notice per Learner.
  const sentence = `${learnerNames[0]}, ${learnerNames[1]} and ${learnerNames[2]} requested you to guide them with ${course}`
  const incoming = waitForGet(chosen.page, /^\/api\/v1\/requests$/)
  await chosen.page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
  const incomingBody = await (await incoming).json()
  hidesSecrets(incomingBody)
  const groupRow = chosen.page.getByRole('listitem').filter({ hasText: sentence })
  await expect(groupRow).toHaveCount(1)
  await expect(groupRow.getByRole('button', { name: 'Accept' })).toHaveCount(1)

  const notices = waitForGet(chosen.page, /^\/api\/v1\/notices$/)
  await chosen.page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  const noticesBody = await (await notices).json()
  hidesSecrets(noticesBody)
  expect(noticesBody.data.map((notice: { type: string }) => notice.type)).toEqual(['request_sent', 'request_sent', 'request_sent'])
  expect(noticesBody.data.map((notice: { person_name: string }) => notice.person_name).sort()).toEqual([...learnerNames].sort())

  // Before Accept, a Learner: no notice, and Home and the Course stay generic, with no Request button.
  const learner = learners[0]
  const learnerNotices = waitForGet(learner.page, /^\/api\/v1\/notices$/)
  await learner.page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
  const learnerNoticesBody = await (await learnerNotices).json()
  hidesSecrets(learnerNoticesBody)
  expect(learnerNoticesBody.data).toEqual([])
  await expect(learner.page.getByText('No notices.')).toBeVisible()

  const home = waitForGet(learner.page, /^\/api\/v1\/home$/)
  await learner.page.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
  const homeBody = await (await home).json()
  hidesSecrets(homeBody)
  expect(homeBody.data.learning).toEqual([{ course_id: courseId, course_title: course, status: 'not_yet_started', match_id: null }])

  const progress = waitForGet(learner.page, /^\/api\/v1\/courses\/\d+\/progress$/)
  const eligibility = waitForGet(learner.page, /^\/api\/v1\/courses\/\d+\/request-eligibility$/)
  await learner.page.goto(`/courses/${courseId}`)
  await expect(learner.page.getByRole('heading', { level: 1 })).toHaveText(course)
  hidesSecrets(await (await progress).json())
  const eligibilityBody = await (await eligibility).json()
  hidesSecrets(eligibilityBody)
  expect(eligibilityBody.data.can_request).toBe(false)
  await expect(learner.page.getByRole('img', { name: 'Progress: Not yet started' })).toBeVisible()
  await expect(learner.page.getByRole('button', { name: 'Request' })).toHaveCount(0)

  // One Accept on the row accepts the whole group: the response is one ordinary Match, and the row goes.
  const refreshed = waitForGet(chosen.page, /^\/api\/v1\/requests$/)
  await chosen.page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
  hidesSecrets(await (await refreshed).json())
  const accepted = chosen.page.waitForResponse((response) => /\/api\/v1\/requests\/\d+\/accept$/.test(response.url()))
  const afterAccept = waitForGet(chosen.page, /^\/api\/v1\/requests$/)
  await chosen.page.getByRole('listitem').filter({ hasText: sentence }).getByRole('button', { name: 'Accept' }).click()
  const acceptResponse = await accepted
  expect(acceptResponse.status()).toBe(201)
  const acceptBody = await acceptResponse.json()
  hidesSecrets(acceptBody)
  expect(Object.keys(acceptBody.data)).toEqual(['id', 'request_id', 'started_at'])
  expect(acceptBody.data.request_id).toBe(incomingBody.data.find((row: { learner_names?: string[] }) => row.learner_names !== undefined).id)
  const afterAcceptBody = await (await afterAccept).json()
  hidesSecrets(afterAcceptBody)
  expect(afterAcceptBody.data).toEqual([])
  await expect(chosen.page.getByRole('listitem').filter({ hasText: sentence })).toHaveCount(0)
  await expect(chosen.page.getByRole('alert')).toHaveCount(0)
  await expect(chosen.page.getByText('No requests.')).toBeVisible()

  // Each Learner: the ordinary Accept notice and an in-progress Match on Home, shaped like a one-to-one Match.
  for (const each of learners) {
    const eachNotices = waitForGet(each.page, /^\/api\/v1\/notices$/)
    await each.page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
    const eachNoticesBody = await (await eachNotices).json()
    hidesSecrets(eachNoticesBody)
    expect(eachNoticesBody.data).toEqual([
      expect.objectContaining({ type: 'request_accepted', person_name: chosen.name, course_title: course }),
    ])
    expect(Object.keys(eachNoticesBody.data[0])).toEqual(['id', 'type', 'occurred_at', 'person_name', 'course_title'])
    await expect(each.page.locator('.notice-row__sentence')).toHaveText([`${chosen.name} is your mentor for ${course}.`])

    const eachHome = waitForGet(each.page, /^\/api\/v1\/home$/)
    await each.page.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
    const eachHomeBody = await (await eachHome).json()
    hidesSecrets(eachHomeBody)
    expect(eachHomeBody.data.learning).toEqual([
      { course_id: courseId, course_title: course, status: 'in_progress', match_id: expect.any(Number) },
    ])
  }

  // The chosen Employee is now in the Course's Mentors list.
  const mentorsList = waitForGet(learner.page, /^\/api\/v1\/courses\/\d+\/mentors$/)
  await learner.page.goto(`/courses/${courseId}`)
  const mentorsBody = await (await mentorsList).json()
  hidesSecrets(mentorsBody)
  expect(mentorsBody.data.map((mentor: { name: string }) => mentor.name)).toEqual([chosen.name])
  await expect(learner.page.getByRole('region', { name: 'Mentors' }).getByRole('listitem').filter({ hasText: chosen.name })).toBeVisible()

  for (const session of [chosen, ...learners]) {
    await session.close()
  }
})
