import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function openRoutes(userId: number = sampleUserIds.owner, path = '/routes') {
  saveLogin(userId)
  const view = renderApp(path)
  await screen.findByRole('region', { name: 'All routes' })
  return view
}

describe('Routes and load: top of the page', () => {
  it('shows the six numbers of the design', async () => {
    await openRoutes()
    const tiles = screen.getByLabelText('Fleet summary')
    const text = (label: string) => within(tiles).getByText(label).nextElementSibling as HTMLElement
    expect(text('Children on buses')).toHaveTextContent('255')
    expect(text('Seats')).toHaveTextContent('150')
    expect(text('Fleet load')).toHaveTextContent('1.70×')
    expect(text('Cost per child')).toHaveTextContent('₹11,764')
    expect(text('Fee got per child')).toHaveTextContent('₹8,360')
  })

  it('lossIsRedWithMinusSign', async () => {
    await openRoutes()
    const loss = within(screen.getByLabelText('Fleet summary')).getByText('−₹8,67,900')
    expect(loss).toHaveClass('text-bad')
    expect(screen.getByText('Yearly loss')).toBeInTheDocument()
  })

  it('shows one row per route with its seat bar and words', async () => {
    await openRoutes()
    const list = screen.getByRole('region', { name: 'All routes' })
    expect(within(list).getByRole('heading', { name: 'All 9 routes' })).toBeInTheDocument()
    const route4 = within(list).getByRole('button', { name: /Route 4/ })
    expect(route4).toHaveTextContent('19 / 14')
    expect(route4).toHaveTextContent('Over by 5 · run twice or use a bigger bus')
    expect(route4).toHaveTextContent('₹17,542 per child')
    expect(within(route4).getByRole('img')).toHaveAccessibleName(
      '19 children on 14 seats, 5 without a seat',
    )
    expect(within(list).getByRole('button', { name: /Route 8/ })).toHaveTextContent('46 / 26')
  })

  it('selectingARoutePutsItInTheUrl', async () => {
    const { router } = await openRoutes()
    const route4 = screen.getByRole('button', { name: /Route 4/ })
    expect(route4).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(route4)
    expect(router.state.location.search).toBe('?route=4')
    expect(screen.getByRole('button', { name: /Route 4/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: /Route 8/ }))
    expect(router.state.location.search).toBe('?route=8')
  })

  it('opens with the route from the address already selected', async () => {
    await openRoutes(sampleUserIds.owner, '/routes?route=4')
    expect(screen.getByRole('button', { name: /Route 4/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows an error with Retry, then the data', async () => {
    let fail = true
    server.use(
      http.get('/api/v1/routes/load-board', () =>
        fail
          ? HttpResponse.json({ error: 'X', message: 'Boom' }, { status: 500 })
          : HttpResponse.json([]),
      ),
    )
    saveLogin(sampleUserIds.owner)
    renderApp('/routes')
    const retry = await screen.findByRole('button', { name: 'Retry' })
    fail = false
    await userEvent.click(retry)
    expect(await screen.findByText('No routes yet')).toBeInTheDocument()
  })
})

describe('Routes and load: the three numbers', () => {
  it('settingsAreReadOnlyWithoutSettingsEdit', async () => {
    await openRoutes(sampleUserIds.transport)
    const box = await screen.findByLabelText('Settings used for cost')
    expect(within(box).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(box).getByText('11')).toBeInTheDocument()
    expect(within(box).getByText('₹8,800')).toBeInTheDocument()
    expect(within(box).getByText('95%')).toBeInTheDocument()
  })

  it('lets the owner change a number and counts every cost again', async () => {
    await openRoutes()
    const months = await screen.findByLabelText('Months the buses run')
    expect(months).toHaveValue('11')
    expect(screen.getByLabelText('Bus fee per child, per year (₹)')).toHaveValue('8,800')
    expect(screen.getByLabelText('Fee collected (%)')).toHaveValue('95')
    await userEvent.clear(months)
    await userEvent.type(months, '10')
    await userEvent.tab()
    expect(await screen.findByText('Numbers saved')).toBeInTheDocument()
    await waitFor(() =>
      expect(
        within(screen.getByLabelText('Fleet summary')).getByText('−₹5,95,200'),
      ).toBeInTheDocument(),
    )
  })

  it('shows a wrong number under the box and does not save it', async () => {
    await openRoutes()
    const months = await screen.findByLabelText('Months the buses run')
    await userEvent.clear(months)
    await userEvent.type(months, '13')
    await userEvent.tab()
    expect(await screen.findByText('Enter a number from 1 to 12.')).toBeInTheDocument()
    expect(screen.queryByText('Numbers saved')).not.toBeInTheDocument()
  })
})

describe('Routes and load: bottom box', () => {
  it('says what the page is telling you, from the sample numbers', async () => {
    await openRoutes()
    const box = await screen.findByLabelText('What the board is telling you')
    expect(
      within(box).getByRole('heading', { name: 'What this page is telling you' }),
    ).toBeInTheDocument()
    expect(within(box).getByText('105 children')).toBeInTheDocument()
    expect(box).toHaveTextContent('So the problem is too few seats')
    expect(box).toHaveTextContent('yearly loss of ₹8,67,900')
  })
})
