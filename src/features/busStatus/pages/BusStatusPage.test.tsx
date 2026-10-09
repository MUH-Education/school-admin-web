import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { busStatusAnswer } from '@/mocks/busStatusLogic'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'
import { makeRoute } from '@/test/busStatus'
import { REFRESH_MS } from '../api'
import { summarise } from '../summary'

async function openPage(userId: number = sampleUserIds.owner, path = '/bus-status') {
  saveLogin(userId)
  const view = renderApp(path)
  await screen.findByRole('region', { name: 'All buses' })
  return view
}

function tile(label: string): HTMLElement {
  const tiles = screen.getByRole('region', { name: 'Summary' })
  return within(tiles).getByText(label).nextElementSibling as HTMLElement
}

describe('Bus status: the 7:48 picture', () => {
  it('shows the header with the live time', async () => {
    await openPage()
    expect(screen.getByRole('heading', { name: 'Bus status', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Transport · Wednesday 7 October 2026')).toBeInTheDocument()
    expect(screen.getByText('Live · updated 7:48 am')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Morning pickup' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows the five numbers of Main.dc.html', async () => {
    await openPage()
    expect(tile('On the way')).toHaveTextContent('5 of 9 buses')
    expect(tile('Reached school')).toHaveTextContent('2 buses')
    expect(tile('Children boarded')).toHaveTextContent('118 of 255')
    expect(tile('Marked absent')).toHaveTextContent('9')
    expect(tile('Needs attention')).toHaveTextContent('2 buses')
    expect(tile('Needs attention')).toHaveClass('text-bad')
  })

  it('shows the nine rows with their states', async () => {
    await openPage()
    const list = screen.getByRole('region', { name: 'All buses' })
    expect(within(list).getByRole('heading', { name: 'All 9 buses', level: 2 })).toBeInTheDocument()
    expect(within(list).getAllByRole('article')).toHaveLength(9)
    const row = (name: string) => within(list).getByRole('article', { name })
    expect(row('Route 1')).toHaveTextContent('On the way')
    expect(row('Route 1')).toHaveTextContent('14 of 24 boarded')
    expect(row('Route 2')).toHaveTextContent('Reached school 7:46')
    expect(row('Route 3')).toHaveTextContent('No taps yet')
    expect(row('Route 3')).toHaveTextContent('33 minutes behind')
    expect(row('Route 4')).toHaveTextContent('11 of 19 boarded')
    expect(row('Route 5')).toHaveTextContent('Late by 16 minutes')
    expect(row('Route 5')).toHaveTextContent('7:40, late')
    expect(row('Route 7')).toHaveTextContent('Reached school 7:41')
    expect(row('Route 8')).toHaveTextContent('Mid bus · 26 seats')
    expect(row('Route 9')).toHaveTextContent('Not started · starts 7:50')
  })

  it('draws the red and amber borders', async () => {
    await openPage()
    expect(screen.getByRole('article', { name: 'Route 3' })).toHaveClass('border-bad')
    expect(screen.getByRole('article', { name: 'Route 5' })).toHaveClass('border-dust')
    expect(screen.getByRole('article', { name: 'Route 4' })).toHaveClass('border-rule')
  })

  it('shows the attention box with the server text, on top of the rows', async () => {
    await openPage()
    const box = screen.getByRole('region', { name: 'Needs attention' })
    expect(box).toHaveTextContent('Route 3 has no taps yet')
    expect(box).toHaveTextContent('The first stop, Pirthala, was due at 7:15.')
    expect(box).toHaveTextContent('Route 5 is running 16 minutes late')
    // The box comes before the list of buses.
    const list = screen.getByRole('region', { name: 'All buses' })
    expect(box.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('hides the attention box when the server finds no problem', async () => {
    server.use(http.get('/api/v1/bus-status/attention', () => HttpResponse.json([])))
    await openPage()
    expect(screen.queryByRole('region', { name: 'Needs attention' })).not.toBeInTheDocument()
  })

  it('opens one bus from "View children"', async () => {
    const { router } = await openPage()
    const row = screen.getByRole('article', { name: 'Route 4' })
    await userEvent.click(within(row).getByRole('link', { name: /View children/ }))
    expect(router.state.location.pathname).toBe('/bus-status/routes/4')
  })
})

describe('tilesAreCountedFromTheRoutes', () => {
  it('counts the buses by state and adds the children', () => {
    const routes = [
      makeRoute({ routeId: 1, state: 'ON_THE_WAY', boarded: 10, absent: 1, total: 20 }),
      makeRoute({ routeId: 2, state: 'LATE', boarded: 5, absent: 0, total: 15 }),
      makeRoute({ routeId: 3, state: 'NO_TAPS', boarded: 0, absent: 0, total: 22 }),
      makeRoute({ routeId: 4, state: 'REACHED_SCHOOL', boarded: 8, absent: 2, total: 10 }),
      makeRoute({ routeId: 5, state: 'NOT_STARTED', boarded: 0, absent: 0, total: 30 }),
    ]
    expect(summarise(routes)).toEqual({
      buses: 5,
      onTheWay: 2,
      reached: 1,
      boarded: 23,
      total: 97,
      absent: 3,
      needAttention: 2,
    })
  })

  it('has zeros for no buses', () => {
    expect(summarise([])).toMatchObject({ buses: 0, boarded: 0, needAttention: 0 })
  })
})

describe('Bus status: the phase in the address', () => {
  it('phaseSwitchWritesToTheUrl', async () => {
    const { router } = await openPage()
    await userEvent.click(screen.getByRole('button', { name: 'Evening drop' }))
    expect(router.state.location.search).toBe('?phase=EVENING')
    expect(screen.getByRole('button', { name: 'Evening drop' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Morning pickup' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    // The evening picture: Route 5 is still boarding at school.
    const row = await screen.findByRole('article', { name: 'Route 5' })
    expect(row).toHaveTextContent('Not started · starts 3:20 pm')
    expect(screen.getByText('Live · updated 3:32 pm')).toBeInTheDocument()
    expect(tile('All children home')).toHaveTextContent('2 buses')
    expect(screen.getByRole('region', { name: 'Needs attention' })).toHaveTextContent(
      'is not on the Route 6 bus',
    )
  })

  it('opens with the phase from the address already chosen', async () => {
    await openPage(sampleUserIds.owner, '/bus-status?phase=AT_SCHOOL')
    expect(screen.getByRole('button', { name: 'At school' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('keeps the phase on the link to one bus', async () => {
    await openPage(sampleUserIds.owner, '/bus-status?phase=EVENING')
    const row = screen.getByRole('article', { name: 'Route 4' })
    expect(within(row).getByRole('link', { name: /View children/ })).toHaveAttribute(
      'href',
      '/bus-status/routes/4?phase=EVENING',
    )
  })
})

describe('Bus status: the four states', () => {
  it('shows a loading block first', async () => {
    saveLogin(sampleUserIds.owner)
    renderApp('/bus-status')
    // The header is there at once; the buses are still on the way.
    await screen.findByRole('heading', { name: 'Bus status', level: 1 })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'All buses' })).not.toBeInTheDocument()
    await screen.findByRole('region', { name: 'All buses' })
  })

  it('shows an error with a Retry button when the first ask fails', async () => {
    server.use(
      http.get('/api/v1/bus-status', () => HttpResponse.json({ error: 'X' }, { status: 500 })),
    )
    saveLogin(sampleUserIds.owner)
    renderApp('/bus-status')
    const alert = await screen.findByRole('alert')
    server.resetHandlers()
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('region', { name: 'All buses' })).toBeInTheDocument()
  })

  it('shows an empty state when there are no routes', async () => {
    server.use(
      http.get('/api/v1/bus-status', () =>
        HttpResponse.json({ ...busStatusAnswer('MORNING'), routes: [] }),
      ),
    )
    saveLogin(sampleUserIds.owner)
    renderApp('/bus-status')
    expect(await screen.findByText('No buses yet')).toBeInTheDocument()
  })
})

describe('Bus status: who can open it', () => {
  it('transportInchargeCanOpenAdmissionsDeskCannot', async () => {
    saveLogin(sampleUserIds.transport)
    const first = renderApp('/bus-status')
    expect(await first.findByRole('region', { name: 'All buses' })).toBeInTheDocument()
    first.unmount()

    saveLogin(sampleUserIds.admissions)
    renderApp('/bus-status')
    expect(
      await screen.findByRole('heading', { name: 'You cannot open this page' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'All buses' })).not.toBeInTheDocument()
  })

  it('does not show the menu item to the admissions desk', async () => {
    saveLogin(sampleUserIds.admissions)
    renderApp('/routes')
    await screen.findByRole('heading', { name: 'Routes and load', level: 1 })
    expect(screen.queryByRole('link', { name: 'Bus status' })).not.toBeInTheDocument()
  })
})

describe('Bus status: live refresh', () => {
  /** Counts the asks for the route list. Answers like the mock, or fails when told to. */
  function watchAsks() {
    const state = { asks: 0, fail: false }
    server.use(
      http.get('/api/v1/bus-status', () => {
        state.asks += 1
        if (state.fail) return HttpResponse.json({ error: 'X' }, { status: 500 })
        return HttpResponse.json(busStatusAnswer('MORNING'))
      }),
    )
    return state
  }

  function setTabVisible(visible: boolean) {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (visible ? 'visible' : 'hidden'),
    })
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }))
  }

  // Only the interval is faked: it is what Query uses for the 30-second ask.
  beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }))
  afterEach(() => {
    vi.useRealTimers()
    setTabVisible(true)
  })

  it('pageRefetchesEvery30Seconds', async () => {
    const state = watchAsks()
    await openPage()
    expect(state.asks).toBe(1)
    await act(() => vi.advanceTimersByTimeAsync(REFRESH_MS))
    await waitFor(() => expect(state.asks).toBe(2))
    await act(() => vi.advanceTimersByTimeAsync(REFRESH_MS))
    await waitFor(() => expect(state.asks).toBe(3))
  })

  it('pageDoesNotRefetchWhileTabIsHidden', async () => {
    const state = watchAsks()
    await openPage()
    expect(state.asks).toBe(1)

    await act(async () => setTabVisible(false))
    await act(() => vi.advanceTimersByTimeAsync(REFRESH_MS * 3))
    expect(state.asks).toBe(1)

    // Shown again: it asks at once, without waiting for the next 30 seconds.
    await act(async () => setTabVisible(true))
    await waitFor(() => expect(state.asks).toBe(2))
  })

  it('failedRefreshKeepsOldDataAndShowsStaleNote', async () => {
    const state = watchAsks()
    await openPage()
    expect(screen.getByText('Live · updated 7:48 am')).toBeInTheDocument()

    state.fail = true
    await act(() => vi.advanceTimersByTimeAsync(REFRESH_MS))
    const note = await screen.findByText('Last updated 7:48 am. Trying again.')
    expect(note).toHaveClass('text-dust-text')
    // The nine buses and the numbers are still there. There is no error box.
    expect(screen.getAllByRole('article')).toHaveLength(9)
    expect(tile('Children boarded')).toHaveTextContent('118 of 255')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/Live · updated/)).not.toBeInTheDocument()

    // The next ask works: back to "Live".
    state.fail = false
    await act(() => vi.advanceTimersByTimeAsync(REFRESH_MS))
    expect(await screen.findByText('Live · updated 7:48 am')).toBeInTheDocument()
    expect(screen.queryByText(/Trying again/)).not.toBeInTheDocument()
  })

  it('keeps the buses when the attention ask fails', async () => {
    watchAsks()
    await openPage()
    server.use(
      http.get('/api/v1/bus-status/attention', () =>
        HttpResponse.json({ error: 'X' }, { status: 500 }),
      ),
    )
    await act(() => vi.advanceTimersByTimeAsync(REFRESH_MS))
    expect(await screen.findByText('Last updated 7:48 am. Trying again.')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(9)
    // The old problems stay on the screen too.
    expect(screen.getByRole('region', { name: 'Needs attention' })).toBeInTheDocument()
  })
})
