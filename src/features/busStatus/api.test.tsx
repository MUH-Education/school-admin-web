import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { act, type ReactNode } from 'react'
import { http, HttpResponse } from 'msw'
import { setToken } from '@/api/client'
import { server } from '@/mocks/server'
import { REFRESH_MS, useBusStatus } from './api'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

/** Counts the asks that reach the server. */
function countAsks(): { count: () => number } {
  let asks = 0
  server.use(
    http.get('/api/v1/bus-status', () => {
      asks += 1
      return HttpResponse.json({
        date: '2026-10-07',
        asOf: '2026-10-07T07:48:00+05:30',
        phase: 'MORNING',
        routes: [],
      })
    }),
  )
  return { count: () => asks }
}

function setTabVisible(visible: boolean) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (visible ? 'visible' : 'hidden'),
  })
  // A real browser sends this event so that it reaches `window`, where TanStack Query listens.
  document.dispatchEvent(new Event('visibilitychange', { bubbles: true }))
}

describe('bus status live refresh', () => {
  beforeEach(() => {
    setToken('mock-token-1')
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    setTabVisible(true)
  })

  it('asks again every 30 seconds while the tab is visible', async () => {
    const asks = countAsks()
    renderHook(() => useBusStatus(null), { wrapper })
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(asks.count()).toBe(1)
    await act(() => vi.advanceTimersByTimeAsync(REFRESH_MS - 1))
    expect(asks.count()).toBe(1)
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(asks.count()).toBe(2)
    await act(() => vi.advanceTimersByTimeAsync(REFRESH_MS))
    expect(asks.count()).toBe(3)
  })

  it('does not ask while the tab is hidden, and asks at once when it is shown again', async () => {
    const asks = countAsks()
    renderHook(() => useBusStatus(null), { wrapper })
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(asks.count()).toBe(1)

    await act(async () => setTabVisible(false))
    await act(() => vi.advanceTimersByTimeAsync(REFRESH_MS * 4))
    expect(asks.count()).toBe(1)

    await act(async () => setTabVisible(true))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(asks.count()).toBe(2)
  })
})
