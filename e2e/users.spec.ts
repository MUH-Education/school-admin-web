import { expect, test } from '@playwright/test'

test('the owner logs in, adds a user, sees them in the table and logs out', async ({ page }) => {
  await page.goto('/')

  // Step 1: phone. Step 2: code. In mock mode the code is 000000.
  await page.getByLabel('Mobile number').fill('98123 40001')
  await page.getByRole('button', { name: 'Send code' }).click()
  await page.getByLabel('6-digit code').fill('000000')
  await page.getByRole('button', { name: 'Log in' }).click()

  // The owner lands on Bus status and sees the whole menu.
  await expect(page).toHaveURL(/\/bus-status$/)
  await page.getByRole('link', { name: 'Users and roles' }).click()
  await expect(page.getByRole('heading', { name: 'Users and roles', level: 1 })).toBeVisible()

  // Add a user with only a phone and a role.
  await page.getByRole('button', { name: 'Add user' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add user' })
  await dialog.getByLabel('Mobile number').fill('98765 43210')
  await dialog.getByLabel('Role').selectOption({ label: 'Office admin' })
  await dialog.getByRole('button', { name: 'Add user' }).click()

  await expect(page.getByText('User added')).toBeVisible()
  const table = page.getByRole('table', { name: 'People with a login' })
  await expect(table.getByRole('cell', { name: '+919876543210', exact: true })).toBeVisible()

  // Log out.
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByLabel('Mobile number')).toBeVisible()
})
