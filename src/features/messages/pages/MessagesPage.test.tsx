import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderApp, saveLogin, sampleUserIds } from '@/test/utils'

async function openMessages(path = '/messages', userId: number = sampleUserIds.owner) {
  saveLogin(userId)
  const view = renderApp(path)
  await screen.findByRole('table', { name: 'Messages' })
  return view
}

function tile(label: string): HTMLElement {
  const tiles = screen.getByRole('region', { name: 'Message counts' })
  return within(tiles).getByText(label).nextElementSibling as HTMLElement
}

function rowOf(name: string): HTMLElement {
  return screen.getByText(name).closest('tr') as HTMLElement
}

describe('Messages page', () => {
  it('messagesPageStartsWithToday', async () => {
    await openMessages()
    expect(screen.getByRole('heading', { name: 'Messages', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Every SMS sent to parents')).toBeInTheDocument()
    // No date in the address: the server's today, shown in the Day box.
    await waitFor(() => expect(screen.getByLabelText('Day')).toHaveValue('2026-10-07'))
    expect(screen.getByText('Wednesday 7 October 2026')).toBeInTheDocument()
    await waitFor(() => expect(tile('Failed')).toHaveTextContent('3'))
    expect(tile('Waiting')).toHaveTextContent('2')
    expect(tile('Failed')).toHaveClass('text-bad')
    expect(Number(tile('Sent').textContent)).toBeGreaterThan(100)
    // Newest first, 25 to a page.
    const table = screen.getByRole('table', { name: 'Messages' })
    expect(within(table).getAllByRole('row')).toHaveLength(26)
    expect(screen.getByText(/Showing/).textContent).toMatch(/^Showing 1 to 25 of \d+ messages\.$/)
    expect(screen.queryByRole('status', { name: 'Test mode' })).not.toBeInTheDocument()
  })

  it('shows the six columns, the event words and the Hindi text', async () => {
    await openMessages('/messages?q=Mohit')
    const table = screen.getByRole('table', { name: 'Messages' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Time', 'Child', 'Phone', 'Event', 'Text', 'Status'])
    const row = rowOf('Mohit')
    expect(within(row).getByText('7:26')).toHaveClass('font-mono')
    expect(within(row).getByText('Boarded morning bus')).toBeInTheDocument()
    const text = within(row).getByText(/स्कूल बस में चढ़ गए हैं/)
    expect(text).toHaveClass('font-hindi')
    expect(text).toHaveTextContent('Mohit सुबह 7:26 बजे')
    // Only the Hindi text uses the Hindi font.
    expect(within(row).getByText('Mohit')).not.toHaveClass('font-hindi')
    expect(within(row).getByText('Sent 7:26')).toHaveClass('text-good')
  })

  it('phoneIsShownAsTheServerSendsIt', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/messages', () =>
        HttpResponse.json({
          date: '2026-10-07',
          items: [
            {
              id: 1,
              studentId: 7,
              studentName: 'Asha',
              phone: '+91XXXXXX4321',
              event: 'REACHED_HOME',
              text: 'आशा घर पहुँच गई।',
              status: 'SENT',
              createdAt: '2026-10-07T07:43:00+05:30',
              sentAt: '2026-10-07T07:43:00+05:30',
              error: null,
            },
          ],
          page: 1,
          pageSize: 25,
          total: 1,
        }),
      ),
    )
    await openMessages()
    const row = rowOf('Asha')
    expect(within(row).getByText('+91XXXXXX4321')).toHaveClass('font-mono')
    expect(within(row).getByText('Reached home stop')).toBeInTheDocument()
  })

  it('failedRowShowsTheErrorText', async () => {
    await openMessages('/messages?status=FAILED')
    expect(screen.getByLabelText('Status')).toHaveValue('FAILED')
    const table = screen.getByRole('table', { name: 'Messages' })
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    const failed = within(table).getAllByText('Failed')
    expect(failed).toHaveLength(3)
    expect(failed[0]).toHaveClass('text-bad')
    expect(screen.getByText('Number not reachable (DND is on)')).toHaveClass('text-bad')
    expect(screen.getByText('Provider rejected the message')).toBeInTheDocument()
  })

  it('shows Waiting for a queued message', async () => {
    await openMessages('/messages?status=QUEUED')
    const table = screen.getByRole('table', { name: 'Messages' })
    const waiting = within(table).getAllByText('Waiting')
    expect(waiting).toHaveLength(2)
    expect(waiting[0]).toHaveClass('text-canal')
  })

  it('testOnlyRowsShowTheTestModeBox', async () => {
    await openMessages('/messages?date=2026-10-06')
    const box = await screen.findByRole('status', { name: 'Test mode' })
    expect(box).toHaveTextContent("Test mode. Messages are not going to parents' phones.")
    const table = screen.getByRole('table', { name: 'Messages' })
    const grey = within(table).getAllByText('Test only, not sent')
    expect(grey.length).toBeGreaterThan(0)
    expect(grey[0]).toHaveClass('text-ink-soft')
    expect(tile('Sent')).toHaveTextContent('0')
  })

  it('searchingAChildFiltersTheRows', async () => {
    const { router } = await openMessages()
    await userEvent.type(screen.getByLabelText('Search a child by name'), 'tanvi')
    await waitFor(() => expect(router.state.location.search).toBe('?q=tanvi'), { timeout: 1500 })
    await waitFor(() => {
      const rows = within(screen.getByRole('table', { name: 'Messages' })).getAllByRole('row')
      expect(rows).toHaveLength(2)
    })
    const row = rowOf('Tanvi')
    expect(within(row).getByText('Sent 7:43')).toBeInTheDocument()
    expect(screen.getByLabelText('Search a child by name')).toHaveValue('tanvi')
  })

  it('keeps the day and the status in the address, and starts again at page 1', async () => {
    const { router } = await openMessages('/messages?page=2')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'Sent')
    await waitFor(() => expect(router.state.location.search).toBe('?status=SENT'))
    await userEvent.clear(screen.getByLabelText('Day'))
    await waitFor(() => expect(router.state.location.search).toBe('?status=SENT'))
  })

  it('moves between pages with Next and Back', async () => {
    const { router } = await openMessages()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(router.state.location.search).toBe('?page=2'))
    await waitFor(() =>
      expect(screen.getByText(/Showing/).textContent).toMatch(/^Showing 26 to 50 of/),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('shows an empty state with a way back when nothing matches', async () => {
    saveLogin(sampleUserIds.owner)
    const { router } = renderApp('/messages?q=zzzzzz')
    expect(await screen.findByText('No message matches')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear the filters' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
    await screen.findByRole('table', { name: 'Messages' })
  })

  it('shows an empty day', async () => {
    saveLogin(sampleUserIds.owner)
    renderApp('/messages?date=2026-01-01')
    expect(await screen.findByText('No messages on this day')).toBeInTheDocument()
  })

  it('shows an error with Retry, then the list', async () => {
    let fail = true
    server.use(
      http.get('http://localhost:3000/api/v1/messages', () =>
        fail
          ? HttpResponse.json({ error: 'SERVER', message: 'boom' }, { status: 500 })
          : HttpResponse.json({ date: '2026-10-07', items: [], page: 1, pageSize: 25, total: 0 }),
      ),
    )
    saveLogin(sampleUserIds.owner)
    renderApp('/messages')
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No messages on this day')).toBeInTheDocument()
  })

  it('shows a loading state first', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/messages', async () => {
        await delay(150)
        return HttpResponse.json({ date: '2026-10-07', items: [], page: 1, pageSize: 25, total: 0 })
      }),
    )
    saveLogin(sampleUserIds.owner)
    renderApp('/messages')
    await screen.findByLabelText('Search a child by name')
    expect(within(screen.getByLabelText('Message list')).getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByText('No messages on this day')).toBeInTheDocument()
  })

  it('is open to the transport in-charge and the menu shows Messages', async () => {
    await openMessages('/messages', sampleUserIds.transport)
    const nav = screen.getByRole('navigation', { name: 'Main menu' })
    expect(within(nav).getByRole('link', { name: 'Messages' })).toHaveAttribute('href', '/messages')
  })

  it('admissionsDeskCannotOpenMessages', async () => {
    saveLogin(sampleUserIds.admissions)
    renderApp('/messages')
    expect(
      await screen.findByRole('heading', { name: 'You cannot open this page' }),
    ).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main menu' })
    expect(within(nav).queryByRole('link', { name: 'Messages' })).not.toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Messages' })).not.toBeInTheDocument()
  })
})
