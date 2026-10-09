import { expect, type Page } from '@playwright/test'

/** Logs in on the login page with the mock code, as the attendant Balwan (Route 4). */
export async function loginAsBalwan(page: Page) {
  await page.goto('/')
  await page.getByLabel('Mobile number').fill('98123 40005')
  await page.getByRole('button', { name: 'Send code' }).click()
  await page.getByLabel('6-digit code').fill('000000')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/trip$/)
  await expect(page.getByText('आज के चार काम')).toBeVisible()
}

/**
 * The mock API answers inside the browser, so the browser's own "offline switch" cannot cut it.
 * The phone app asks `navigator.onLine`, so this test switch says "no signal" there. It is kept
 * in sessionStorage, so it survives a reload, like a phone that stays without signal.
 */
export async function installSignalSwitch(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => sessionStorage.getItem('no-signal') !== '1',
    })
  })
}

export async function setSignal(page: Page, on: boolean) {
  await page.evaluate((hasSignal) => {
    if (hasSignal) sessionStorage.removeItem('no-signal')
    else sessionStorage.setItem('no-signal', '1')
    window.dispatchEvent(new Event(hasSignal ? 'online' : 'offline'))
  }, on)
}

/** What the mock server has stored from POST /trips/marks. */
export async function mockTaps(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch('/api/v1/_mock/taps')
    return (await response.json()) as {
      studentId: number
      eventType: string
      outcome: string
      occurredAt: string
    }[]
  })
}

export function row(page: Page, name: string) {
  return page.getByRole('group', { name, exact: true })
}
