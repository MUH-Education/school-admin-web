import { expect, test } from '@playwright/test'

test('change the driver of Van 4 for some days, then add a stop to Route 4', async ({ page }) => {
  await page.goto('/')

  // Log in as the owner (mock code 000000).
  await page.getByLabel('Mobile number').fill('98123 40001')
  await page.getByRole('button', { name: 'Send code' }).click()
  await page.getByLabel('6-digit code').fill('000000')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/bus-status$/)

  // Vehicles and staff → Van 4.
  await page.getByRole('link', { name: 'Vehicles and staff' }).click()
  await expect(page.getByRole('heading', { name: 'Vehicles and staff', level: 1 })).toBeVisible()
  await page.getByRole('link', { name: 'Open Van 4' }).click()
  await expect(page.getByRole('heading', { name: 'Van 4', level: 1 })).toBeVisible()

  // Change the driver from 12 to 16 October.
  const people = page.getByLabel('People on this vehicle')
  await expect(people.getByText('Jagdish')).toBeVisible()
  await people.getByRole('button', { name: 'Change driver' }).click()
  const form = people.getByRole('form', { name: 'Change the driver of Van 4' })
  await form.getByLabel('New driver').selectOption({ label: 'Surender · free now' })
  await form.getByLabel('From date').fill('2026-10-12')
  await form.getByLabel('Last day').fill('2026-10-16')
  await form.getByRole('button', { name: 'Save change' }).click()

  await expect(page.getByText('Driver changed')).toBeVisible()
  await expect(people.getByText('Surender')).toBeVisible()
  await expect(people.getByText(/till 16 Oct, then Jagdish is back/)).toBeVisible()

  // Routes and load → Route 4 → add a stop → save.
  await page.getByRole('link', { name: 'Routes and load' }).click()
  await expect(page.getByRole('heading', { name: 'Routes and load', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: /Route 4/ }).click()
  await expect(page).toHaveURL(/\/routes\?route=4$/)

  const panel = page.getByRole('region', { name: 'Route 4 details' })
  await expect(panel.getByRole('list', { name: 'Stops' })).toBeVisible()
  await panel.getByRole('button', { name: 'Add stop' }).click()
  await panel.getByLabel('Name of stop 5').fill('Dhani')
  await panel.getByLabel('Morning time of stop 5').fill('08:10')
  await panel.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByText('Route saved')).toBeVisible()
  await expect(panel.getByText('Dhani')).toBeVisible()
  await expect(panel.getByText('8:10')).toBeVisible()
})
