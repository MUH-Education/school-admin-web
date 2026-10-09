import { expect, test, type BrowserContext, type Page } from '@playwright/test'

// These tests run against the real build (npm run build + npm run preview), with its service worker.
// There is no backend, so the few API calls the phone makes are answered here in the test.

interface Mark {
  studentId: number
  eventType: string
  outcome: string
  occurredAt: string
}

const user = {
  id: 5,
  name: 'Balwan',
  phone: '+919812340005',
  role: 'ATTENDANT',
  permissions: ['TRIPS_RECORD'],
  route: { id: 4, name: 'Route 4', vehicle: 'Van 4' },
}

function manifestFor(date: string) {
  const child = (studentId: number, name: string, className: string) => ({
    studentId,
    name,
    className,
    taps: {},
  })
  return {
    routeId: 4,
    routeName: 'Route 4',
    vehicle: 'Van 4',
    date,
    schoolStarts: '08:10',
    schoolEnds: '14:40',
    stops: [
      {
        id: 1,
        name: 'साधनवास',
        children: [child(400, 'मोहित', '5 A'), child(401, 'अंजलि', '2 A')],
      },
      { id: 2, name: 'जाखल', children: [child(405, 'आर्यन', '3 B')] },
    ],
  }
}

/** A tiny server for the phone: login check, route, list of children, and the taps. */
async function fakeBackend(context: BrowserContext) {
  const received: Mark[] = []
  await context.addInitScript(() => {
    if (!localStorage.getItem('token')) localStorage.setItem('token', 'test-token')
  })
  await context.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const json = (body: unknown) => route.fulfill({ json: body })
    switch (url.pathname) {
      case '/api/v1/auth/me':
        return json(user)
      case '/api/v1/trips/my-route':
        return json({ route: user.route })
      case '/api/v1/trips/manifest':
        return json(manifestFor(url.searchParams.get('date') ?? ''))
      case '/api/v1/trips/marks': {
        const { marks } = route.request().postDataJSON() as { marks: Mark[] }
        received.push(...marks)
        return json({
          results: marks.map((m) => ({ studentId: m.studentId, eventType: m.eventType, ok: true })),
        })
      }
      default:
        return route.fulfill({ status: 404, json: { error: 'NOT_FOUND' } })
    }
  })
  return received
}

async function waitForServiceWorker(page: Page) {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    if (registration.active?.state !== 'activated') {
      await new Promise<void>((resolve) =>
        registration.active?.addEventListener('statechange', () => resolve()),
      )
    }
  })
}

test('the phone app installs: manifest, icons and a service worker that keeps the app files', async ({
  page,
  context,
}) => {
  await fakeBackend(context)
  await page.goto('/trip')
  await expect(page.getByText('आज के चार काम')).toBeVisible()
  await waitForServiceWorker(page)

  const manifest = await (await page.request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({
    name: 'स्कूल बस',
    start_url: '/trip',
    display: 'standalone',
    theme_color: '#16222e',
    scope: '/',
  })
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes)
  expect(sizes).toContain('192x192')
  expect(sizes).toContain('512x512')
  for (const icon of manifest.icons as { src: string }[]) {
    const response = await page.request.get(icon.src)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')
  }
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  )

  // The service worker keeps the app files, and no API answer.
  const cached = await page.evaluate(async () => {
    const urls: string[] = []
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys())
        urls.push(new URL(request.url).pathname)
    }
    return urls
  })
  expect(cached.includes('/index.html')).toBe(true)
  expect(cached.some((url) => /\/assets\/TripLayout-.*\.js/.test(url))).toBe(true)
  expect(cached.some((url) => /\/assets\/PickupPage-.*\.js/.test(url))).toBe(true)
  expect(cached.some((url) => url.includes('/api/'))).toBe(false)
})

test('opening /trip on a fresh browser downloads no office chunk', async ({ page, context }) => {
  await fakeBackend(context)
  const files: string[] = []
  context.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.endsWith('.js')) files.push(url.pathname)
  })
  await page.goto('/trip')
  await expect(page.getByText('आज के चार काम')).toBeVisible()
  await waitForServiceWorker(page)
  await page.waitForTimeout(500)

  expect(files.length).toBeGreaterThan(3)
  expect(files.some((file) => file.includes('/assets/TodayPage-'))).toBe(true)
  const office = files.filter(
    (file) =>
      file.includes('/assets/admin/') ||
      /(BusStatus|BusDetail|Vehicles?|VehicleDetail|Students?|Admission|Users|Routes)Page-/.test(
        file,
      ),
  )
  expect(office).toEqual([])
})

test('the app opens with no signal, keeps the taps, and sends them with their own times later', async ({
  page,
  context,
}) => {
  const received = await fakeBackend(context)
  await page.goto('/trip')
  await expect(page.getByText('आज के चार काम')).toBeVisible()
  await waitForServiceWorker(page)

  // The phone loses the signal and the app is opened again: the page, the list, the user are all local.
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'नमस्ते, Balwan' })).toBeVisible()
  await expect(page.getByText('रूट 4 · वैन 4 · 3 बच्चे')).toBeVisible()

  await page.getByRole('link', { name: /सुबह चढ़ाना/ }).click()
  await expect(page.getByRole('heading', { name: 'स्टॉप 1 · साधनवास' })).toBeVisible()
  const row = (name: string) => page.getByRole('group', { name, exact: true })
  await row('मोहित').getByRole('button', { name: 'चढ़ गए' }).click()
  await row('अंजलि').getByRole('button', { name: 'नहीं आए' }).click()
  await expect(page.getByText(/2 टैप फ़ोन में सेव हैं/)).toBeVisible()

  // Close and open again, still with no signal.
  await page.reload()
  await expect(page.getByText(/2 टैप फ़ोन में सेव हैं/)).toBeVisible()
  await expect(row('मोहित').getByRole('button', { name: '✓ चढ़ गए' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(received).toEqual([])

  // Some time passes with no signal, so a send-time stamp would differ from the press-time stamp.
  await page.waitForTimeout(2000)
  const signalBack = Date.now()
  await context.setOffline(false)
  await expect(page.getByText('सब जानकारी ऑफ़िस पहुँच गई')).toBeVisible({ timeout: 25_000 })
  expect(received.map((m) => [m.studentId, m.outcome]).sort()).toEqual([
    [400, 'DONE'],
    [401, 'ABSENT'],
  ])
  for (const mark of received) {
    expect(Date.parse(mark.occurredAt)).toBeLessThan(signalBack - 1000)
    expect(mark.occurredAt).toMatch(/\+05:30$/)
  }
})
