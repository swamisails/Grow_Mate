import { expect, test } from '@playwright/test'
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

// Epic 4's outcome as one journey (UJ-4, Flow 4): Noor (Admin) staffs a Course through one Group
// assignment and Imani Accepts it once, then the two failure paths: Sam, refused the Course at
// registration, is never a chosen Employee, and a Learner R7 refuses makes the whole Assign create
// nothing. Editor publishing (Flow 4 steps 1–3) is the uj-3 spec's. Every Course and Employee carries
// the run's id, and seeded Employees and demo Courses are never named, assigned or decided.

const assignPath = '/api/v1/admin/group-assignments'

test('Noor staffs a Course through one Group assignment that Imani Accepts once, and neither Sam nor a matched Learner can be assigned', async ({ page, browser }) => {
  // Seven sign-ups and a read per Learner per step run past the default 30 s timeout, so it gets triple.
  test.slow()
  await page.emulateMedia({ colorScheme: 'light' })
  const sam = newEmployee('uj4', { nameWithId: true })
  const course = `Pairing Practice ${sam.id}`

  const admin = page
  await adminSignIn(admin)
  const form = admin.getByRole('region', { name: 'Assign learners' })
  const learnerGroup = form.getByRole('group', { name: 'Learners' })
  const chosenSelect = form.getByLabel('Chosen Employee')

  let courseId = 0
  await test.step('Noor publishes the Course through the API', async () => {
    courseId = await publishCourse(admin, course)
    // Only Courses published strictly before the account's creation (to the second) can be named.
    await admin.waitForTimeout(1100)
  })

  const samSession = await newPage(browser)
  await test.step('Sam signs up and names the Course at the Mentor check, and Noor refuses it', async () => {
    await signUp(samSession.page, sam)
    await expect(samSession.page).toHaveURL(/\/mentor-check$/)
    await samSession.page.getByRole('group', { name: 'Courses you can mentor' }).getByRole('checkbox', { name: course }).check()
    await samSession.page.getByRole('button', { name: 'Submit' }).click()
    await expect(samSession.page).toHaveURL(/\/home$/)

    const decisions = waitForGet(admin, /^\/api\/v1\/admin\/registration-decisions$/)
    await admin.getByRole('navigation').getByRole('link', { name: 'Registration decisions' }).click()
    await expect(admin).toHaveURL(/\/admin\/registration-decisions$/)
    hidesSecrets(await (await decisions).json())
    const samRows = admin.getByRole('row').filter({ hasText: sam.name })
    await expect(samRows).toHaveCount(1)
    await decide(admin, samRows.filter({ hasText: course }), 'Refuse', 'Refused')
  })

  // Imani and the five Learners skip the Mentor check, so nothing waits on the Course's publish time.
  const imani = await newSignedUpEmployee(browser, `${sam.id}-chosen`, 'Imani')
  const learners = [
    await newSignedUpEmployee(browser, `${sam.id}-a`, 'Asha'),
    await newSignedUpEmployee(browser, `${sam.id}-b`, 'Ben'),
    await newSignedUpEmployee(browser, `${sam.id}-c`, 'Chloe'),
    await newSignedUpEmployee(browser, `${sam.id}-d`, 'Dev'),
    await newSignedUpEmployee(browser, `${sam.id}-e`, 'Elif'),
  ]
  const learnerNames = learners.map((learner) => learner.name)

  await test.step('Sam is not offered as the chosen Employee, and a direct Assign naming Sam is refused', async () => {
    const employees = waitForGet(admin, /^\/api\/v1\/admin\/employees$/)
    await admin.getByRole('navigation').getByRole('link', { name: 'Group assignment' }).click()
    await expect(admin).toHaveURL(/\/admin\/group-assignments$/)
    const employeesBody = await (await employees).json()
    hidesSecrets(employeesBody)
    const idOf = (name: string): number => employeesBody.data.find((employee: { name: string }) => employee.name === name).id

    // Offered before the Course is picked; dropped once its refused Employees are read.
    await expect(chosenSelect.getByRole('option', { name: sam.name })).toHaveCount(1)
    const refused = waitForGet(admin, /^\/api\/v1\/admin\/courses\/\d+\/refused-employees$/)
    await form.getByLabel('Course').selectOption({ label: course })
    const refusedBody = await (await refused).json()
    hidesSecrets(refusedBody)
    expect(refusedBody.data.map((row: { id: number }) => row.id)).toContain(idOf(sam.name))
    await expect(chosenSelect.getByRole('option', { name: sam.name })).toHaveCount(0)
    await expect(chosenSelect.getByRole('option', { name: imani.name })).toHaveCount(1)

    // Sam is still a Learner option.
    await chosenSelect.selectOption({ label: imani.name })
    await expect(learnerGroup.getByRole('checkbox', { name: sam.name })).toHaveCount(1)
    await expect(learnerGroup.getByRole('checkbox', { name: imani.name })).toHaveCount(0)

    // The API refuses Sam as the chosen Employee and creates nothing: the same five are assigned next.
    const direct = await apiRequest(admin, 'POST', assignPath, {
      course_id: courseId,
      mentor_id: idOf(sam.name),
      learner_ids: learnerNames.map(idOf),
    })
    hidesSecrets(direct.body)
    expect(direct.status).toBe(409)
    expect(direct.body).toEqual({
      message: "This employee can't be chosen for this course.",
      code: 'MATCHING_MENTOR_NOT_ELIGIBLE',
      errors: { mentor_id: ["This employee can't be chosen for this course."] },
    })
  })

  await test.step('Noor assigns the five Learners to Imani', async () => {
    for (const name of learnerNames) {
      await learnerGroup.getByRole('checkbox', { name }).check()
    }
    const assigned = admin.waitForResponse(
      (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === assignPath,
    )
    await form.getByRole('button', { name: 'Assign' }).click()
    const response = await assigned
    expect(response.status()).toBe(201)
    const body = await response.json()
    hidesSecrets(body)
    expect(body.data).toMatchObject({ course_title: course, mentor_name: imani.name, learner_names: learnerNames })

    const createdCard = admin.getByRole('region', { name: 'Assignment created' })
    await expect(createdCard).toContainText(course)
    await expect(createdCard).toContainText(imani.name)
    await expect(createdCard.getByRole('listitem')).toHaveText(learnerNames)
    await expect(form.getByLabel('Course')).toHaveValue('')
    await expect(chosenSelect).toHaveValue('')
    await expect(learnerGroup).toHaveCount(0)
  })

  const sentence = `${learnerNames.slice(0, -1).join(', ')} and ${learnerNames[4]} requested you to guide them with ${course}`
  let groupRequestId = 0
  await test.step('Imani sees one row naming all five and five notices; the Learners see nothing yet', async () => {
    const incoming = waitForGet(imani.page, /^\/api\/v1\/requests$/)
    await imani.page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
    const incomingBody = await (await incoming).json()
    hidesSecrets(incomingBody)
    expect(incomingBody.data).toHaveLength(1)
    groupRequestId = incomingBody.data[0].id
    const groupRow = imani.page.getByRole('listitem').filter({ hasText: sentence })
    await expect(groupRow).toHaveCount(1)
    await expect(imani.page.getByRole('button', { name: 'Accept' })).toHaveCount(1)

    const notices = waitForGet(imani.page, /^\/api\/v1\/notices$/)
    await imani.page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
    const noticesBody = await (await notices).json()
    hidesSecrets(noticesBody)
    expect(noticesBody.data.map((notice: { type: string }) => notice.type)).toEqual(Array(5).fill('request_sent'))
    expect(noticesBody.data.map((notice: { person_name: string }) => notice.person_name).sort()).toEqual([...learnerNames].sort())

    for (const learner of learners) {
      const learnerNotices = waitForGet(learner.page, /^\/api\/v1\/notices$/)
      await learner.page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
      const learnerNoticesBody = await (await learnerNotices).json()
      hidesSecrets(learnerNoticesBody)
      expect(learnerNoticesBody.data).toEqual([])
      await expect(learner.page.getByText('No notices.')).toBeVisible()

      const progress = waitForGet(learner.page, /^\/api\/v1\/courses\/\d+\/progress$/)
      const eligibility = waitForGet(learner.page, /^\/api\/v1\/courses\/\d+\/request-eligibility$/)
      const mentors = waitForGet(learner.page, /^\/api\/v1\/courses\/\d+\/mentors$/)
      await learner.page.goto(`/courses/${courseId}`)
      await expect(learner.page.getByRole('heading', { level: 1 })).toHaveText(course)
      hidesSecrets(await (await progress).json())
      hidesSecrets(await (await mentors).json())
      const eligibilityBody = await (await eligibility).json()
      hidesSecrets(eligibilityBody)
      expect(eligibilityBody.data.can_request).toBe(false)
      await expect(learner.page.getByRole('img', { name: 'Progress: Not yet started' })).toBeVisible()
      await expect(learner.page.getByRole('button', { name: 'Request' })).toHaveCount(0)
    }
  })

  await test.step('Imani clicks Accept once, and her Requests list empties', async () => {
    const refreshed = waitForGet(imani.page, /^\/api\/v1\/requests$/)
    await imani.page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
    hidesSecrets(await (await refreshed).json())
    const accepted = imani.page.waitForResponse((response) => /\/api\/v1\/requests\/\d+\/accept$/.test(response.url()))
    const afterAccept = waitForGet(imani.page, /^\/api\/v1\/requests$/)
    await imani.page.getByRole('listitem').filter({ hasText: sentence }).getByRole('button', { name: 'Accept' }).click()
    const acceptResponse = await accepted
    expect(acceptResponse.status()).toBe(201)
    const acceptBody = await acceptResponse.json()
    hidesSecrets(acceptBody)
    expect(acceptBody.data.request_id).toBe(groupRequestId)
    const afterAcceptBody = await (await afterAccept).json()
    hidesSecrets(afterAcceptBody)
    expect(afterAcceptBody.data).toEqual([])
    await expect(imani.page.getByRole('listitem').filter({ hasText: sentence })).toHaveCount(0)
    await expect(imani.page.getByRole('alert')).toHaveCount(0)
    await expect(imani.page.getByText('No requests.')).toBeVisible()
  })

  await test.step('each Learner sees Imani as their mentor and their own in-progress Match, and Imani is a Mentor of the Course', async () => {
    const matchIds: number[] = []
    for (const learner of learners) {
      const notices = waitForGet(learner.page, /^\/api\/v1\/notices$/)
      await learner.page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
      const noticesBody = await (await notices).json()
      hidesSecrets(noticesBody)
      expect(noticesBody.data).toEqual([
        expect.objectContaining({ type: 'request_accepted', person_name: imani.name, course_title: course }),
      ])
      await expect(learner.page.locator('.notice-row__sentence')).toHaveText([`${imani.name} is your mentor for ${course}.`])

      const home = waitForGet(learner.page, /^\/api\/v1\/home$/)
      await learner.page.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
      const homeBody = await (await home).json()
      hidesSecrets(homeBody)
      expect(homeBody.data.learning).toEqual([
        { course_id: courseId, course_title: course, status: 'in_progress', match_id: expect.any(Number) },
      ])
      matchIds.push(homeBody.data.learning[0].match_id)
      const learningRows = learner.page.getByRole('region', { name: 'Learning' }).getByRole('listitem')
      await expect(learningRows).toHaveCount(1)
      await expect(learningRows.getByRole('link', { name: course })).toHaveAttribute('href', `/matches/${homeBody.data.learning[0].match_id}`)
      await expect(learningRows.getByRole('img', { name: 'Progress: In progress' })).toBeVisible()
    }
    expect(new Set(matchIds).size).toBe(5)

    const viewer = learners[0].page
    const mentors = waitForGet(viewer, /^\/api\/v1\/courses\/\d+\/mentors$/)
    await viewer.goto(`/courses/${courseId}`)
    const mentorsBody = await (await mentors).json()
    hidesSecrets(mentorsBody)
    expect(mentorsBody.data.map((mentor: { name: string }) => mentor.name)).toEqual([imani.name])
    const mentorRows = viewer.getByRole('region', { name: 'Mentors' }).getByRole('listitem')
    await expect(mentorRows).toHaveCount(1)
    await expect(mentorRows.filter({ hasText: imani.name })).toBeVisible()
  })

  await test.step('Noor reloads Group assignment and sees no Accepted state', async () => {
    const employees = waitForGet(admin, /^\/api\/v1\/admin\/employees$/)
    await admin.reload()
    hidesSecrets(await (await employees).json())
    await expect(form).toBeVisible()
    await expect(admin.getByRole('region', { name: 'Assignment created' })).toHaveCount(0)
    await expect(admin.locator('body')).not.toContainText('Accepted')
    // No history: with nothing selected, the page holds no list at all.
    await expect(admin.getByRole('main').getByRole('list')).toHaveCount(0)
  })

  await test.step('Noor assigns a matched Learner and Sam to Imani, and nothing is assigned', async () => {
    const matched = learners[0]
    const refused = waitForGet(admin, /^\/api\/v1\/admin\/courses\/\d+\/refused-employees$/)
    await form.getByLabel('Course').selectOption({ label: course })
    hidesSecrets(await (await refused).json())
    await chosenSelect.selectOption({ label: imani.name })
    await learnerGroup.getByRole('checkbox', { name: matched.name }).check()
    await learnerGroup.getByRole('checkbox', { name: sam.name }).check()

    const assigned = admin.waitForResponse(
      (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === assignPath,
    )
    await form.getByRole('button', { name: 'Assign' }).click()
    const response = await assigned
    expect(response.status()).toBe(409)
    const body = await response.json()
    hidesSecrets(body)
    expect(Object.keys(body)).toEqual(['message', 'code', 'errors'])
    expect(body.message).toBe("Nothing was assigned. Some learners can't be assigned to this course.")
    expect(body.code).toBe('MATCHING_LEARNER_NOT_ASSIGNABLE')
    expect(Object.values(body.errors)).toEqual([["This learner can't be assigned to this course."]])

    await expect(form.getByRole('status')).toHaveText("Nothing was assigned. Some learners can't be assigned to this course.")
    await expect(form.locator('.group-assignment__mark')).toHaveCount(1)
    await expect(learnerGroup.getByRole('checkbox', { name: matched.name })).toHaveAccessibleDescription(
      "This learner can't be assigned to this course.",
    )
    await expect(learnerGroup.getByRole('checkbox', { name: sam.name })).toHaveAccessibleDescription('')
    await expect(admin.getByRole('region', { name: 'Assignment created' })).toHaveCount(0)

    // Nothing was created: Imani has no new Request, and Sam's only notice is the Registration refusal.
    const requests = waitForGet(imani.page, /^\/api\/v1\/requests$/)
    await imani.page.reload()
    const requestsBody = await (await requests).json()
    hidesSecrets(requestsBody)
    expect(requestsBody.data).toEqual([])
    await expect(imani.page.getByText('No requests.')).toBeVisible()

    const samNotices = waitForGet(samSession.page, /^\/api\/v1\/notices$/)
    await samSession.page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
    const samNoticesBody = await (await samNotices).json()
    hidesSecrets(samNoticesBody)
    expect(samNoticesBody.data).toEqual([
      expect.objectContaining({ type: 'registration_decision', course_title: course, outcome: 'refused' }),
    ])
    await expect(samSession.page.locator('.notice-row__sentence')).toHaveText([`You weren't approved to mentor ${course}.`])
  })

  for (const session of [samSession, imani, ...learners]) {
    await session.close()
  }
})
