import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { setToken } from '@/api/client'
import {
  enquiriesQuery,
  useAddFollowUp,
  useChangeStatus,
  useCreateEnquiry,
  useEnquiries,
  useEnquiry,
  useEnquiryPrefill,
  useEnquirySummary,
} from './api'
import type { EnquiryFilters } from './types'

const none: EnquiryFilters = { status: '', overdue: false, q: '', village: '', source: '', page: 1 }

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

describe('enquiriesQuery', () => {
  it('leaves empty filters out', () => {
    expect(enquiriesQuery(none)).toBe('')
  })

  it('writes the filters that are set', () => {
    expect(
      enquiriesQuery({
        status: 'VISITED',
        overdue: true,
        q: 'Anita Goyal',
        village: 'Tohana town',
        source: 'WALK_IN',
        page: 2,
      }),
    ).toBe('?status=VISITED&overdue=true&q=Anita+Goyal&village=Tohana+town&source=WALK_IN&page=2')
  })
})

describe('enquiry hooks', () => {
  beforeEach(() => setToken('mock-token-4'))

  it('useEnquiries and useEnquirySummary read the list and the tiles', async () => {
    const { wrapper } = setup()
    const list = renderHook(() => useEnquiries({ ...none, overdue: true }), { wrapper })
    const tiles = renderHook(() => useEnquirySummary(), { wrapper })
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(tiles.result.current.isSuccess).toBe(true))
    expect(list.result.current.data?.total).toBe(4)
    expect(tiles.result.current.data?.total).toBe(29)
  })

  it('useEnquiry reads one enquiry with its follow-ups', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useEnquiry(23), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.followUps).toHaveLength(2)
  })

  it('useEnquiryPrefill makes no call without an id', async () => {
    const { wrapper } = setup()
    const none = renderHook(() => useEnquiryPrefill(null), { wrapper })
    expect(none.result.current.fetchStatus).toBe('idle')
    const some = renderHook(() => useEnquiryPrefill(23), { wrapper })
    await waitFor(() => expect(some.result.current.isSuccess).toBe(true))
    expect(some.result.current.data?.parentName).toBe('Anita Goyal')
  })

  it('a change refreshes the list and the tiles, and sets the one enquiry', async () => {
    const { client, wrapper } = setup()
    const tiles = renderHook(() => useEnquirySummary(), { wrapper })
    const create = renderHook(() => useCreateEnquiry(), { wrapper })
    await waitFor(() => expect(tiles.result.current.data?.total).toBe(29))
    await act(() =>
      create.result.current.mutateAsync({
        parentName: 'Ramesh Malik',
        phone: '9812355501',
        relation: 'FATHER',
        village: 'Jakhal',
        className: 'Class 2',
        source: 'WALK_IN',
        nextStepDate: '2026-10-09',
      }),
    )
    await waitFor(() => expect(tiles.result.current.data?.total).toBe(30))
    const id = create.result.current.data!.id
    expect(client.getQueryData(['enquiries', 'detail', id])).toBeDefined()
  })

  it('useChangeStatus and useAddFollowUp return the enquiry as the server now has it', async () => {
    const { wrapper } = setup()
    const status = renderHook(() => useChangeStatus(28), { wrapper })
    const note = renderHook(() => useAddFollowUp(28), { wrapper })
    const moved = await act(() => status.result.current.mutateAsync({ status: 'CONTACTED' }))
    expect(moved.status).toBe('CONTACTED')
    const noted = await act(() =>
      note.result.current.mutateAsync({ note: 'Called', nextDate: '2026-10-12' }),
    )
    expect(noted.followUps[0]?.note).toBe('Called')
    expect(noted.nextStepDate).toBe('2026-10-12')
  })
})
