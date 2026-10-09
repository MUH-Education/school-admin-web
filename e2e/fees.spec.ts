import { expect, test, type Page } from '@playwright/test'

async function logIn(page: Page, phone: string) {
  await page.goto('/')
  await page.getByLabel('Mobile number').fill(phone)
  await page.getByRole('button', { name: 'Send code' }).click()
  await page.getByLabel('6-digit code').fill('000000')
  await page.getByRole('button', { name: 'Log in' }).click()
}

const menu = (page: Page) => page.getByRole('navigation', { name: 'Main menu' })

test('set the class fee, admit a child, see the Fee summary, record a payment, see the Fee column', async ({
  page,
}) => {
  // The owner (mock code 000000).
  await logIn(page, '98123 40001')

  // Fee setup: Class 5 gets ₹30,000.
  await menu(page).getByRole('link', { name: 'Fee setup' }).click()
  await expect(page).toHaveURL(/\/settings\/fees$/)
  await expect(page.getByRole('heading', { name: 'Fee setup', level: 1 })).toBeVisible()
  const class5 = page.getByLabel('School fee for Class 5')
  await expect(class5).toHaveValue('32,000')
  await class5.fill('30000')
  await expect(class5).toHaveValue('30,000')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Fees saved')).toBeVisible()

  // New admission: the fee of the class is filled in, and the Fee summary changes while typing.
  await menu(page).getByRole('link', { name: 'New admission' }).click()
  const form = page.getByRole('form', { name: 'New admission' })
  await form.getByLabel('Student name *').fill('Anaya Dalal')
  await form.getByLabel('Date of birth *').fill('2016-02-11')
  await form.getByLabel('Class *').selectOption({ label: 'Class 5' })
  await form.getByLabel('Admission date').fill('2026-10-07')
  await form.getByLabel('Girl').check()
  await form.getByLabel("Father's name *").fill('Satbir Dalal')
  await form.getByLabel("Father's phone *").fill('98123 00991')
  await form
    .getByLabel("Father's occupation *")
    .selectOption({ label: 'Farmer, small (under 5 acres)' })
  await form.getByLabel('Village or locality *').fill('Jakhal')
  await form.getByLabel('Yes', { exact: true }).check()
  await form.getByLabel('Route', { exact: true }).selectOption({ label: 'Route 4' })
  await form.getByLabel('Stop').selectOption({ label: 'Jakhal · 7:40' })

  const summary = page.getByRole('complementary', { name: 'Fee summary' })
  await expect(form.getByLabel(/School fee for the year/)).toHaveValue('30,000')
  await expect(form.getByLabel(/Bus fee for the year/)).toHaveValue('8,800')
  await expect(summary).toContainText('Total for the year₹38,800')
  await form.getByLabel('Every 3 months').check()
  await form.getByLabel('Amount received (₹)').pressSequentially('9700')
  await expect(summary).toContainText('Paid today₹9,700')
  await expect(summary).toContainText('Still to pay₹29,100')
  await expect(summary).toContainText('₹9,700 on 1 January 2027')
  await expect(summary).toContainText('4 payments of ₹9,700 in the year.')

  await form.getByRole('button', { name: 'Save admission' }).click()
  await expect(page).toHaveURL(/\/students\/\d+$/)
  await expect(
    page.getByText(/Admitted\. Admission number A-2026-\d+\. Receipt number R-2026-\d+/),
  ).toBeVisible()

  // The student page: the numbers now come from the server.
  const fees = page.getByRole('region', { name: 'Fees this year' })
  await expect(fees).toContainText('Paid so far₹9,700')
  await expect(fees).toContainText('Pending now₹0')
  await expect(fees).toContainText('Still to pay₹29,100')

  // Record a payment of ₹9,700 (₹7,500 school fee and ₹2,200 bus fee).
  await fees.getByRole('button', { name: 'Record a payment' }).click()
  const dialog = page.getByRole('dialog', { name: 'Record a payment' })
  await dialog.getByLabel('Both').check()
  await dialog.getByLabel(/School fee: amount received/).fill('7500')
  await dialog.getByLabel(/Bus fee: amount received/).fill('2200')
  await dialog.getByRole('button', { name: 'Save payment' }).click()
  await expect(page.getByText(/Payment saved\. Receipt number R-2026-\d+/)).toBeVisible()
  await expect(fees).toContainText('Paid so far₹19,400')
  await expect(fees).toContainText('Still to pay₹19,400')
  await expect(fees.getByRole('list', { name: 'Payments' }).getByRole('listitem')).toHaveCount(2)

  // A payment that is too large is refused with the server's sentence, under the amount.
  await fees.getByRole('button', { name: 'Record a payment' }).click()
  await dialog.getByLabel(/School fee: amount received/).fill('99999')
  await dialog.getByRole('button', { name: 'Save payment' }).click()
  await expect(dialog.getByText(/Only ₹\d[\d,]* is left to pay on the school fee\./)).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel' }).click()

  // A child who is late: paying what is due now clears "Pending now".
  await menu(page).getByRole('link', { name: 'Students' }).click()
  await page.getByRole('searchbox').fill('Mohit')
  await page.getByRole('link', { name: 'Open Mohit Nain' }).click()
  await expect(fees).toContainText('Pending now₹10,200')
  await fees.getByRole('button', { name: 'Record a payment' }).click()
  await dialog.getByLabel('Both').check()
  await dialog.getByRole('button', { name: 'Save payment' }).click()
  await expect(page.getByText(/Payment saved\. Receipt number/)).toBeVisible()
  await expect(fees).toContainText('Pending now₹0')

  // The Fee column of the list: words and a square, never colour alone.
  await menu(page).getByRole('link', { name: 'Students' }).click()
  const list = page.getByRole('table', { name: 'Students' })
  await page.getByRole('searchbox').fill('Rohit')
  await expect(list.getByRole('row').nth(1)).toContainText('Rohit Kumar')
  await expect(list.getByRole('row').nth(1)).toContainText('Defaulted')
  await page.getByRole('searchbox').fill('Anaya Dalal')
  await expect(list.getByRole('row').nth(1)).toContainText('Anaya Dalal')
  await expect(list.getByRole('row').nth(1)).toContainText('On time')
})
