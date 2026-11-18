import { expect, test } from '@playwright/test'
import { createCourse, fillStage, save, type StageSpec } from './support/courseEditor'
import { adminSignIn, decide, newEmployee, newPage, publishCourse, signIn, signOut, signUp } from './support/helpers'

// Epic 1's outcome as one journey (R10): Noor (Admin) publishes a Course through the editor (Flow 4
// steps 1–3), then Sam signs up, names it and two more at the Mentor check, and becomes a Mentor of
// the two Noor approves (Flow 3, UJ-3). Every Course and Employee carries the run's suffix, and the
// demo Courses are never named or decided, so other specs' Mentor lists stay as seeded.
const priya = { email: 'priya.nair@example.com', password: 'demo-password' }

test('Noor publishes a Course in the editor, and Sam becomes a Mentor of the two Courses she approves', async ({ page, browser }) => {
  // The whole epic-1 journey in one test runs close to the default 30 s timeout, so it gets triple.
  test.slow()
  const sam = newEmployee('uj3', { nameWithId: true })
  // No title contains another, so each name matches only its own link, checkbox and row.
  const editorCourse = `Schema Design ${sam.id}`
  const approvedCourse = `Data Modelling ${sam.id}`
  const refusedCourse = `Query Tuning ${sam.id}`

  const noor = await newPage(browser)
  const admin = noor.page
  await adminSignIn(admin)

  await test.step('Noor publishes a Course through the editor', async () => {
    await createCourse(admin, editorCourse)
    const publish = admin.getByRole('button', { name: 'Publish', exact: true })
    await expect(publish).toBeDisabled()

    const stages: StageSpec[] = [
      {
        name: 'Bronze',
        passMark: '60',
        questions: [
          { text: 'Which key identifies a row?', options: ['Primary key', 'Foreign key'], correct: 0 },
          { text: 'Which form removes repeating groups?', options: ['Third', 'Second', 'First'], correct: 2 },
        ],
      },
      {
        name: 'Silver',
        passMark: '70',
        questions: [{ text: 'A many-to-many link needs?', options: ['An index', 'A join table'], correct: 1 }],
      },
      {
        name: 'Gold',
        passMark: '80',
        questions: [{ text: 'Denormalise for?', options: ['Read speed', 'Write safety', 'Fewer tables'], correct: 0 }],
      },
    ]

    // Bronze and Silver complete, Gold empty: saved, and Publish stays disabled.
    await fillStage(admin, stages[0])
    await fillStage(admin, stages[1])
    await expect(publish).toBeDisabled()
    await save(admin)
    await expect(publish).toBeDisabled()

    // All three complete and saved: Publish is enabled.
    await fillStage(admin, stages[2])
    await save(admin)
    await expect(publish).toBeEnabled()

    await publish.click()
    const dialog = admin.getByRole('dialog', { name: 'Publish' })
    await expect(dialog).toHaveAccessibleDescription("Published courses can't be edited.")
    await dialog.getByRole('button', { name: 'Publish' }).click()
    await expect(dialog).toHaveCount(0)

    // Read-only, with the "Published" tag and no Publish or Save.
    await expect(admin.getByText('Published', { exact: true })).toBeVisible()
    await expect(admin.getByRole('heading', { level: 1, name: editorCourse })).toBeVisible()
    await expect(publish).toHaveCount(0)
    await expect(admin.getByRole('button', { name: 'Save' })).toHaveCount(0)
    await expect(admin.getByRole('textbox')).toHaveCount(0)

    await admin.getByRole('navigation').getByRole('link', { name: 'Courses' }).click()
    await expect(admin).toHaveURL(/\/admin\/courses$/)
    const row = admin.getByRole('row', { name: new RegExp(editorCourse) })
    await expect(row.getByText('Published', { exact: true })).toBeVisible()
    await expect(row.getByText('Draft', { exact: true })).toHaveCount(0)
  })

  await test.step('two more Courses are published through the API', async () => {
    await publishCourse(admin, approvedCourse)
    await publishCourse(admin, refusedCourse)
    // Only Courses published strictly before the account's creation (to the second) can be named.
    await page.waitForTimeout(1100)
  })

  await test.step('Sam signs up and names all three Courses at the Mentor check', async () => {
    await signUp(page, sam)
    await expect(page).toHaveURL(/\/mentor-check$/)
    const group = page.getByRole('group', { name: 'Courses you can mentor' })
    for (const title of [editorCourse, approvedCourse, refusedCourse]) {
      await group.getByRole('checkbox', { name: title }).check()
    }
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page).toHaveURL(/\/home$/)

    // The step never shows again.
    await page.goto('/mentor-check')
    await expect(page).toHaveURL(/\/home$/)
  })

  await test.step('Noor approves two of Sam’s rows and refuses one', async () => {
    await admin.getByRole('navigation').getByRole('link', { name: 'Registration decisions' }).click()
    await expect(admin).toHaveURL(/\/admin\/registration-decisions$/)
    const samRows = admin.getByRole('row').filter({ hasText: sam.name })
    await expect(samRows).toHaveCount(3)
    const rowFor = (title: string) => samRows.filter({ hasText: title })
    for (const title of [editorCourse, approvedCourse, refusedCourse]) {
      await expect(rowFor(title).getByRole('button')).toHaveText(['Approve', 'Refuse'])
    }

    await decide(admin, rowFor(editorCourse), 'Approve', 'Approved')
    await decide(admin, rowFor(approvedCourse), 'Approve', 'Approved')
    await decide(admin, rowFor(refusedCourse), 'Refuse', 'Refused')

    await admin.reload()
    await expect(rowFor(editorCourse).locator('.tag')).toHaveText('Approved')
    await expect(rowFor(approvedCourse).locator('.tag')).toHaveText('Approved')
    await expect(rowFor(refusedCourse).locator('.tag')).toHaveText('Refused')
    await expect(samRows.getByRole('button')).toHaveCount(0)
  })
  await noor.close()

  await test.step('Sam signs in again and sees three notices and the two lists on Home', async () => {
    await signOut(page)
    await signIn(page, sam.email, undefined, { url: /\/home$/ })

    await page.getByRole('navigation').getByRole('link', { name: 'Notices' }).click()
    await expect(page).toHaveURL(/\/notices$/)
    const rows = page.getByRole('region', { name: 'Notices' }).getByRole('listitem')
    // Newest first: the reverse of the order Noor decided in.
    await expect(rows.locator('.notice-row__sentence')).toHaveText([
      `You weren't approved to mentor ${refusedCourse}.`,
      `You can now mentor ${approvedCourse}.`,
      `You can now mentor ${editorCourse}.`,
    ])
    await expect(rows).toHaveCount(3)

    await page.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
    await expect(page).toHaveURL(/\/home$/)
    const card = page.getByRole('region', { name: 'Mentor check' })
    // Each list is sorted by title.
    await expect(card.getByRole('region', { name: 'Approved' }).getByRole('listitem')).toHaveText([approvedCourse, editorCourse])
    await expect(card.getByRole('region', { name: 'Refused' }).getByRole('listitem')).toHaveText([refusedCourse])
  })

  await test.step('a demo Employee sees Sam as a Mentor of the approved Courses only', async () => {
    const demo = await newPage(browser)
    await signIn(demo.page, priya.email, priya.password, { url: /\/home$/ })
    for (const [title, listed] of [[editorCourse, true], [approvedCourse, true], [refusedCourse, false]] as const) {
      await demo.page.getByRole('navigation').getByRole('link', { name: 'Courses' }).click()
      await demo.page.getByRole('link', { name: title }).click()
      await expect(demo.page.getByRole('heading', { level: 1 })).toHaveText(title)
      const mentors = demo.page.getByRole('region', { name: 'Mentors' })
      if (listed) {
        await expect(mentors.getByRole('listitem')).toHaveText([sam.name])
      } else {
        await expect(mentors).toContainText('No mentors for this course yet.')
        await expect(mentors.getByText(sam.name)).toHaveCount(0)
      }
    }
    await demo.close()
  })
})
