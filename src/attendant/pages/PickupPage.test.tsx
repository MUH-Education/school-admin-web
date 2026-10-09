import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/mocks/db'
import { openPhone } from '@/test/phone'
import { getQueue } from '../tapStore'

function row(name: string) {
  return screen.getByRole('group', { name })
}

describe('Morning pickup (/trip/pickup)', () => {
  it('opens the stop that still has children without an answer; earlier stops are one grey line', async () => {
    await openPhone('/trip/pickup')
    expect(
      await screen.findByRole('heading', { name: 'सुबह चढ़ाना', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('रूट 4 · वैन 4')).toBeInTheDocument()
    expect(screen.getByLabelText('बच्चे चढ़े')).toHaveTextContent('3 / 7')

    expect(screen.getByText('✓ स्टॉप 1 · Sadhanwas')).toBeInTheDocument()
    expect(screen.getByText('2 चढ़े · 7:26')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'स्टॉप 2 · Jakhal' })).toBeInTheDocument()
    expect(screen.getByText('1 चढ़े · 1 नहीं आए · 1 बाकी')).toBeInTheDocument()

    // Only the open stop has rows.
    expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual([
      'Aryan',
      'Siya',
      'Manpreet',
    ])
    expect(within(row('Aryan')).getByText('कक्षा 3 B · 7:42 पर चढ़े')).toBeInTheDocument()
    expect(within(row('Siya')).getByText('कक्षा 11 B · आज नहीं आए')).toBeInTheDocument()
    expect(within(row('Manpreet')).getByText('कक्षा 6 A')).toBeInTheDocument()

    expect(screen.getByText('आगे: Kanheri (2 बच्चे) · फिर स्कूल')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'अगला स्टॉप: Kanheri ›' })).toBeInTheDocument()
  })

  it('every answer button is 52px high or more', async () => {
    await openPhone('/trip/pickup')
    await screen.findByRole('group', { name: 'Aryan' })
    const buttons = document.querySelectorAll<HTMLElement>('[data-answer-button]')
    expect(buttons).toHaveLength(6)
    for (const button of buttons)
      expect(parseInt(button.style.minHeight)).toBeGreaterThanOrEqual(52)
  })

  it('a tap is saved on the phone first, then the row turns green and the count goes up', async () => {
    await openPhone('/trip/pickup', { online: false })
    await userEvent.click(
      await within(await screen.findByRole('group', { name: 'Manpreet' })).findByRole('button', {
        name: 'चढ़ गए',
      }),
    )

    await waitFor(() =>
      expect(within(row('Manpreet')).getByRole('button', { name: '✓ चढ़ गए' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    // By the time the screen shows it, the tap is in IndexedDB, with the phone's time.
    expect(await getQueue()).toMatchObject([
      {
        studentId: 407,
        eventType: 'BOARDED_MORNING',
        outcome: 'DONE',
        occurredAt: '2026-10-07T07:48:00+05:30',
      },
    ])
    expect(screen.getByLabelText('बच्चे चढ़े')).toHaveTextContent('4 / 7')
    expect(screen.getByText('2 चढ़े · 1 नहीं आए')).toBeInTheDocument()
    expect(within(row('Manpreet')).getByText('कक्षा 6 A · 7:48 · फ़ोन में सेव')).toBeInTheDocument()
    // Offline: the strip is the big amber banner and nothing was sent.
    expect(screen.getByText('नेटवर्क नहीं है')).toBeInTheDocument()
    expect(screen.getByText(/1 टैप फ़ोन में सेव हैं/)).toBeInTheDocument()
    expect(db.tripTaps).toHaveLength(0)
  })

  it('the same button again takes the answer back; the unsent tap just disappears', async () => {
    await openPhone('/trip/pickup', { online: false })
    const manpreet = await screen.findByRole('group', { name: 'Manpreet' })
    await userEvent.click(within(manpreet).getByRole('button', { name: 'चढ़ गए' }))
    await waitFor(() =>
      expect(within(manpreet).getByRole('button', { name: '✓ चढ़ गए' })).toBeInTheDocument(),
    )
    await userEvent.click(within(manpreet).getByRole('button', { name: '✓ चढ़ गए' }))

    await waitFor(() =>
      expect(within(manpreet).getByRole('button', { name: 'चढ़ गए' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    )
    expect(await getQueue()).toEqual([])
    expect(screen.getByLabelText('बच्चे चढ़े')).toHaveTextContent('3 / 7')
    expect(screen.queryByText('नेटवर्क नहीं है')).not.toBeInTheDocument()
    expect(screen.getByText('सब जानकारी ऑफ़िस पहुँच गई')).toBeInTheDocument()
  })

  it('the other button changes the answer; only one tap stays in the queue', async () => {
    await openPhone('/trip/pickup', { online: false })
    const manpreet = await screen.findByRole('group', { name: 'Manpreet' })
    await userEvent.click(within(manpreet).getByRole('button', { name: 'चढ़ गए' }))
    await userEvent.click(within(manpreet).getByRole('button', { name: 'नहीं आए' }))
    await waitFor(() =>
      expect(within(manpreet).getByRole('button', { name: 'नहीं आए' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    expect(within(manpreet).getByText('कक्षा 6 A · आज नहीं आए · फ़ोन में सेव')).toBeInTheDocument()
    expect(await getQueue()).toMatchObject([{ studentId: 407, outcome: 'ABSENT' }])
    expect(screen.getByText('1 चढ़े · 2 नहीं आए')).toBeInTheDocument()
  })

  it('with network the tap is sent, kept by the server, and the words change from "saved on phone"', async () => {
    await openPhone('/trip/pickup')
    const manpreet = await screen.findByRole('group', { name: 'Manpreet' })
    await userEvent.click(within(manpreet).getByRole('button', { name: 'चढ़ गए' }))
    expect(await within(manpreet).findByText('कक्षा 6 A · 7:48 पर चढ़े')).toBeInTheDocument()
    expect(db.tripTaps).toMatchObject([{ studentId: 407, outcome: 'DONE' }])
    expect(await getQueue()).toEqual([])
    expect(screen.getByText('सब जानकारी ऑफ़िस पहुँच गई')).toBeInTheDocument()
  })

  it('"next stop" opens the next stop; the stop before it becomes a line with the children left', async () => {
    const { router } = await openPhone('/trip/pickup')
    await userEvent.click(await screen.findByRole('button', { name: 'अगला स्टॉप: Kanheri ›' }))
    expect(await screen.findByRole('heading', { name: 'स्टॉप 3 · Kanheri' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?stop=3')
    expect(screen.getByText('✓ स्टॉप 2 · Jakhal')).toBeInTheDocument()
    expect(screen.getByText('1 चढ़े · 1 बाकी')).toBeInTheDocument()
    expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual([
      'Yash',
      'Rohit',
    ])
    expect(screen.getByText('आगे: स्कूल')).toBeInTheDocument()
    // Last stop: the button goes to Reached school.
    expect(screen.getByRole('link', { name: 'स्कूल पहुँचे ›' })).toHaveAttribute(
      'href',
      '/trip/school',
    )
  })

  it('a grey line opens its stop again', async () => {
    await openPhone('/trip/pickup?stop=3')
    await userEvent.click(await screen.findByRole('button', { name: /स्टॉप 2 · Jakhal/ }))
    expect(await screen.findByRole('heading', { name: 'स्टॉप 2 · Jakhal' })).toBeInTheDocument()
  })
})
