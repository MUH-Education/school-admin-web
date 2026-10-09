import { expect, test } from '@playwright/test'

test('add an enquiry, add a follow-up, start the admission, save, and see the enquiry as Admitted', async ({
  page,
}) => {
  await page.goto('/')

  // Log in as the admissions desk (mock code 000000).
  await page.getByLabel('Mobile number').fill('98123 40004')
  await page.getByRole('button', { name: 'Send code' }).click()
  await page.getByLabel('6-digit code').fill('000000')
  await page.getByRole('button', { name: 'Log in' }).click()

  // The list: seven tiles, the overdue box, 29 enquiries.
  await page
    .getByRole('navigation', { name: 'Main menu' })
    .getByRole('link', { name: 'Enquiries' })
    .click()
  await expect(page).toHaveURL(/\/enquiries$/)
  await expect(page.getByRole('heading', { name: 'Enquiries', level: 1 })).toBeVisible()
  await expect(page.getByText('4 of 29 admitted so far · 14%')).toBeVisible()
  await expect(page.getByText('4 follow-ups are overdue')).toBeVisible()

  // Add an enquiry in the roomy form.
  await page.getByRole('link', { name: 'Add enquiry' }).click()
  await expect(page).toHaveURL(/\/enquiries\/new$/)
  const add = page.getByRole('form', { name: 'Add an enquiry' })
  await add.getByLabel('Parent name *').fill('Ramesh Malik')
  await add.getByLabel('Phone number *').fill('98123 55501')
  await add.getByLabel('Village or locality *').fill('Jakhal')
  await add.getByLabel("Child's name").fill('Tanya Malik')
  await add.getByLabel('Class wanted *').selectOption({ label: 'Class 2' })
  await add.getByLabel('Referral').check()
  await add.getByLabel('Referred by which parent *').fill('Poonam Devi')
  await add.getByLabel('Call back on *').fill('2026-10-09')
  await add.getByRole('button', { name: 'Save enquiry' }).click()

  // Back on the list, the new enquiry is on top and the tiles moved.
  await expect(page).toHaveURL(/\/enquiries$/)
  const rows = page.getByRole('table', { name: 'Enquiries' }).getByRole('row')
  await expect(rows.nth(1)).toContainText('Ramesh Malik')
  await expect(rows.nth(1)).toContainText('Referral')
  await expect(page.getByText('4 of 30 admitted so far · 13%')).toBeVisible()

  // Open it, move it to Visited, add a follow-up with a new date.
  await rows.nth(1).getByRole('link', { name: /Open/ }).click()
  await expect(page.getByRole('heading', { name: 'Ramesh Malik', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Start admission' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Mark as Visited' }).click()
  await expect(page.getByRole('region', { name: 'Stage' }).getByText('Visited')).toBeVisible()
  const notes = page.getByRole('region', { name: 'Follow-ups' })
  await notes.getByLabel('Note *').fill('Came with the child and saw the classrooms.')
  await notes.getByLabel('Next date (optional)').fill('2026-10-12')
  await notes.getByRole('button', { name: 'Add note' }).click()
  await expect(notes.getByText('Came with the child and saw the classrooms.')).toBeVisible()
  await expect(page.getByLabel('Call back on *')).toHaveValue('2026-10-12')

  // Start the admission: the form is filled and the blue box shows.
  await page.getByRole('link', { name: 'Start admission' }).click()
  await expect(page).toHaveURL(/\/admissions\/new\?enquiryId=\d+$/)
  await expect(page.getByRole('region', { name: 'Started from an enquiry' })).toContainText(
    'Started from the enquiry of Ramesh Malik, Jakhal, Class 2.',
  )
  const form = page.getByRole('form', { name: 'New admission' })
  await expect(form.getByLabel('Student name *')).toHaveValue('Tanya Malik')
  await expect(form.getByLabel("Father's name *")).toHaveValue('Ramesh Malik')
  await expect(form.getByLabel('Village or locality *')).toHaveValue('Jakhal')
  await form.getByLabel('Date of birth *').fill('2019-05-03')
  await form.getByLabel('Girl').check()
  await form.getByLabel("Father's occupation *").selectOption({ label: 'Shopkeeper or trader' })
  await form.getByLabel('No, comes on own').check()
  await expect(form.getByLabel(/School fee for the year/)).toHaveValue('28,000')
  await form.getByLabel('Every 3 months').check()
  await form.getByRole('button', { name: 'Save admission' }).click()
  await expect(page).toHaveURL(/\/students\/\d+$/)

  // The enquiry is now Admitted, and Start admission is gone.
  await page
    .getByRole('navigation', { name: 'Main menu' })
    .getByRole('link', { name: 'Enquiries' })
    .click()
  await page
    .getByRole('region', { name: 'Filter by stage' })
    .getByRole('button', { name: /^Admitted/ })
    .click()
  await expect(page).toHaveURL(/\/enquiries\?status=ADMITTED$/)
  const admitted = page.getByRole('table', { name: 'Enquiries' }).getByRole('row')
  await expect(admitted.filter({ hasText: 'Ramesh Malik' })).toContainText('Admitted')
  await expect(page.getByText('5 of 30 admitted so far · 17%')).toBeVisible()
})

test('the transport in-charge does not see Enquiries', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mobile number').fill('98123 40003')
  await page.getByRole('button', { name: 'Send code' }).click()
  await page.getByLabel('6-digit code').fill('000000')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/bus-status$/)
  await expect(
    page.getByRole('navigation', { name: 'Main menu' }).getByRole('link', { name: 'Enquiries' }),
  ).toHaveCount(0)
  await page.goto('/enquiries')
  await expect(page.getByRole('heading', { name: 'You cannot open this page' })).toBeVisible()
})
