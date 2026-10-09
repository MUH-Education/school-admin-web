import { expect, test } from '@playwright/test'

test('a visitor without a login sees the login page', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'School admin' })).toBeVisible()
  await expect(page.getByText('Sample data')).toBeVisible()
})
