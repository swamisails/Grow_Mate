import { expect, test, type Page } from '@playwright/test'
import { createCourse, fillStage, question, save, stage, type StageSpec } from './support/courseEditor'
import { adminSignIn } from './support/helpers'

async function expectStage(page: Page, spec: StageSpec) {
  const card = stage(page, spec.name)
  await expect(card.getByLabel('Pass mark (%)')).toHaveValue(spec.passMark)
  await expect(card.getByRole('group', { name: /^Question \d+$/ })).toHaveCount(spec.questions.length)
  for (const [q, questionSpec] of spec.questions.entries()) {
    const block = question(card, q + 1)
    await expect(block.getByLabel('Question', { exact: true })).toHaveValue(questionSpec.text)
    await expect(block.getByLabel(/^Option \d+$/)).toHaveCount(questionSpec.options.length)
    for (const [o, option] of questionSpec.options.entries()) {
      await expect(block.getByLabel(`Option ${o + 1}`, { exact: true })).toHaveValue(option)
      const radio = block.getByRole('radio', { name: `Correct, option ${o + 1}` })
      if (o === questionSpec.correct) {
        await expect(radio).toBeChecked()
      } else {
        await expect(radio).not.toBeChecked()
      }
    }
  }
}

test.beforeEach(async ({ page }) => {
  await adminSignIn(page)
})

test('Admin drafts a Course with all three Stages, and a reload shows it unchanged', async ({ page }) => {
  await createCourse(page, 'SQL Fundamentals')

  // Texts out of alphabetical order, so only the authored order explains what comes back.
  const stages: StageSpec[] = [
    {
      name: 'Bronze',
      passMark: '60',
      questions: [
        { text: 'Which clause filters rows?', options: ['WHERE', 'ORDER BY', 'GROUP BY'], correct: 0 },
        { text: 'Which keyword removes duplicates?', options: ['UNIQUE', 'DISTINCT'], correct: 1 },
      ],
    },
    {
      name: 'Silver',
      passMark: '70',
      questions: [{ text: 'Zebra join?', options: ['Z', 'A', 'M'], correct: 2 }],
    },
    {
      name: 'Gold',
      passMark: '100',
      questions: [
        { text: 'Window functions run after?', options: ['HAVING', 'FROM'], correct: 0 },
        { text: 'A CTE starts with?', options: ['AS', 'WITH'], correct: 1 },
      ],
    },
  ]
  for (const spec of stages) {
    await fillStage(page, spec)
  }
  await save(page)

  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('SQL Fundamentals')
  await expect(page.getByLabel('Title')).toHaveValue('SQL Fundamentals')
  await expect(page.getByLabel('Description')).toHaveValue('What SQL Fundamentals covers.')
  for (const spec of stages) {
    await expectStage(page, spec)
  }

  // Admin Courses lists it as a Draft, and its title opens the editor.
  await page.getByRole('navigation').getByRole('link', { name: 'Courses' }).click()
  const row = page.getByRole('row', { name: /SQL Fundamentals/ })
  await expect(row.getByText('Draft', { exact: true })).toBeVisible()
  await row.getByRole('link', { name: 'SQL Fundamentals' }).click()
  await expect(page).toHaveURL(/\/admin\/courses\/\d+$/)
  await expectStage(page, stages[0])
})

test('a partial draft saves with Silver and Gold empty and no Gold Pass mark', async ({ page }) => {
  await createCourse(page, 'Python Basics')

  const bronze: StageSpec = {
    name: 'Bronze',
    passMark: '50',
    questions: [{ text: 'What does len() return?', options: ['A length', 'A list'], correct: 0 }],
  }
  await fillStage(page, bronze)
  await save(page)

  await page.reload()
  await expectStage(page, bronze)
  await expectStage(page, { name: 'Silver', passMark: '', questions: [] })
  await expectStage(page, { name: 'Gold', passMark: '', questions: [] })
})

test('a one-option question and a Pass mark of 101 are refused under their fields', async ({ page }) => {
  await createCourse(page, 'Refused Draft')

  const bronze = stage(page, 'Bronze')
  await bronze.getByRole('button', { name: 'Add question' }).click()
  const block = question(bronze, 1)
  await block.getByLabel('Question', { exact: true }).fill('Only one answer?')
  await block.getByLabel('Option 1', { exact: true }).fill('Yes')
  await block.getByRole('radio', { name: 'Correct, option 1' }).check()
  await block.getByRole('button', { name: 'Remove option 2' }).click()
  await stage(page, 'Gold').getByLabel('Pass mark (%)').fill('101')

  const put = page.waitForResponse((response) => response.request().method() === 'PUT')
  await page.getByRole('button', { name: 'Save' }).click()
  expect((await put).status()).toBe(422)

  const options = block.getByRole('group', { name: 'Options' })
  await expect(options).toHaveAccessibleDescription('A question needs at least 2 options.')
  // The question's group comes first in the form, so its first control has focus.
  await expect(block.getByLabel('Option 1', { exact: true })).toBeFocused()

  const goldPassMark = stage(page, 'Gold').getByLabel('Pass mark (%)')
  await expect(goldPassMark).toHaveAccessibleDescription('The pass mark must be a whole number from 1 to 100.')
  await expect(goldPassMark).toHaveAttribute('aria-invalid', 'true')

  // Nothing was saved.
  await page.reload()
  await expectStage(page, { name: 'Bronze', passMark: '', questions: [] })
  await expectStage(page, { name: 'Gold', passMark: '', questions: [] })
})

test('an unknown Course, or an id that is not a number, shows Not found', async ({ page }) => {
  await page.goto('/admin/courses/999999')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.')

  await page.goto('/admin/courses/abc')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found.')
})
