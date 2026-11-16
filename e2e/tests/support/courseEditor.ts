import { expect, type Locator, type Page } from '@playwright/test'

// Course editor steps shared by the specs. Not a spec itself: Playwright collects only `*.spec.ts` under tests/.

export type QuestionSpec = { text: string; options: string[]; correct: number }
export type StageSpec = { name: 'Bronze' | 'Silver' | 'Gold'; passMark: string; questions: QuestionSpec[] }

/** New Course → title and description → Save; resolves on the created Course's editor. */
export async function createCourse(page: Page, title: string) {
  await page.getByRole('link', { name: 'New Course' }).click()
  await expect(page).toHaveURL(/\/admin\/courses\/new$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('New Course')

  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Description').fill(`What ${title} covers.`)
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page).toHaveURL(/\/admin\/courses\/\d+$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
}

export function stage(page: Page, name: string): Locator {
  return page.getByRole('region', { name })
}

export function question(stageCard: Locator, n: number): Locator {
  return stageCard.getByRole('group', { name: `Question ${n}`, exact: true })
}

export async function fillStage(page: Page, spec: StageSpec) {
  const card = stage(page, spec.name)
  await card.getByLabel('Pass mark (%)').fill(spec.passMark)
  for (const [q, questionSpec] of spec.questions.entries()) {
    await card.getByRole('button', { name: 'Add question' }).click()
    const block = question(card, q + 1)
    await block.getByLabel('Question', { exact: true }).fill(questionSpec.text)
    // A new question comes with two empty options.
    for (let o = 2; o < questionSpec.options.length; o++) {
      await block.getByRole('button', { name: `Add option to question ${q + 1}` }).click()
    }
    for (const [o, option] of questionSpec.options.entries()) {
      await block.getByLabel(`Option ${o + 1}`, { exact: true }).fill(option)
    }
    await block.getByRole('radio', { name: `Correct, option ${questionSpec.correct + 1}` }).check()
  }
}

/** Save, and wait until the editor has re-fetched the saved Course. */
export async function save(page: Page) {
  const put = page.waitForResponse((response) => response.request().method() === 'PUT')
  const refetch = page.waitForResponse(
    (response) => response.request().method() === 'GET' && /\/api\/v1\/admin\/courses\/\d+$/.test(response.url()),
  )
  await page.getByRole('button', { name: 'Save' }).click()
  expect((await put).status()).toBe(200)
  await refetch
  await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled()
}
