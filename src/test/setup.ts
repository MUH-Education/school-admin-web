import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup, configure } from '@testing-library/react'
import { resetLocalState } from '@/attendant/localState'
import { resetPhoneDb } from '@/attendant/phoneDb'
import { i18n } from '@/i18n'
import { resetMockDb } from '@/mocks/db'
import { server } from '@/mocks/server'

// There is no service worker in tests. The phone pages ask for one, so give them a quiet stand-in.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: async () => {},
  }),
}))

// A page test waits for the lazy page and the mock server. When all 67 test files run together the
// machine is busy, and the default 1 second is sometimes too short.
configure({ asyncUtilTimeout: 4000 })

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(async () => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  localStorage.clear()
  await i18n.changeLanguage('en')
  await resetPhoneDb()
  resetLocalState()
  resetMockDb()
  server.resetHandlers()
})
afterAll(() => server.close())

// jsdom has no object URLs. The photo tests only need a text to put in `src`.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:test-photo'
  URL.revokeObjectURL = () => {}
}

// jsdom cannot scroll. A page that scrolls to its first mistake only needs the call to exist.
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => {}
}
