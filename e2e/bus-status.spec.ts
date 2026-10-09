import { expect, test } from '@playwright/test'

test('open Bus status as the owner, see 9 routes, open Route 4, see 19 children', async ({
  page,
}) => {
  await page.goto('/')

  // Log in as the owner (mock code 000000). The owner lands on Bus status.
  await page.getByLabel('Mobile number').fill('98123 40001')
  await page.getByRole('button', { name: 'Send code' }).click()
  await page.getByLabel('6-digit code').fill('000000')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/bus-status$/)
  await expect(page.getByRole('heading', { name: 'Bus status', level: 1 })).toBeVisible()
  await expect(page.getByText('Live · updated 7:48 am')).toBeVisible()

  // The picture of 7:48: nine buses, two of them need attention.
  const buses = page.getByRole('region', { name: 'All buses' })
  await expect(buses.getByRole('article')).toHaveCount(9)
  await expect(page.getByRole('region', { name: 'Needs attention' })).toContainText(
    'Route 3 has no taps yet',
  )
  await expect(buses.getByRole('article', { name: 'Route 5' })).toContainText('Late by 16 minutes')

  // The evening picture is in the address.
  await page.getByRole('button', { name: 'Evening drop' }).click()
  await expect(page).toHaveURL(/\/bus-status\?phase=EVENING$/)
  await expect(page.getByText('Live · updated 3:32 pm')).toBeVisible()
  await page.getByRole('button', { name: 'Morning pickup' }).click()
  await expect(page).toHaveURL(/phase=MORNING$/)

  // Route 4 → 19 children with their four events.
  await buses
    .getByRole('article', { name: 'Route 4' })
    .getByRole('link', { name: /View children/ })
    .click()
  await expect(page).toHaveURL(/\/bus-status\/routes\/4\?phase=MORNING$/)
  await expect(page.getByRole('heading', { name: 'Route 4', level: 1 })).toBeVisible()
  await expect(page.getByText('On the way to Kanheri')).toBeVisible()
  await expect(page.getByRole('heading', { name: '19 children on this route' })).toBeVisible()
  const table = page.getByRole('table')
  await expect(table.getByRole('row')).toHaveCount(20) // 19 children and the header
  await expect(table.getByRole('columnheader', { name: 'Reached home' })).toBeVisible()
  await expect(table.getByRole('row', { name: /Pooja/ })).toContainText('Absent')
  await expect(table.getByRole('row', { name: /Yash/ })).toContainText('Waiting')
})
