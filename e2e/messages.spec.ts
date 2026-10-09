import { expect, test } from '@playwright/test'

test('open Messages, find one failed SMS and one child, then see the SMS column on One bus', async ({
  page,
}) => {
  await page.goto('/')
  // Log in as the owner (mock code 000000).
  await page.getByLabel('Mobile number').fill('98123 40001')
  await page.getByRole('button', { name: 'Send code' }).click()
  await page.getByLabel('6-digit code').fill('000000')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/bus-status$/)

  // The menu has Messages. The day starts at today.
  await page
    .getByRole('navigation', { name: 'Main menu' })
    .getByRole('link', { name: 'Messages' })
    .click()
  await expect(page).toHaveURL(/\/messages$/)
  await expect(page.getByRole('heading', { name: 'Messages', level: 1 })).toBeVisible()
  await expect(page.getByLabel('Day', { exact: true })).toHaveValue('2026-10-07')
  const tiles = page.getByRole('region', { name: 'Message counts' })
  await expect(tiles).toContainText('Failed')
  await expect(page.getByRole('table', { name: 'Messages' }).getByRole('row')).toHaveCount(26)

  // "I got no message": show the failed ones and read the reason.
  await page.getByLabel('Status').selectOption('FAILED')
  await expect(page).toHaveURL(/\/messages\?status=FAILED$/)
  await expect(page.getByText('Number not reachable (DND is on)')).toBeVisible()
  await page.getByLabel('Status').selectOption('')

  // Search a child by name.
  await page.getByLabel('Search a child by name').fill('Tanvi')
  await expect(page).toHaveURL(/\/messages\?q=Tanvi$/)
  const rows = page.getByRole('table', { name: 'Messages' }).getByRole('row')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(1)).toContainText('Sent 7:43')
  await expect(rows.nth(1)).toContainText('+91XXXXXX')

  // The test-mode day shows the amber box.
  await page.getByLabel('Day', { exact: true }).fill('2026-10-06')
  await expect(page.getByRole('status', { name: 'Test mode' })).toContainText(
    "Messages are not going to parents' phones.",
  )

  // One bus: the SMS column of Route 4.
  await page.goto('/bus-status/routes/4')
  const table = page.getByRole('table', { name: 'Children on this route' })
  const cellOf = (name: string) =>
    table.getByRole('row').filter({ hasText: name }).getByRole('cell').nth(7)
  await expect(cellOf('Aryan')).toHaveText('Sent 7:42')
  await expect(cellOf('Kirti')).toHaveText('None for this event (Class 9)')
  await expect(cellOf('Deepak')).toHaveText('None (Class 11)')
  await expect(page.getByText('SMS follows the class rule.')).toBeVisible()
})

test('the admissions desk has no Messages in the menu and cannot open the page', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Mobile number').fill('98123 40004')
  await page.getByRole('button', { name: 'Send code' }).click()
  await page.getByLabel('6-digit code').fill('000000')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('navigation', { name: 'Main menu' })).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Main menu' }).getByRole('link', { name: 'Messages' }),
  ).toHaveCount(0)
  await page.goto('/messages')
  await expect(page.getByRole('heading', { name: 'You cannot open this page' })).toBeVisible()
})
