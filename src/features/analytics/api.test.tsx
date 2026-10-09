import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { setToken } from '@/api/client'
import { server } from '@/mocks/server'
import {
  analyticsQuery,
  tableQuery,
  useAnalyticsStudents,
  useAnalyticsSummary,
  useFeeCollectionByMonth,
  usePaymentByOccupation,
  useStudentsByClass,
  useStudentsByVillage,
} from './api'
import { defaultTable, emptyFilters, type AnalyticsFilters, type AnalyticsSummary } from './types'

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const jakhal: AnalyticsFilters = { ...emptyFilters, village: 'Jakhal', feeStatus: 'DELAYED' }

describe('analyticsQuery', () => {
  it('uses the names of the API and leaves the empty filters out', () => {
    expect(analyticsQuery(emptyFilters)).toBe('')
    expect(analyticsQuery(jakhal)).toBe('?village=Jakhal&feeStatus=DELAYED')
    expect(
      analyticsQuery({
        session: '2',
        className: 'Class 5',
        village: 'Tohana town',
        bus: '4',
        occupation: 'FARMER_SMALL',
        feeStatus: 'ON_TIME',
      }),
    ).toBe(
      '?sessionId=2&className=Class+5&village=Tohana+town&routeId=4&occupation=FARMER_SMALL&feeStatus=ON_TIME',
    )
    expect(analyticsQuery({ ...emptyFilters, bus: 'YES' })).toBe('?bus=YES')
    expect(analyticsQuery({ ...emptyFilters, bus: 'NO' })).toBe('?bus=NO')
  })

  it('adds the sort and the page for the table only', () => {
    expect(tableQuery(defaultTable)).toEqual({ sort: 'pending', dir: 'desc' })
    expect(tableQuery({ sort: 'name', dir: 'asc', page: 3 })).toEqual({
      sort: 'name',
      dir: 'asc',
      page: '3',
    })
    expect(analyticsQuery(jakhal, tableQuery({ sort: 'name', dir: 'asc', page: 2 }))).toBe(
      '?village=Jakhal&feeStatus=DELAYED&sort=name&dir=asc&page=2',
    )
  })
})

describe('Analytics calls', () => {
  beforeEach(() => setToken('mock-token-1'))

  it('allQueriesUseTheSameFilterObject', async () => {
    const urls: URL[] = []
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (url.pathname.startsWith('/api/v1/analytics/')) urls.push(url)
    })
    const filters: AnalyticsFilters = { ...jakhal, className: 'UKG', bus: '4' }
    const { result } = renderHook(
      () => ({
        a: useAnalyticsSummary(filters),
        b: useFeeCollectionByMonth(filters),
        c: usePaymentByOccupation(filters),
        d: useStudentsByClass(filters),
        e: useStudentsByVillage(filters),
        f: useAnalyticsStudents(filters, defaultTable),
      }),
      { wrapper: wrapper() },
    )
    await waitFor(() => {
      for (const query of Object.values(result.current)) expect(query.isSuccess).toBe(true)
    })
    server.events.removeAllListeners()

    expect(urls.map((u) => u.pathname.replace('/api/v1/analytics/', '')).sort()).toEqual([
      'fee-collection-by-month',
      'payment-by-occupation',
      'students',
      'students-by-class',
      'students-by-village',
      'summary',
    ])
    // The six filters are the same in every call. Only the table call adds its sort.
    for (const url of urls) {
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        village: 'Jakhal',
        feeStatus: 'DELAYED',
        className: 'UKG',
        routeId: '4',
      })
    }
  })

  it('filterChangeKeepsOldDataUntilNewArrives', async () => {
    const answers: Record<string, AnalyticsSummary> = {
      '': {
        students: 62,
        allStudents: 62,
        usesBus: 50,
        schoolFeePercent: 90,
        busFeePercent: 95,
        feePending: 9,
      },
      Jakhal: {
        students: 7,
        allStudents: 62,
        usesBus: 7,
        schoolFeePercent: 80,
        busFeePercent: 85,
        feePending: 2,
      },
    }
    server.use(
      http.get('/api/v1/analytics/summary', async ({ request }) => {
        const village = new URL(request.url).searchParams.get('village') ?? ''
        if (village) await delay(150)
        return HttpResponse.json(answers[village])
      }),
    )
    const { result, rerender } = renderHook(({ filters }) => useAnalyticsSummary(filters), {
      wrapper: wrapper(),
      initialProps: { filters: emptyFilters },
    })
    await waitFor(() => expect(result.current.data?.students).toBe(62))
    expect(result.current.isPlaceholderData).toBe(false)

    act(() => rerender({ filters: { ...emptyFilters, village: 'Jakhal' } }))
    // The old numbers stay, and the hook says they are old.
    expect(result.current.data?.students).toBe(62)
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.isPending).toBe(false)

    await waitFor(() => expect(result.current.data?.students).toBe(7))
    expect(result.current.isPlaceholderData).toBe(false)
  })
})
