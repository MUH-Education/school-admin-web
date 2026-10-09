import { expect, test } from '@playwright/test'

test('admit a child with no bus, start the bus from a later date, add a phone number', async ({
  page,
}) => {
  await page.goto('/')

  // Log in as the office admin (mock code 000000).
  await page.getByLabel('Mobile number').fill('98123 40002')
  await page.getByRole('button', { name: 'Send code' }).click()
  await page.getByLabel('6-digit code').fill('000000')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/bus-status$/)

  // New admission: parts 1 and 2, and "No, comes on own".
  await page
    .getByRole('navigation', { name: 'Main menu' })
    .getByRole('link', { name: 'New admission' })
    .click()
  const form = page.getByRole('form', { name: 'New admission' })
  await expect(form).toBeVisible()
  await form.getByLabel('Student name *').fill('Kavya Goyal')
  await form.getByLabel('Date of birth *').fill('2021-08-14')
  await form.getByLabel('Class *').selectOption({ label: 'UKG' })
  await form.getByLabel('Girl').check()
  await form.getByLabel("Father's name *").fill('Rakesh Goyal')
  await form.getByLabel("Father's phone *").fill('98123 00771')
  await form.getByLabel("Father's occupation *").selectOption({ label: 'Shopkeeper or trader' })
  await form.getByLabel('Village or locality *').fill('Tohana town')
  await form.getByLabel('No, comes on own').check()
  // Part 4: the school fee comes from the class; the family says how often it pays.
  await expect(form.getByLabel(/School fee for the year/)).toHaveValue('26,000')
  await form.getByLabel('Every 3 months').check()
  await form.getByRole('button', { name: 'Save admission' }).click()

  // The new child's page opens, with the toast and the number.
  await expect(page.getByText('Admitted. Admission number A-2026-119')).toBeVisible()
  await expect(page).toHaveURL(/\/students\/\d+$/)
  await expect(page.getByRole('heading', { name: 'Kavya Goyal', level: 1 })).toBeVisible()
  const transport = page.getByRole('region', { name: 'Transport' })
  await expect(transport).toContainText('does not use the bus')

  // Start the bus from a later date.
  await transport.getByRole('button', { name: 'Change' }).click()
  const change = transport.getByRole('form', { name: 'Change the bus' })
  await change.getByLabel('Route').selectOption({ label: 'Route 1' })
  await change.getByLabel('Stop').selectOption({ label: 'Bhuna road · 7:22' })
  await change.getByLabel('Start from').fill('2030-11-02')
  await change.getByRole('button', { name: 'Save change' }).click()
  await expect(transport).toContainText('From 2 November 2030: Route 1, Bhuna road.')
  await expect(transport).toContainText('Now: does not use the bus')

  // Add a phone number: it becomes the second line of the list.
  const phones = page.getByRole('region', { name: 'Parents and phone numbers' })
  await phones.getByRole('button', { name: 'Add a phone number' }).click()
  const add = phones.getByRole('form', { name: 'Add a phone number' })
  await add.getByLabel('Name').fill('Ramkumar Goyal')
  await add.getByLabel('Relation to the child').selectOption({ label: 'Grandfather' })
  await add.getByLabel('Phone number').fill('94123 45208')
  await add.getByRole('button', { name: 'Save number' }).click()
  const items = phones.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(1)).toContainText('Ramkumar Goyal · Grandfather')
  await expect(items.nth(1)).toContainText('94XXX XX208')

  // The new child is in the list.
  await page
    .getByRole('navigation', { name: 'Main menu' })
    .getByRole('link', { name: 'Students' })
    .click()
  await page.getByLabel(/Search by name/).fill('Kavya Goyal')
  await expect(page).toHaveURL(/\/students\?q=Kavya\+Goyal$/)
  await expect(page.getByRole('link', { name: 'Open Kavya Goyal' })).toBeVisible()
})
