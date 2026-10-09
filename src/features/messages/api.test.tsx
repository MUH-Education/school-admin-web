import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { setToken } from '@/api/client'
import { messagesQuery, useMessages, useMessageSummary } from './api'
import type { MessageFilters } from './types'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const none: MessageFilters = { date: '', status: '', q: '', page: 1 }

describe('messagesQuery', () => {
  it('leaves empty filters out', () => {
    expect(messagesQuery(none)).toBe('')
  })

  it('writes the filters that are set', () => {
    expect(messagesQuery({ date: '2026-10-07', status: 'FAILED', q: 'Mohit Kumar', page: 2 })).toBe(
      '?date=2026-10-07&status=FAILED&q=Mohit+Kumar&page=2',
    )
  })
})

describe('message hooks', () => {
  beforeEach(() => setToken('mock-token-1'))

  it('useMessages asks for one page of the day', async () => {
    const { result } = renderHook(() => useMessages({ ...none, status: 'FAILED' }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.total).toBe(3)
  })

  it('useMessageSummary asks for the counts of a day', async () => {
    const { result } = renderHook(() => useMessageSummary('2026-10-06'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.testOnly).toBeGreaterThan(0)
  })
})
