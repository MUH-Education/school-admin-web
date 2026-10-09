import { expect, test, type Page } from '@playwright/test'

async function logIn(page: Page, phone: string) {
  await page.goto('/')
  await page.getByLabel('Mobile number').fill(phone)
  await page.getByRole('button', { name: 'Send code' }).click()
  await page.getByLabel('6-digit code').fill('000000')
  await page.getByRole('button', { name: 'Log in' }).click()
}

test('open Analytics, choose village Jakhal, see the count line and the list change, download the file', async ({
  page,
}) => {
  // The owner (mock code 000000).
  await logIn(page, '98123 40001')
  await page
    .getByRole('navigation', { name: 'Main menu' })
    .getByRole('link', { name: 'Analytics' })
    .click()
  await expect(page).toHaveURL(/\/analytics$/)
  await expect(page.getByRole('heading', { name: 'Analytics', level: 1 })).toBeVisible()

  // All students: the count line, the tile and a full first page.
  const all = page.getByText(/^Showing all \d+ students\.$/)
  await expect(all).toBeVisible()
  const total = Number(/\d+/.exec((await all.textContent()) ?? '')?.[0])
  const table = page.getByRole('table', { name: 'Students and families' })
  await expect(table.getByRole('row')).toHaveCount(26)

  // Choose Jakhal: the address, the count line and the list follow.
  await page.getByLabel('Village', { exact: true }).selectOption('Jakhal')
  await expect(page).toHaveURL(/village=Jakhal/)
  await expect(page.getByText(new RegExp(`^Showing \\d+ of ${total} students\\.$`))).toBeVisible()
  await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible()
  const rows = table.getByRole('row')
  await expect(rows).not.toHaveCount(26)
  const cells = table.getByRole('cell', { name: 'Jakhal', exact: true })
  await expect(cells.first()).toBeVisible()
  expect(await cells.count()).toBe((await rows.count()) - 1)

  // Download as Excel: the file of the filtered list, named with the day of the mock clock.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download as Excel' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('students-2026-10-07.csv')
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  const bytes = Buffer.concat(chunks)
  // A byte order mark first, so Excel reads the names as UTF-8.
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  expect(bytes.toString('utf8')).toContain('Jakhal')

  // Clear filters: back to all students.
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByText(/^Showing all \d+ students\.$/)).toBeVisible()
})
