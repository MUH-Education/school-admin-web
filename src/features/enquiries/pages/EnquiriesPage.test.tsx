import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function openEnquiries(path = '/enquiries', userId: number = sampleUserIds.admissions) {
  saveLogin(userId)
  const view = renderApp(path)
  await screen.findByRole('table', { name: 'Enquiries' })
  return view
}

const table = () => screen.getByRole('table', { name: 'Enquiries' })
const tiles = () => screen.getByRole('region', { name: 'Filter by stage' })

function rowOf(name: string): HTMLElement {
  return within(table()).getByText(name).closest('tr') as HTMLElement
}

function bodyRows(): HTMLElement[] {
  return within(table()).getAllByRole('row').slice(1)
}

describe('Enquiry list', () => {
  it('has the header, the seven tiles with their numbers and the admitted line', async () => {
    await openEnquiries()
    expect(screen.getByRole('heading', { name: 'Enquiries', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Admissions · Session 2027–28')).toBeInTheDocument()
    expect(await screen.findByText('4 of 29 admitted so far · 14%')).toBeInTheDocument()
    const buttons = within(tiles()).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual([
      'All29',
      'New6',
      'Contacted9',
      'Visited5',
      'Applied3',
      'Admitted4',
      'Lost2',
    ])
    expect(within(tiles()).getByRole('button', { name: /^All/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('link', { name: 'Add enquiry' })).toHaveAttribute(
      'href',
      '/enquiries/new',
    )
  })

  it('shows the nine columns of the design, newest first, ten to a page', async () => {
    await openEnquiries()
    expect(
      within(table())
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual([
      'Date',
      'Parent',
      'Phone',
      'Village',
      'Class',
      'Source',
      'Status',
      'Next step',
      'Open',
    ])
    expect(bodyRows()).toHaveLength(10)
    const row = rowOf('Rajesh Kumar')
    expect(within(row).getByText('6 Oct')).toHaveClass('font-mono')
    expect(within(row).getByText('Jakhal')).toBeInTheDocument()
    // Class 1 is "1"; the nursery classes keep their names.
    expect(within(row).getByText('1')).toHaveClass('font-mono')
    expect(within(rowOf('Sunita Devi')).getByText('Nursery')).toBeInTheDocument()
    expect(within(row).getByText('Walk-in')).toBeInTheDocument()
    expect(within(row).getByText('Call by 7 Oct')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: /Open/ })).toHaveAttribute('href', '/enquiries/29')
    expect(screen.getByText(/Showing/).textContent).toMatch(/^Showing 1 to 10 of 29 enquiries\.$/)
  })

  it('phoneIsShownAsTheServerSendsIt', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/enquiries', () =>
        HttpResponse.json({
          items: [
            {
              id: 1,
              createdOn: '2026-10-06',
              parentName: 'Asha',
              phone: '70XXX XX001',
              village: 'Jakhal',
              className: 'Class 1',
              source: 'WALK_IN',
              status: 'NEW',
              nextStepDate: '2026-10-08',
              overdue: false,
              lostReason: null,
            },
          ],
          page: 1,
          pageSize: 10,
          total: 1,
          villages: ['Jakhal'],
        }),
      ),
    )
    await openEnquiries()
    expect(within(rowOf('Asha')).getByText('70XXX XX001')).toBeInTheDocument()
  })

  it('overdueNextStepIsRed', async () => {
    await openEnquiries()
    const late = within(rowOf('Gurpreet Singh')).getByText('Overdue since 5 Oct')
    expect(late).toHaveClass('text-bad', 'font-semibold')
    const fine = within(rowOf('Rajesh Kumar')).getByText('Call by 7 Oct')
    expect(fine).not.toHaveClass('text-bad')
    expect(fine).not.toHaveClass('font-semibold')
    expect(within(rowOf('Kavita Rani')).getByText('Overdue since 4 Oct')).toHaveClass('text-bad')
    // The words by stage, and a dash for Admitted.
    expect(within(rowOf('Manoj Sharma')).getByText('School visit on 9 Oct')).toBeInTheDocument()
    expect(within(rowOf('Anita Goyal')).getByText('Documents due 10 Oct')).toBeInTheDocument()
    expect(within(rowOf('Sandeep Nain')).getByText('—')).toBeInTheDocument()
    expect(within(rowOf('Meena Kumari')).getByText('Reason: fee too high')).toBeInTheDocument()
  })

  it('a status is words plus a small square', async () => {
    await openEnquiries()
    const status = within(rowOf('Sandeep Nain')).getByText('Admitted')
    expect(status.querySelector('span[aria-hidden="true"]')).toHaveClass('bg-good')
    const applied = within(rowOf('Anita Goyal')).getByText('Applied')
    expect(applied.querySelector('span[aria-hidden="true"]')).toHaveClass('bg-ink')
  })

  it('stageTileFiltersTheList', async () => {
    const { router } = await openEnquiries()
    await userEvent.click(within(tiles()).getByRole('button', { name: /^Visited/ }))
    await waitFor(() => expect(router.state.location.search).toBe('?status=VISITED'))
    await waitFor(() => expect(bodyRows()).toHaveLength(5))
    for (const row of bodyRows()) expect(within(row).getByText('Visited')).toBeInTheDocument()
    expect(within(tiles()).getByRole('button', { name: /^Visited/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(tiles()).getByRole('button', { name: /^All/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    // The numbers on the tiles do not change with the filter.
    expect(within(tiles()).getByRole('button', { name: /^All/ })).toHaveTextContent('29')
    await userEvent.click(within(tiles()).getByRole('button', { name: /^All/ }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('the overdue box shows the count and filters the list', async () => {
    const { router } = await openEnquiries()
    const box = await screen.findByRole('region', { name: 'Overdue follow-ups' })
    expect(within(box).getByText('4 follow-ups are overdue')).toBeInTheDocument()
    await userEvent.click(within(box).getByRole('button', { name: 'Show only overdue' }))
    await waitFor(() => expect(router.state.location.search).toBe('?overdue=true'))
    await waitFor(() => expect(bodyRows()).toHaveLength(4))
    for (const row of bodyRows())
      expect(within(row).getByText(/^Overdue since/)).toBeInTheDocument()
    await userEvent.click(within(box).getByRole('button', { name: 'Show all enquiries' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('overdueBoxIsHiddenWhenNothingIsOverdue', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/enquiries/summary', () =>
        HttpResponse.json({
          total: 29,
          byStatus: { NEW: 6, CONTACTED: 9, VISITED: 5, APPLIED: 3, ADMITTED: 4, LOST: 2 },
          overdue: 0,
          admittedPercent: 14,
        }),
      ),
    )
    await openEnquiries()
    await screen.findByText('4 of 29 admitted so far · 14%')
    expect(screen.queryByRole('region', { name: 'Overdue follow-ups' })).not.toBeInTheDocument()
  })

  it('keeps the search, village, source and page in the address', async () => {
    const { router } = await openEnquiries()
    await userEvent.selectOptions(screen.getByLabelText('Village'), 'Jakhal')
    await waitFor(() => expect(router.state.location.search).toBe('?village=Jakhal'))
    await userEvent.selectOptions(screen.getByLabelText('Source'), 'Walk-in')
    await waitFor(() => expect(router.state.location.search).toBe('?village=Jakhal&source=WALK_IN'))
    await waitFor(() => expect(bodyRows()).toHaveLength(3))
    await userEvent.type(screen.getByLabelText('Search name or phone'), 'rajesh')
    await waitFor(() => expect(router.state.location.search).toContain('q=rajesh'), {
      timeout: 1500,
    })
    await waitFor(() => expect(bodyRows()).toHaveLength(1))
  })

  it('opens from an address with filters and pages with Next and Back', async () => {
    const { router } = await openEnquiries('/enquiries?status=CONTACTED&page=1')
    await waitFor(() => expect(bodyRows()).toHaveLength(9))
    router.navigate('/enquiries')
    await waitFor(() => expect(bodyRows()).toHaveLength(10))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(router.state.location.search).toBe('?page=2'))
    await waitFor(() =>
      expect(screen.getByText(/Showing/).textContent).toMatch(/^Showing 11 to 20/),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('shows an empty state with a way back when nothing matches', async () => {
    saveLogin(sampleUserIds.admissions)
    const { router } = renderApp('/enquiries?q=zzzzzz')
    expect(await screen.findByText('No enquiry matches')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear the filters' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
    await screen.findByRole('table', { name: 'Enquiries' })
  })

  it('shows an error with Retry, then the list', async () => {
    let fail = true
    server.use(
      http.get('http://localhost:3000/api/v1/enquiries', () =>
        fail
          ? HttpResponse.json({ error: 'SERVER', message: 'boom' }, { status: 500 })
          : HttpResponse.json({ items: [], page: 1, pageSize: 10, total: 0, villages: [] }),
      ),
    )
    saveLogin(sampleUserIds.admissions)
    renderApp('/enquiries')
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No enquiries yet')).toBeInTheDocument()
  })

  it('shows a loading state first', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/enquiries', async () => {
        await delay(150)
        return HttpResponse.json({ items: [], page: 1, pageSize: 10, total: 0, villages: [] })
      }),
    )
    saveLogin(sampleUserIds.admissions)
    renderApp('/enquiries')
    await screen.findByLabelText('Search name or phone')
    expect(within(screen.getByLabelText('Enquiry table')).getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByText('No enquiries yet')).toBeInTheDocument()
  })

  it('transportInchargeCannotOpenEnquiries', async () => {
    saveLogin(sampleUserIds.transport)
    renderApp('/enquiries')
    expect(
      await screen.findByRole('heading', { name: 'You cannot open this page' }),
    ).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main menu' })
    expect(within(nav).queryByRole('link', { name: 'Enquiries' })).not.toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Enquiries' })).not.toBeInTheDocument()
  })
})
