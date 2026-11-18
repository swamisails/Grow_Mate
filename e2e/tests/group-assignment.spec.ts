import { expect, test, type Browser, type Page } from '@playwright/test'
import { adminSignIn, newEmployee, newPage, publishCourse, signUp } from './support/helpers'

// Admin assigns a group (UJ-4, story 4.1). The spec publishes its own Course and signs up its own
// chosen Employee and Learners: the seed has only three Employees, and their Requests stay as seeded.

function hidesSecrets(body: unknown) {
  const json = JSON.stringify(body)
  expect(json).not.toContain('"route"')
  expect(json).not.toContain('group_assignment_id')
  expect(json).not.toContain('gold_pass')
  expect(json).not.toContain('registration_approval')
  expect(json).not.toContain('group_assignment_accepted')
}

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

function waitForGet(page: Page, path: RegExp) {
  return page.waitForResponse((response) => response.request().method() === 'GET' && path.test(new URL(response.url()).pathname))
}

test('Admin assigns three Learners to a chosen Employee, who sees them as one Request', async ({ page, browser }) => {
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

  // Until whole-group Accept exists, Accept is refused and the row stays.
  await chosen.page.getByRole('navigation').getByRole('link', { name: 'Requests' }).click()
  const accepted = chosen.page.waitForResponse((response) => /\/api\/v1\/requests\/\d+\/accept$/.test(response.url()))
  await chosen.page.getByRole('listitem').filter({ hasText: sentence }).getByRole('button', { name: 'Accept' }).click()
  expect((await accepted).status()).toBe(404)
  await expect(chosen.page.getByRole('alert')).toHaveText('Something went wrong. Try again.')
  await expect(chosen.page.getByRole('listitem').filter({ hasText: sentence })).toHaveCount(1)

  // A Learner: no notice, and Home and the Course stay generic, with no Request button.
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

  for (const session of [chosen, ...learners]) {
    await session.close()
  }
})
