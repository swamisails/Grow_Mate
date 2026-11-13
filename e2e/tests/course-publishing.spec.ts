import { expect, test, type Page } from '@playwright/test'

async function adminSignIn(page: Page) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(process.env.ADMIN_EMAIL!)
  await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/admin\/courses$/)
}

async function apiRequest(page: Page, method: 'GET' | 'PUT' | 'POST', path: string, body?: unknown) {
  return page.evaluate(async ({ method, path, body }) => {
    const token = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length)
    const response = await fetch(path, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(token ?? '') },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    return { status: response.status, body: await response.json() }
  }, { method, path, body })
}

test('Admin publishes saved content with keyboard confirmation; Employees see only the published description', async ({ page, browser }) => {
  await adminSignIn(page)
  await page.getByRole('link', { name: 'New Course' }).click()
  await page.getByLabel('Title').fill('Published browser course')
  await page.getByLabel('Description').fill('A published description.')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/admin\/courses\/\d+$/)
  const id = page.url().split('/').at(-1)!
  const publish = page.getByRole('button', { name: 'Publish', exact: true })
  await expect(publish).toBeDisabled()
  expect((await apiRequest(page, 'POST', `/api/v1/admin/courses/${id}/publish`, {})).status).toBe(409)

  for (const name of ['Bronze', 'Silver', 'Gold']) {
    const stage = page.getByRole('region', { name })
    await stage.getByLabel('Pass mark (%)').fill('70')
    await stage.getByRole('button', { name: 'Add question' }).click()
    await stage.getByLabel('Question', { exact: true }).fill(`Private ${name} question`)
    await stage.getByLabel('Option 1', { exact: true }).fill('Private correct answer')
    await stage.getByLabel('Option 2', { exact: true }).fill('Private other answer')
    await stage.getByRole('radio', { name: 'Correct, option 1' }).check()
  }
  await expect(publish).toBeDisabled()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(publish).toBeEnabled()
  const before = await apiRequest(page, 'GET', `/api/v1/admin/courses/${id}`)

  const employeeContext = await browser.newContext()
  const employee = await employeeContext.newPage()
  await employee.goto('/sign-up')
  await employee.getByLabel('Name').fill('Publishing reader')
  await employee.getByLabel('Email').fill('publishing-reader@example.com')
  await employee.getByLabel('Password').fill('employee-password')
  await employee.getByRole('button', { name: 'Sign up' }).click()
  await expect(employee).toHaveURL(/\/mentor-check$/)
  await employee.getByRole('button', { name: 'Skip' }).click()
  await expect(employee).toHaveURL(/\/home$/)
  await employee.getByRole('region', { name: 'Learning' }).getByRole('link', { name: 'Courses' }).click()
  // The seeded demo Courses are published; the draft is not listed.
  await expect(employee.getByRole('link', { name: 'Python Basics' })).toBeVisible()
  await expect(employee.getByRole('link', { name: 'Published browser course' })).toHaveCount(0)
  await employee.goto(`/courses/${id}`)
  await expect(employee.getByRole('heading', { level: 1 })).toHaveText('Page not found.')

  await publish.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Publish' })
  const cancel = dialog.getByRole('button', { name: 'Cancel' })
  const confirm = dialog.getByRole('button', { name: 'Publish' })
  await expect(dialog).toHaveAccessibleDescription("Published courses can't be edited.")
  await expect(cancel).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(confirm).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(cancel).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(publish).toBeFocused()
  expect((await apiRequest(page, 'GET', `/api/v1/admin/courses/${id}`)).body.data.status).toBe('draft')

  await publish.click()
  await cancel.click()
  await expect(publish).toBeFocused()
  await publish.click()
  await confirm.click()
  await expect(page.getByText('Published', { exact: true })).toBeVisible()
  // The Publish button is gone, so focus moves to the page title.
  await expect(page.getByRole('heading', { level: 1, name: 'Published browser course' })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0)
  await expect(page.getByRole('textbox')).toHaveCount(0)
  expect((await apiRequest(page, 'PUT', `/api/v1/admin/courses/${id}`, before.body.data)).status).toBe(409)
  expect((await apiRequest(page, 'POST', `/api/v1/admin/courses/${id}/publish`, {})).status).toBe(409)

  await employee.getByRole('navigation').getByRole('link', { name: 'Courses' }).click()
  await employee.getByRole('link', { name: 'Published browser course' }).click()
  await expect(employee.getByRole('heading', { level: 1 })).toHaveText('Published browser course')
  await expect(employee.getByText('A published description.')).toBeVisible()
  const detail = await apiRequest(employee, 'GET', `/api/v1/courses/${id}`)
  expect(detail.body.data).toEqual({ id: Number(id), title: 'Published browser course', description: 'A published description.' })
  await expect(employee.getByText('Private correct answer')).toHaveCount(0)
  await employeeContext.close()
})

test('an empty published list shows its empty state', async ({ page }) => {
  await page.goto('/sign-up')
  await page.getByLabel('Name').fill('Empty list reader')
  await page.getByLabel('Email').fill('empty-list-reader@example.com')
  await page.getByLabel('Password').fill('employee-password')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await expect(page).toHaveURL(/\/mentor-check$/)
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.route('**/api/v1/courses', (route) => route.fulfill({ json: { data: [] } }))
  await page.getByRole('navigation').getByRole('link', { name: 'Courses' }).click()
  await expect(page.getByText('No courses yet.')).toBeVisible()
})

test('concurrent Save and Publish serialize and later writes leave the published document unchanged', async ({ page }) => {
  await adminSignIn(page)
  const created = await apiRequest(page, 'POST', '/api/v1/admin/courses', { title: 'Concurrent course', description: 'Before.' })
  const id = created.body.data.id
  const document = {
    title: 'Concurrent course', description: 'Before.',
    stages: ['bronze', 'silver', 'gold'].map((level) => ({
      level, pass_mark: 70, questions: [{ text: 'Question?', options: [{ text: 'Yes', is_correct: true }, { text: 'No', is_correct: false }] }],
    })),
  }
  expect((await apiRequest(page, 'PUT', `/api/v1/admin/courses/${id}`, document)).status).toBe(200)
  const [save, publish] = await Promise.all([
    apiRequest(page, 'PUT', `/api/v1/admin/courses/${id}`, { ...document, description: 'Concurrent edit.' }),
    apiRequest(page, 'POST', `/api/v1/admin/courses/${id}/publish`, {}),
  ])
  expect(publish.status).toBe(200)
  expect([200, 409]).toContain(save.status)
  const frozen = (await apiRequest(page, 'GET', `/api/v1/admin/courses/${id}`)).body.data
  expect(frozen.status).toBe('published')
  expect(frozen.description).toBe(save.status === 200 ? 'Concurrent edit.' : 'Before.')
  expect((await apiRequest(page, 'PUT', `/api/v1/admin/courses/${id}`, document)).status).toBe(409)
  expect((await apiRequest(page, 'GET', `/api/v1/admin/courses/${id}`)).body.data).toEqual(frozen)
})
