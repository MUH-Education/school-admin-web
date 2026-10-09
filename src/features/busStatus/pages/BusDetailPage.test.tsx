import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { detailAnswer } from '@/mocks/busStatusLogic'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'
import { REFRESH_MS } from '../api'

async function openBus(path = '/bus-status/routes/4', userId: number = sampleUserIds.owner) {
  saveLogin(userId)
  const view = renderApp(path)
  await screen.findByRole('region', { name: 'Children on this route' })
  return view
}

function tile(label: string): HTMLElement {
  const tiles = screen.getByRole('region', { name: 'Summary' })
  return within(tiles).getByText(label).nextElementSibling as HTMLElement
}

describe('One bus: Route 4 at 7:48', () => {
  it('shows the header of BusDetail.dc.html', async () => {
    await openBus()
    expect(screen.getByRole('heading', { name: 'Route 4', level: 1 })).toBeInTheDocument()
    expect(
      screen.getByText('Small van · Attendant: Balwan · Morning pickup, Wednesday 7 October 2026'),
    ).toBeInTheDocument()
    expect(screen.getByText('On the way to Kanheri')).toHaveClass('text-canal')
    expect(screen.getByText('Last tap: Jakhal, 7:42 am')).toBeInTheDocument()
    expect(screen.getByText('Live · updated 7:48 am')).toBeInTheDocument()
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Bus status' })).toHaveAttribute(
      'href',
      '/bus-status',
    )
  })

  it('shows the five tiles', async () => {
    await openBus()
    expect(tile('Boarded')).toHaveTextContent('11 of 19')
    expect(tile('Absent')).toHaveTextContent('1')
    expect(tile('Still to board')).toHaveTextContent('7')
    expect(tile('Seats in this van')).toHaveTextContent('14 over by 5')
    expect(screen.getByText('over by 5')).toHaveClass('text-bad')
    expect(tile('Fitness certificate')).toHaveTextContent('Valid till 31 Mar 2027')
  })

  it('shows the stops as tiles in order, with counts from the children', async () => {
    await openBus()
    const stops = within(screen.getByRole('region', { name: 'Stops' })).getAllByRole('listitem')
    expect(stops).toHaveLength(5)
    expect(stops[0]).toHaveTextContent('Stop 1 · done')
    expect(stops[0]).toHaveTextContent('Sadhanwas')
    expect(stops[0]).toHaveTextContent('Tapped 7:26 · due 7:25')
    expect(stops[0]).toHaveTextContent('5 boarded, 0 absent')
    expect(stops[1]).toHaveTextContent('Tapped 7:42 · due 7:40')
    expect(stops[1]).toHaveTextContent('6 boarded, 1 absent')
    expect(stops[2]).toHaveTextContent('Stop 3 · next')
    expect(stops[2]).toHaveTextContent('Due 7:55')
    expect(stops[2]).toHaveTextContent('4 children waiting')
    expect(stops[3]).toHaveTextContent('Stop 4 · later')
    expect(stops[3]).toHaveTextContent('3 children waiting')
    expect(stops[4]).toHaveTextContent('End')
    expect(stops[4]).toHaveTextContent('School')
    expect(stops[4]).toHaveTextContent('Due 8:10')
    expect(stops[4]).toHaveTextContent('All children get off')
  })

  it('oneBusShowsFourEventColumns', async () => {
    await openBus()
    const section = screen.getByRole('region', { name: 'Children on this route' })
    expect(
      within(section).getByRole('heading', { name: '19 children on this route', level: 2 }),
    ).toBeInTheDocument()
    const table = within(section).getByRole('table')
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent)
    expect(headers).toEqual([
      'Child',
      'Class',
      'Stop',
      'Boarded morning',
      'Reached school',
      'Boarded evening',
      'Reached home',
      'SMS to parent',
    ])
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(19)

    const cells = (name: string) => {
      const row = rows.find((r) => within(r).queryByText(name)) as HTMLElement
      return within(row).getAllByRole('cell')
    }
    // A time means done.
    const mohit = cells('Mohit')
    expect(mohit[1]).toHaveTextContent('5 A')
    expect(mohit[2]).toHaveTextContent('Sadhanwas')
    expect(mohit[3]).toHaveTextContent('7:26')
    // Events that have not come yet are a dash.
    expect(mohit[4]).toHaveTextContent('—')
    expect(mohit[5]).toHaveTextContent('—')
    expect(mohit[6]).toHaveTextContent('—')
    // The SMS column is empty until web phase 6.
    expect(mohit[7]).toBeEmptyDOMElement()
    // "Absent" in red, "Waiting" in grey.
    expect(within(cells('Pooja')[3] as HTMLElement).getByText('Absent')).toHaveClass('text-bad')
    expect(within(cells('Yash')[3] as HTMLElement).getByText('Waiting')).toHaveClass(
      'text-ink-soft',
    )
  })

  it('shows the evening part of the day when the address says EVENING', async () => {
    await openBus('/bus-status/routes/4?phase=EVENING')
    expect(
      screen.getByText('Small van · Attendant: Balwan · Evening drop, Wednesday 7 October 2026'),
    ).toBeInTheDocument()
    expect(screen.getByText('Live · updated 3:32 pm')).toBeInTheDocument()
    // The way back keeps the phase.
    expect(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', {
        name: 'Bus status',
      }),
    ).toHaveAttribute('href', '/bus-status?phase=EVENING')
    const table = screen.getByRole('table')
    // Evening boarded and reached home both have times for the children already dropped.
    expect(within(table).getAllByText('3:10 pm').length).toBeGreaterThan(0)
  })

  it('opens from "View children" on Bus status, and goes back with the breadcrumb', async () => {
    saveLogin(sampleUserIds.transport)
    const { router } = renderApp('/bus-status')
    const row = await screen.findByRole('article', { name: 'Route 4' })
    await userEvent.click(within(row).getByRole('link', { name: /View children/ }))
    await screen.findByRole('region', { name: 'Children on this route' })
    expect(router.state.location.pathname).toBe('/bus-status/routes/4')
    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', {
        name: 'Bus status',
      }),
    )
    expect(await screen.findByRole('region', { name: 'All buses' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/bus-status')
  })
})

describe('One bus: other states', () => {
  it('works for a route that is not Route 4', async () => {
    await openBus('/bus-status/routes/9')
    expect(screen.getByRole('heading', { name: 'Route 9', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Not started · starts 7:50 am')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '45 children on this route' })).toBeInTheDocument()
    expect(tile('Seats in this van')).toHaveTextContent('26 over by 19')
  })

  it('shows school reached for a bus that is there', async () => {
    await openBus('/bus-status/routes/2')
    expect(screen.getByText('Reached school 7:46 am')).toHaveClass('text-good')
    const stops = within(screen.getByRole('region', { name: 'Stops' })).getAllByRole('listitem')
    expect(stops.at(-1)).toHaveTextContent('Reached 7:46')
  })

  it('says so when the route does not exist', async () => {
    saveLogin(sampleUserIds.owner)
    renderApp('/bus-status/routes/99')
    expect(await screen.findByText('This route does not exist')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to bus status' })).toHaveAttribute(
      'href',
      '/bus-status',
    )
  })

  it('shows an error with a Retry button', async () => {
    server.use(
      http.get('/api/v1/bus-status/routes/:id', () =>
        HttpResponse.json({ error: 'X' }, { status: 500 }),
      ),
    )
    saveLogin(sampleUserIds.owner)
    renderApp('/bus-status/routes/4')
    const alert = await screen.findByRole('alert')
    server.resetHandlers()
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(
      await screen.findByRole('region', { name: 'Children on this route' }),
    ).toBeInTheDocument()
  })

  it('shows an empty box when the route has no children', async () => {
    const answer = detailAnswer(4, 'MORNING')
    server.use(
      http.get('/api/v1/bus-status/routes/:id', () =>
        HttpResponse.json({ ...answer, children: [] }),
      ),
    )
    saveLogin(sampleUserIds.owner)
    renderApp('/bus-status/routes/4')
    expect(await screen.findByText('No children on this route')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('keeps the children and shows the amber note when an update fails', async () => {
    saveLogin(sampleUserIds.owner)
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    try {
      renderApp('/bus-status/routes/4')
      await screen.findByRole('region', { name: 'Children on this route' })
      server.use(
        http.get('/api/v1/bus-status/routes/:id', () =>
          HttpResponse.json({ error: 'X' }, { status: 500 }),
        ),
      )
      await act(() => vi.advanceTimersByTimeAsync(REFRESH_MS))
      expect(await screen.findByText('Last updated 7:48 am. Trying again.')).toBeInTheDocument()
      expect(screen.getAllByRole('row')).toHaveLength(20)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('cannot be opened by the admissions desk', async () => {
    saveLogin(sampleUserIds.admissions)
    renderApp('/bus-status/routes/4')
    expect(
      await screen.findByRole('heading', { name: 'You cannot open this page' }),
    ).toBeInTheDocument()
  })
})
