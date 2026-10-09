import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { i18n } from '@/i18n'
import { resetMockDb } from '@/mocks/db'
import { server } from '@/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(async () => {
  cleanup()
  localStorage.clear()
  await i18n.changeLanguage('en')
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
