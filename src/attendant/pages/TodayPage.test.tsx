import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { child, DAY, done, makeManifest } from '@/test/attendant'
import { openPhone } from '@/test/phone'

describe('Today page (/trip)', () => {
  it('greets the attendant and shows the date, route and number of children in Hindi', async () => {
    await openPhone('/trip')
    expect(await screen.findByRole('heading', { name: 'नमस्ते, Balwan' })).toBeInTheDocument()
    expect(screen.getByText('बुधवार, 7 अक्टूबर')).toBeInTheDocument()
    expect(screen.getByText('रूट 4 · वैन 4 · 7 बच्चे')).toBeInTheDocument()
    expect(screen.getByText('आज के चार काम')).toBeInTheDocument()
  })

  it('shows the four jobs with counts from the saved list; the pickup is the one to do now', async () => {
    await openPhone('/trip')
    const pickup = await screen.findByRole('link', { name: /सुबह चढ़ाना/ })
    expect(pickup).toHaveTextContent('चल रहा है · 3 / 7 चढ़े')
    expect(pickup).toHaveTextContent('खोलें ›')
    expect(pickup).toHaveAttribute('aria-current', 'step')
    expect(pickup).toHaveAttribute('href', '/trip/pickup')

    const school = screen.getByRole('link', { name: /स्कूल पहुँचे/ })
    expect(school).toHaveTextContent('बाकी है · स्कूल 8:10 बजे')
    expect(school).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: /छुट्टी में चढ़ाना/ })).toHaveTextContent(
      'बाकी है · छुट्टी 2:40 बजे',
    )
    const drop = screen.getByRole('link', { name: /घर उतारना/ })
    expect(drop).toHaveTextContent('बाकी है')
    expect(drop).toHaveAttribute('href', '/trip/drop')
  })

  it('moves the blue border to the next job when the morning is finished', async () => {
    const finished = makeManifest({
      stops: [
        {
          id: 1,
          name: 'A',
          children: [child(400, 'Mohit', { BOARDED_MORNING: done('07:26', DAY) })],
        },
      ],
    })
    await openPhone('/trip', { manifest: finished })
    const pickup = await screen.findByRole('link', { name: /सुबह चढ़ाना/ })
    expect(pickup).toHaveTextContent('पूरा हुआ · 1 / 1 चढ़े')
    expect(screen.getByRole('link', { name: /स्कूल पहुँचे/ })).toHaveAttribute(
      'aria-current',
      'step',
    )
  })

  it('the call button is a tel: link to the office', async () => {
    await openPhone('/trip')
    const call = await screen.findByRole('link', { name: 'ऑफ़िस को फ़ोन करें' })
    expect(call).toHaveAttribute('href', 'tel:+919812340002')
  })

  it('opens the list from the server when the phone has none, then keeps it', async () => {
    await openPhone('/trip', { manifest: null })
    expect(await screen.findByText('रूट 4 · वैन 4 · 19 बच्चे')).toBeInTheDocument()
    const pickup = screen.getByRole('link', { name: /सुबह चढ़ाना/ })
    expect(pickup).toHaveTextContent('चल रहा है · 11 / 19 चढ़े')
  })

  it('noRouteTodayShowsTheCallOfficeMessage', async () => {
    server.use(http.get('/api/v1/trips/my-route', () => HttpResponse.json({ route: null })))
    await openPhone('/trip', { manifest: null })
    expect(
      await screen.findByText('आज आपके नाम कोई रूट नहीं है। ऑफ़िस को फ़ोन करें।'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ऑफ़िस को फ़ोन करें' })).toHaveAttribute(
      'href',
      'tel:+919812340002',
    )
    expect(screen.queryByText('आज के चार काम')).not.toBeInTheDocument()
  })

  it('shows an error with a Retry button when there is no list and no network', async () => {
    server.use(http.get('/api/v1/trips/my-route', () => HttpResponse.error()))
    await openPhone('/trip', { manifest: null })
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('आज की सूची नहीं खुली')).toBeInTheDocument()

    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'दोबारा कोशिश करें' }))
    expect(await screen.findByText('आज के चार काम')).toBeInTheDocument()
  })

  it('opens with no network when the list is saved on the phone (and /auth/me cannot be reached)', async () => {
    // First visit with network: the user is saved.
    const first = await openPhone('/trip')
    await screen.findByText('आज के चार काम')
    await waitFor(async () => {
      const { getSavedUser } = await import('@/auth/savedUser')
      expect(await getSavedUser()).not.toBeNull()
    })
    first.unmount()

    // The second time the whole network is gone.
    server.use(http.all('/api/*', () => HttpResponse.error()))
    const { renderApp } = await import('@/test/utils')
    renderApp('/trip')
    expect(await screen.findByText('आज के चार काम')).toBeInTheDocument()
    expect(screen.getByText('रूट 4 · वैन 4 · 7 बच्चे')).toBeInTheDocument()
  })
})
