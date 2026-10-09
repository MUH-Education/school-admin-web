import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { resetMockDb } from '@/mocks/db'
import { server } from '@/mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  localStorage.clear()
  resetMockDb()
  server.resetHandlers()
})
afterAll(() => server.close())

// jsdom has no object URLs. The photo tests only need a text to put in `src`.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:test-photo'
  URL.revokeObjectURL = () => {}
}
