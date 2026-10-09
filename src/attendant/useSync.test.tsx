import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { Providers } from '@/app/providers'
import { db } from '@/mocks/db'
import { server } from '@/mocks/server'
import { at, makeManifest, seedManifest, setOnline } from '@/test/attendant'
import { saveLogin } from '@/test/utils'
import { addTap } from './tap'
import { getQueue } from './tapStore'
import { SYNC_EVERY_MS, useSync } from './useSync'
import type { MarksRequest } from './types'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <Providers queryClient={client}>{children}</Providers>
}

/**
 * Fake clock for the 20-second timer. setImmediate stays real, because the fake IndexedDB needs it.
 * The date is the fixed day of the mock.
 */
function useFakeClock() {
  vi.useFakeTimers({
    toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'],
    now: at('07:48'),
  })
}

/**
 * Waits for something while the clock is fake. The normal waitFor of Testing Library polls with
 * the real clock, so with a fake clock it would wait for ever; vi.waitFor moves the fake clock on.
 */
async function until(check: () => void) {
  await act(async () => {
    await vi.waitFor(check, { interval: 5, timeout: 3000 })
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function tapYash() {
  await act(async () => {
    await addTap({ studentId: 412, eventType: 'BOARDED_MORNING', outcome: 'DONE' }, new Date())
  })
}

describe('useSync', () => {
  it('starts a send when a new tap is saved, and reports an empty queue after', async () => {
    saveLogin(5)
    await seedManifest()
    const { result } = renderHook(() => useSync(), { wrapper })
    await waitFor(() => expect(result.current.online).toBe(true))

    await tapYash()
    await waitFor(() => expect(db.tripTaps).toHaveLength(1))
    await waitFor(() => expect(result.current.waiting).toBe(0))
    expect(result.current.problems).toBe(0)
  })

  it('offline: the tap waits, the hook says offline with 1 waiting, and nothing is sent', async () => {
    saveLogin(5)
    await seedManifest()
    setOnline(false)
    const { result } = renderHook(() => useSync(), { wrapper })
    await tapYash()
    await waitFor(() => expect(result.current.waiting).toBe(1))
    expect(result.current.online).toBe(false)
    expect(db.tripTaps).toHaveLength(0)
  })

  it('sends when the phone comes online, with the original time of the tap', async () => {
    useFakeClock()
    saveLogin(5)
    await seedManifest()
    setOnline(false)
    const { result } = renderHook(() => useSync(), { wrapper })
    await tapYash() // 7:48:00 on the phone
    expect(result.current.waiting).toBe(1)

    // Half an hour passes with no network.
    await act(async () => {
      vi.setSystemTime(at('08:18:30'))
    })
    expect(db.tripTaps).toHaveLength(0)

    setOnline(true)
    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })
    await until(() => expect(db.tripTaps).toHaveLength(1))
    expect(db.tripTaps[0]?.occurredAt).toBe('2026-10-07T07:48:00+05:30')
    await until(() => expect(result.current.waiting).toBe(0))
    expect(result.current.online).toBe(true)
  })

  it('sends when the app comes to the front', async () => {
    saveLogin(5)
    await seedManifest()
    setOnline(false)
    const { result } = renderHook(() => useSync(), { wrapper })
    await tapYash()
    await waitFor(() => expect(result.current.waiting).toBe(1))

    setOnline(true)
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(() => expect(result.current.waiting).toBe(0))
  })

  it('tries again every 20 seconds while taps wait, and stops when they are sent', async () => {
    useFakeClock()
    saveLogin(5)
    await seedManifest()
    let calls = 0
    server.use(
      http.post('/api/v1/trips/marks', async ({ request }) => {
        calls++
        if (calls <= 2) return HttpResponse.error()
        const { marks } = (await request.json()) as MarksRequest
        return HttpResponse.json({
          results: marks.map((m) => ({ studentId: m.studentId, eventType: m.eventType, ok: true })),
        })
      }),
    )
    const { result } = renderHook(() => useSync(), { wrapper })
    await until(() => expect(result.current.online).toBe(true))
    await tapYash()
    await until(() => expect(calls).toBe(1))
    await until(() => expect(result.current.online).toBe(false)) // the network failed
    expect(result.current.waiting).toBe(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SYNC_EVERY_MS)
    })
    await until(() => expect(calls).toBe(2))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SYNC_EVERY_MS)
    })
    await until(() => expect(calls).toBe(3))
    await until(() => expect(result.current.waiting).toBe(0))
    expect(result.current.online).toBe(true)

    // Nothing waits any more: no more calls.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SYNC_EVERY_MS * 3)
    })
    expect(calls).toBe(3)
  })

  it('counts the taps the server refused as problems', async () => {
    saveLogin(5)
    const manifest = makeManifest()
    manifest.stops[2]!.children.push({ studentId: 2003, name: 'Kavya', className: '4 B', taps: {} })
    await seedManifest(manifest)
    const { result } = renderHook(() => useSync(), { wrapper })
    await act(async () => {
      await addTap({ studentId: 2003, eventType: 'BOARDED_MORNING', outcome: 'DONE' })
    })
    await waitFor(() => expect(result.current.problems).toBe(1))
    expect(result.current.waiting).toBe(0)
  })

  it('after the login comes back, the taps that waited are sent', async () => {
    await seedManifest()
    // No login yet: the tap is saved, nothing can be sent.
    await addTap({ studentId: 412, eventType: 'BOARDED_MORNING', outcome: 'DONE' }, at('07:56'))
    const { result } = renderHook(() => useSync(), { wrapper })
    await waitFor(() => expect(result.current.waiting).toBe(1))
    expect(db.tripTaps).toHaveLength(0)

    // A second phone view logs in: a new render tree with a token sends the saved tap.
    saveLogin(5)
    const second = renderHook(() => useSync(), { wrapper })
    await waitFor(() => expect(db.tripTaps).toHaveLength(1))
    await waitFor(() => expect(second.result.current.waiting).toBe(0))
    expect(await getQueue()).toEqual([])
  })
})
