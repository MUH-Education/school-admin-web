import { expect, test } from '@playwright/test'
import { installSignalSwitch, loginAsBalwan, mockTaps, row, setSignal } from './phone'

test('offline taps survive a reload and are sent with their own times when the signal returns', async ({
  page,
}) => {
  await installSignalSwitch(page)
  await loginAsBalwan(page)
  await expect(page.getByRole('heading', { name: 'नमस्ते, Balwan' })).toBeVisible()
  await expect(page.getByText('रूट 4 · वैन 4 · 19 बच्चे')).toBeVisible()
  await expect(page.getByRole('link', { name: /सुबह चढ़ाना/ })).toContainText('11 / 19 चढ़े')

  await page.getByRole('link', { name: /सुबह चढ़ाना/ }).click()
  await expect(page).toHaveURL(/\/trip\/pickup/)
  await expect(page.getByRole('heading', { name: 'स्टॉप 3 · कन्हेड़ी' })).toBeVisible()
  await expect(page.getByText('सब जानकारी ऑफ़िस पहुँच गई')).toBeVisible()

  // The signal goes. Five taps: four at Kanheri, one at Tohana town.
  await setSignal(page, false)
  await row(page, 'यश').getByRole('button', { name: 'चढ़ गए' }).click()
  await row(page, 'सिमरन').getByRole('button', { name: 'चढ़ गए' }).click()
  await row(page, 'रोहित').getByRole('button', { name: 'नहीं आए' }).click()
  await row(page, 'नेहा').getByRole('button', { name: 'चढ़ गए' }).click()
  await page.getByRole('button', { name: 'अगला स्टॉप: टोहाना शहर ›' }).click()
  await row(page, 'विवेक').getByRole('button', { name: 'चढ़ गए' }).click()

  await expect(page.getByText('नेटवर्क नहीं है')).toBeVisible()
  await expect(page.getByText(/5 टैप फ़ोन में सेव हैं/)).toBeVisible()
  await expect(row(page, 'विवेक').getByRole('button', { name: '✓ चढ़ गए' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  // Close and open the app again: the answers and the amber banner are still there.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'स्टॉप 4 · टोहाना शहर' })).toBeVisible()
  await expect(page.getByText(/5 टैप फ़ोन में सेव हैं/)).toBeVisible()
  await expect(page.getByLabel('बच्चे चढ़े')).toHaveText('15 / 19')
  await expect(row(page, 'विवेक').getByRole('button', { name: '✓ चढ़ गए' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: /स्टॉप 3 · कन्हेड़ी/ }).click()
  await expect(row(page, 'यश').getByRole('button', { name: '✓ चढ़ गए' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(row(page, 'रोहित').getByRole('button', { name: 'नहीं आए' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(await mockTaps(page)).toEqual([])

  // The signal returns. Within 20 seconds the strip is green and the server has the 5 taps.
  await page.waitForTimeout(2000)
  const signalBack = Date.now()
  await setSignal(page, true)
  await expect(page.getByText('सब जानकारी ऑफ़िस पहुँच गई')).toBeVisible({ timeout: 20_000 })
  const taps = await mockTaps(page)
  expect(taps).toHaveLength(5)
  expect(taps.map((t) => t.studentId).sort()).toEqual([412, 413, 414, 415, 416].sort())
  // Each tap keeps the time of the press, not the time of sending.
  for (const tap of taps) {
    expect(Date.parse(tap.occurredAt)).toBeLessThan(signalBack - 1000)
  }
  expect(taps.find((t) => t.studentId === 414)?.outcome).toBe('ABSENT')
})

test('the attendant cannot open the office pages', async ({ page }) => {
  await loginAsBalwan(page)
  await page.goto('/students')
  await expect(page.getByRole('heading', { name: 'You cannot open this page' })).toBeVisible()
})

test('a whole day as Balwan: pickup, reached school, evening, home drop', async ({ page }) => {
  await installSignalSwitch(page)
  await loginAsBalwan(page)

  // Morning pickup: Kanheri then Tohana town (Sadhanwas and Jakhal are done at 7:48).
  await page.goto('/trip/pickup')
  await expect(page.getByRole('heading', { name: 'स्टॉप 3 · कन्हेड़ी' })).toBeVisible()
  for (const name of ['यश', 'सिमरन', 'नेहा']) {
    await row(page, name).getByRole('button', { name: 'चढ़ गए' }).click()
  }
  await row(page, 'रोहित').getByRole('button', { name: 'नहीं आए' }).click()
  await page.getByRole('button', { name: 'अगला स्टॉप: टोहाना शहर ›' }).click()
  for (const name of ['विवेक', 'रिया', 'अमन']) {
    await row(page, name).getByRole('button', { name: 'चढ़ गए' }).click()
  }
  await expect(page.getByLabel('बच्चे चढ़े')).toHaveText('17 / 19')
  await page.getByRole('link', { name: 'स्कूल पहुँचे ›' }).click()

  // Reached school: one question, then 17 taps.
  await expect(page).toHaveURL(/\/trip\/school/)
  await expect(page.getByText('बच्चे बस में हैं')).toBeVisible()
  await page.getByRole('button', { name: /हाँ, सब 17 बच्चे/ }).click()
  await page
    .getByRole('dialog', { name: '17 बच्चे स्कूल में उतर गए?' })
    .getByRole('button', { name: 'हाँ' })
    .click()
  await expect(page.getByText('✓ सब 17 बच्चे स्कूल पहुँच गए')).toBeVisible()
  await page.getByRole('link', { name: 'आज के काम' }).click()

  // Evening boarding: one child does not go (आर्यन went home with a parent).
  await page.getByRole('link', { name: /छुट्टी में चढ़ाना/ }).click()
  await expect(page.getByRole('alert')).toContainText('17 बच्चे अभी बस में नहीं हैं')
  await expect(page.getByRole('button', { name: 'बस चलाने से पहले 17 का जवाब दें' })).toBeDisabled()
  await row(page, 'आर्यन').getByRole('button', { name: 'नहीं जाएँगे' }).click()
  for (let left = 16; left > 0; left--) {
    await page.getByRole('button', { name: 'चढ़ गए', exact: true }).first().click()
  }
  await expect(page.getByLabel('बच्चे चढ़े')).toHaveText('16 / 17')
  await page.getByRole('link', { name: 'घर उतारना शुरू करें ›' }).click()

  // Home drop: the stops in evening order, one press for each stop.
  await expect(page.getByRole('heading', { name: 'स्टॉप 1 · टोहाना शहर' })).toBeVisible()
  await page.getByRole('button', { name: 'इस स्टॉप के सब बच्चे उतर गए' }).click()
  await page.getByRole('button', { name: 'अगला स्टॉप: कन्हेड़ी ›' }).click()
  await page.getByRole('button', { name: 'इस स्टॉप के सब बच्चे उतर गए' }).click()
  await page.getByRole('button', { name: 'अगला स्टॉप: जाखल ›' }).click()
  await page.getByRole('button', { name: 'इस स्टॉप के सब बच्चे उतर गए' }).click()
  await page.getByRole('button', { name: 'अगला स्टॉप: साधनवास ›' }).click()
  await page.getByRole('button', { name: 'इस स्टॉप के सब बच्चे उतर गए' }).click()
  await expect(page.getByLabel('बच्चे उतरे')).toHaveText('16 / 16')
  await page.getByRole('link', { name: 'आज का काम पूरा ›' }).click()

  // All four jobs are done, and everything has reached the office.
  await expect(page).toHaveURL(/\/trip$/)
  for (const job of ['सुबह चढ़ाना', 'स्कूल पहुँचे', 'छुट्टी में चढ़ाना', 'घर उतारना']) {
    await expect(page.getByRole('link', { name: new RegExp(job) })).toContainText('पूरा हुआ')
  }
  await expect(page.getByText('सब जानकारी ऑफ़िस पहुँच गई')).toBeVisible({ timeout: 20_000 })
  const taps = await mockTaps(page)
  const count = (type: string) => taps.filter((t) => t.eventType === type).length
  expect(count('BOARDED_MORNING')).toBe(7)
  expect(count('REACHED_SCHOOL')).toBe(17)
  expect(count('BOARDED_EVENING')).toBe(17)
  expect(count('REACHED_HOME')).toBe(16)
})
