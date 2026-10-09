import { QueryClient } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Providers } from '@/app/providers'
import { AuthProvider } from '@/auth/AuthProvider'
import { saveLogin, sampleUserIds } from '@/test/utils'
import { useAnalyticsFilters } from '../useAnalyticsFilters'
import type { AnalyticsSummary } from '../types'
import { AnalyticsFilterBar } from './AnalyticsFilterBar'

const summary: AnalyticsSummary = {
  students: 37,
  allStudents: 290,
  usesBus: 30,
  schoolFeePercent: 80,
  busFeePercent: 90,
  feePending: 5,
}

/** The bar and the hook alone, without the page. */
function Harness() {
  const controls = useAnalyticsFilters()
  return (
    <>
      <AnalyticsFilterBar {...controls} summary={summary} />
      <p data-testid="object">{JSON.stringify(controls.filters)}</p>
    </>
  )
}

function open(path: string) {
  saveLogin(sampleUserIds.owner)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '/analytics', element: <Harness /> }], {
    initialEntries: [path],
  })
  render(
    <Providers queryClient={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </Providers>,
  )
  return router
}

describe('Analytics filters', () => {
  it('has the six filters of the design, read from the address', async () => {
    open('/analytics?village=Jakhal&feeStatus=DELAYED&bus=4&occupation=FARMER_SMALL&className=UKG')
    for (const label of [
      'Session',
      'Class',
      'Village',
      'Bus route',
      "Father's occupation",
      'Fee payment',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByLabelText('Class')).toHaveValue('UKG')
    expect(screen.getByLabelText('Fee payment')).toHaveValue('DELAYED')
    expect(screen.getByLabelText("Father's occupation")).toHaveValue('FARMER_SMALL')
    expect(screen.getByLabelText('Village')).toHaveValue('Jakhal')
    await waitFor(() => expect(screen.getByLabelText('Bus route')).toHaveValue('4'))
    expect(screen.getByText('Showing 37 of 290 students.')).toBeInTheDocument()
  })

  it('writes a choice to the address and starts again at page 1', async () => {
    const router = open('/analytics?page=3&village=Jakhal')
    await userEvent.selectOptions(screen.getByLabelText('Fee payment'), 'Delayed')
    await waitFor(() =>
      expect(router.state.location.search).toBe('?village=Jakhal&feeStatus=DELAYED'),
    )
  })

  it('leaves the session in progress out of the address, and writes another one', async () => {
    const router = open('/analytics')
    const session = screen.getByLabelText('Session')
    await waitFor(() => expect(session).toHaveValue('1'))
    await userEvent.selectOptions(session, '2027–28')
    await waitFor(() => expect(router.state.location.search).toBe('?session=2'))
    await userEvent.selectOptions(session, '2026–27')
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('reads a word it does not know as "not set"', () => {
    open('/analytics?feeStatus=LATE&occupation=KING&bus=x&session=abc')
    expect(JSON.parse(screen.getByTestId('object').textContent ?? '')).toEqual({
      session: '',
      className: '',
      village: '',
      bus: '',
      occupation: '',
      feeStatus: '',
    })
  })

  it('clearFiltersResetsTheUrl', async () => {
    const router = open('/analytics?village=Jakhal&feeStatus=DELAYED&sort=name&dir=asc&page=2')
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    // The six filters and the page go; the sort stays.
    await waitFor(() => expect(router.state.location.search).toBe('?sort=name&dir=asc'))
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
    expect(screen.getByText('Showing all 37 students.')).toBeInTheDocument()
  })
})
