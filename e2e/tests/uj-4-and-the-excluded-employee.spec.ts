import { expect, test, type Browser } from '@playwright/test'
import { createCourse, fillStage, save, type StageSpec } from './support/courseEditor'
import { adminSignIn, apiRequest, decide, hidesSecrets, newEmployee, newPage, signUp, waitForGet } from './support/helpers'

// Epic 4's outcome as one journey (EXPERIENCE.md Flow 4, UJ-4): Noor (Admin) publishes "SQL
// Fundamentals" through the editor, refuses it to Sam at registration, and assigns five Learners
// to Imani, who Accepts them once. Its two failure paths: Sam is never offered as the chosen
// Employee, and a Learner R7 refuses gets only the generic message. Every Course and person is new
// and carries the run's suffix; the seeded Imani, Priya and Rafi are never used.

/** A new Employee who skips the Mentor check; their page stays signed in on Home. */
async function newSignedUpEmployee(browser: Browser, label: string, first: string) {
  const employee = newEmployee(label, { first, nameWithId: true })
  const session = await newPage(browser)
  await signUp(session.page, employee)
  await expect(session.page).toHaveURL(/\/mentor-check$/)
  await session.page.getByRole('button', { name: 'Skip' }).click()
  await expect(session.page).toHaveURL(/\/home$/)
  return { ...employee, ...session }
}

const notAssignable = "This learner can't be assigned to this course."

test('Noor staffs SQL Fundamentals with a group Imani Accepts once, never offering Sam, whom she refused', async ({ browser }) => {
  // Nine sign-ups and an editor publish in one test run past the default 30 s timeout, so it gets triple.
  test.slow()
  const sam = newEmployee('uj4', { nameWithId: true })
  const course = `SQL Fundamentals ${sam.id}`

  const noor = await newPage(browser)
  const admin = noor.page
  await admin.emulateMedia({ colorScheme: 'light' })
  await adminSignIn(admin)

  let courseId = 0
  const samSession = await newPage(browser)
  const samPage = samSession.page
  let imani!: Awaited<ReturnType<typeof newSignedUpEmployee>>
  let learners: Awaited<ReturnType<typeof newSignedUpEmployee>>[] = []
  let omar!: Awaited<ReturnType<typeof newSignedUpEmployee>>
  let farah!: Awaited<ReturnType<typeof newSignedUpEmployee>>

  await test.step('setup: Noor publishes the Course in the editor, and refuses it to Sam at registration', async () => {
    await createCourse(admin, course)
    courseId = Number(/\/admin\/courses\/(\d+)$/.exec(new URL(admin.url()).pathname)?.[1])
    expect(courseId).toBeGreaterThan(0)

    const stages: StageSpec[] = [
      {
        name: 'Bronze',
        passMark: '60',
        questions: [{ text: 'Which clause filters rows?', options: ['WHERE', 'ORDER BY'], correct: 0 }],
      },
      {
        name: 'Silver',
        passMark: '70',
        questions: [{ text: 'Which join keeps every left row?', options: ['INNER', 'LEFT', 'CROSS'], correct: 1 }],
      },
      {
        name: 'Gold',
        passMark: '80',
        questions: [{ text: 'Which clause filters groups?', options: ['HAVING', 'WHERE'], correct: 0 }],
      },
    ]
    const publish = admin.getByRole('button', { name: 'Publish', exact: true })
    for (const spec of stages) {
      await fillStage(admin, spec)
    }
    await save(admin)
    await expect(publish).toBeEnabled()
    await publish.click()
    const dialog = admin.getByRole('dialog', { name: 'Publish' })
    await dialog.getByRole('button', { name: 'Publish' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(admin.getByText('Published', { exact: true })).toBeVisible()

    imani = await newSignedUpEmployee(browser, 'uj4-chosen', 'Imani')
    // Named in alphabetical order, the order Group assignment lists and sends them in.
    learners = [
      await newSignedUpEmployee(browser, 'uj4-a', 'Asha'),
      await newSignedUpEmployee(browser, 'uj4-b', 'Ben'),
      await newSignedUpEmployee(browser, 'uj4-c', 'Chloe'),
      await newSignedUpEmployee(browser, 'uj4-d', 'Dev'),
      await newSignedUpEmployee(browser, 'uj4-e', 'Ella'),
    ]
    omar = await newSignedUpEmployee(browser, 'uj4-fresh-chosen', 'Omar')
    farah = await newSignedUpEmployee(browser, 'uj4-fresh-learner', 'Farah')

    // Only Courses published strictly before the account's creation (to the second) can be named.
    await samPage.waitForTimeout(1100)
    await signUp(samPage, sam)
    await expect(samPage).toHaveURL(/\/mentor-check$/)
    await samPage.getByRole('group', { name: 'Courses you can mentor' }).getByRole('checkbox', { name: course }).check()
    await samPage.getByRole('button', { name: 'Submit' }).click()
    await expect(samPage).toHaveURL(/\/home$/)

    await admin.getByRole('navigation').getByRole('link', { name: 'Registration decisions' }).click()
    await expect(admin).toHaveURL(/\/admin\/registration-decisions$/)
    const samRows = admin.getByRole('row').filter({ hasText: sam.name })
    await expect(samRows).toHaveCount(1)
    await decide(admin, samRows.filter({ hasText: course }), 'Refuse', 'Refused')
  })

  const learnerNames = learners.map((learner) => learner.name)
  const form = admin.getByRole('region', { name: 'Assign learners' })
  const learnerGroup = form.getByRole('group', { name: 'Learners' })

  /** Noor opens Group assignment from the top bar; resolves to the Employees the SPA read. */
  async function openGroupAssignment() {
    const employees = waitForGet(admin, /^\/api\/v1\/admin\/employees$/)
    const courses = waitForGet(admin, /^\/api\/v1\/admin\/courses$/)
    await admin.getByRole('navigation').getByRole('link', { name: 'Group assignment' }).click()
    await expect(admin).toHaveURL(/\/admin\/group-assignments$/)
    hidesSecrets(await (await courses).json())
    const employeesBody = await (await employees).json()
    hidesSecrets(employeesBody)
    await expect(form).toBeVisible()
    return employeesBody.data as { id: number; name: string }[]
  }

  /** Picks the Course, waiting for the SPA's read of the Employees refused it. */
  async function pickCourse() {
    const refusedRead = waitForGet(admin, /^\/api\/v1\/admin\/courses\/\d+\/refused-employees$/)
    await form.getByLabel('Course').selectOption({ label: course })
    hidesSecrets(await (await refusedRead).json())
  }

  await test.step('Sam excluded: never offered as the chosen Employee, and a direct POST creates nothing', async () => {
    const employees = await openGroupAssignment()
    const idOf = (name: string) => {
      const id = employees.find((employee) => employee.name === name)?.id
      expect(id, name).toBeDefined()
      return id as number
    }

    const chosenSelect = form.getByLabel('Chosen Employee')
    const samOption = chosenSelect.locator('option', { hasText: sam.name })
    // Offered before a Course is picked; gone once SQL Fundamentals is.
    await expect(samOption).toHaveCount(1)
    await pickCourse()
    await expect(samOption).toHaveCount(0)
    await expect(chosenSelect.locator('option', { hasText: imani.name })).toHaveCount(1)

    // The one direct API call: the API refuses Sam too, whatever the form offers.
    const refused = await apiRequest(admin, 'POST', '/api/v1/admin/group-assignments', {
      course_id: courseId,
      mentor_id: idOf(sam.name),
      learner_ids: learnerNames.map(idOf),
    })
    expect(refused.status).toBe(409)
    hidesSecrets(refused.body)
    expect(refused.body).toMatchObject({ code: 'MATCHING_MENTOR_NOT_ELIGIBLE' })

    // Nothing was created: Sam has no Requests (and the five are assigned again below).
    const samRequests = waitForGet(samPage, /^\/api\/v1\/requests$/)
    await samPage.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
    const samRequestsBody = await (await samRequests).json()
    hidesSecrets(samRequestsBody)
    expect(samRequestsBody.data).toEqual([])
    await expect(samPage.getByText('No requests.')).toBeVisible()
  })

  const sentence = `${learnerNames.slice(0, -1).join(', ')} and ${learnerNames[learnerNames.length - 1]} requested you to guide them with ${course}`

  await test.step('Assign: five Learners to Imani, who sees one row with one Accept', async () => {
    await form.getByLabel('Chosen Employee').selectOption({ label: imani.name })
    for (const name of learnerNames) {
      await learnerGroup.getByRole('checkbox', { name }).check()
    }
    const assigned = admin.waitForResponse(
      (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/admin/group-assignments',
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

    for (const learner of learners) {
      const notices = waitForGet(learner.page, /^\/api\/v1\/notices$/)
      await learner.page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
      const noticesBody = await (await notices).json()
      hidesSecrets(noticesBody)
      expect(noticesBody.data).toEqual([])
      await expect(learner.page.getByText('No notices.')).toBeVisible()
    }

    const incoming = waitForGet(imani.page, /^\/api\/v1\/requests$/)
    await imani.page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
    hidesSecrets(await (await incoming).json())
    await expect(imani.page.getByRole('listitem')).toHaveCount(1)
    const groupRow = imani.page.getByRole('listitem').filter({ hasText: sentence })
    await expect(groupRow).toHaveCount(1)
    await expect(groupRow.getByRole('button', { name: 'Accept' })).toHaveCount(1)

    const imaniNotices = waitForGet(imani.page, /^\/api\/v1\/notices$/)
    await imani.page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
    const imaniNoticesBody = await (await imaniNotices).json()
    hidesSecrets(imaniNoticesBody)
    expect(imaniNoticesBody.data.map((notice: { type: string }) => notice.type)).toEqual(Array(5).fill('request_sent'))
    expect(imaniNoticesBody.data.map((notice: { person_name: string }) => notice.person_name).sort()).toEqual([...learnerNames].sort())
  })

  await test.step('Accept: one click starts five Matches, and Imani becomes a Mentor of the Course', async () => {
    const requests = waitForGet(imani.page, /^\/api\/v1\/requests$/)
    await imani.page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
    hidesSecrets(await (await requests).json())
    const accepted = imani.page.waitForResponse((response) => /\/api\/v1\/requests\/\d+\/accept$/.test(response.url()))
    const afterAccept = waitForGet(imani.page, /^\/api\/v1\/requests$/)
    await imani.page.getByRole('listitem').filter({ hasText: sentence }).getByRole('button', { name: 'Accept' }).click()
    const acceptResponse = await accepted
    expect(acceptResponse.status()).toBe(201)
    hidesSecrets(await acceptResponse.json())
    const afterAcceptBody = await (await afterAccept).json()
    hidesSecrets(afterAcceptBody)
    expect(afterAcceptBody.data).toEqual([])
    await expect(imani.page.getByText('No requests.')).toBeVisible()

    // Each Learner is still on Notices from the Assign step, so Home is read first: a click on the
    // page already open would read nothing.
    for (const learner of learners) {
      const home = waitForGet(learner.page, /^\/api\/v1\/home$/)
      await learner.page.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
      const homeBody = await (await home).json()
      hidesSecrets(homeBody)
      expect(homeBody.data.learning).toEqual([
        { course_id: courseId, course_title: course, status: 'in_progress', match_id: expect.any(Number) },
      ])

      const notices = waitForGet(learner.page, /^\/api\/v1\/notices$/)
      await learner.page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
      const noticesBody = await (await notices).json()
      hidesSecrets(noticesBody)
      expect(noticesBody.data).toEqual([
        expect.objectContaining({ type: 'request_accepted', person_name: imani.name, course_title: course }),
      ])
      await expect(learner.page.locator('.notice-row__sentence')).toHaveText([`${imani.name} is your mentor for ${course}.`])
    }

    // Rows carry a Request button, so they are found by name rather than matched exactly.
    const viewer = learners[1].page
    const mentorsRead = waitForGet(viewer, /^\/api\/v1\/courses\/\d+\/mentors$/)
    await viewer.goto(`/courses/${courseId}`)
    await expect(viewer.getByRole('heading', { level: 1 })).toHaveText(course)
    const mentorsBody = await (await mentorsRead).json()
    hidesSecrets(mentorsBody)
    expect(mentorsBody.data.map((mentor: { name: string }) => mentor.name)).toEqual([imani.name])
    const mentors = viewer.getByRole('region', { name: 'Mentors' })
    await expect(mentors.getByRole('listitem').filter({ hasText: imani.name })).toHaveCount(1)
    await expect(mentors).not.toContainText(sam.name)
  })

  await test.step('No Accepted state: Noor reopens Group assignment and sees only the empty form', async () => {
    await admin.getByRole('navigation').getByRole('link', { name: 'Courses' }).click()
    await expect(admin).toHaveURL(/\/admin\/courses$/)
    await openGroupAssignment()
    await expect(admin.getByRole('region', { name: 'Assignment created' })).toHaveCount(0)
    await expect(form.getByLabel('Course')).toHaveValue('')
    await expect(form.getByLabel('Chosen Employee')).toHaveValue('')
    await expect(learnerGroup).toHaveCount(0)
    await expect(form.getByRole('button', { name: 'Assign' })).toBeDisabled()
    const main = admin.getByRole('main')
    await expect(main.getByText(/accepted/i)).toHaveCount(0)
    await expect(main.getByRole('listitem')).toHaveCount(0)
  })

  await test.step('R7-refused Learner: only the generic message, on that Learner only, and nothing is created', async () => {
    await pickCourse()
    await form.getByLabel('Chosen Employee').selectOption({ label: omar.name })
    const matched = learners[0]
    await learnerGroup.getByRole('checkbox', { name: matched.name }).check()
    await learnerGroup.getByRole('checkbox', { name: farah.name }).check()

    const assigned = admin.waitForResponse(
      (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/admin/group-assignments',
    )
    await form.getByRole('button', { name: 'Assign' }).click()
    const response = await assigned
    expect(response.status()).toBe(409)
    const body = await response.json()
    hidesSecrets(body)
    expect(body.code).toBe('MATCHING_LEARNER_NOT_ASSIGNABLE')
    expect(Object.values(body.errors)).toEqual([[notAssignable]])

    await expect(form.getByRole('status')).toHaveText("Nothing was assigned. Some learners can't be assigned to this course.")
    await expect(learnerGroup.getByText(notAssignable)).toHaveCount(1)
    await expect(learnerGroup.getByRole('checkbox', { name: matched.name })).toHaveAccessibleDescription(notAssignable)
    await expect(learnerGroup.getByRole('checkbox', { name: farah.name })).toHaveAccessibleDescription('')
    await expect(admin.getByRole('region', { name: 'Assignment created' })).toHaveCount(0)

    const omarRequests = waitForGet(omar.page, /^\/api\/v1\/requests$/)
    await omar.page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
    const omarRequestsBody = await (await omarRequests).json()
    hidesSecrets(omarRequestsBody)
    expect(omarRequestsBody.data).toEqual([])
    await expect(omar.page.getByText('No requests.')).toBeVisible()
  })

  for (const session of [noor, samSession, imani, ...learners, omar, farah]) {
    await session.close()
  }
})
