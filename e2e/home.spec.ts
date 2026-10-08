import { expect, test } from '@playwright/test'

test('home page opens', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'School admin' })).toBeVisible()
  await expect(page.getByText('Sample data')).toBeVisible()
})
