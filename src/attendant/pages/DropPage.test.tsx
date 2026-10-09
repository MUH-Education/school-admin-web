import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/mocks/db'
import type { Manifest } from '../types'
import { child, DAY, done, makeManifest } from '@/test/attendant'
import { openPhone } from '@/test/phone'
import { getQueue } from '../tapStore'

const evening = { outcome: 'DONE' as const, occurredAt: `${DAY}T14:50:00+05:30` }
const morning = done('07:30', DAY)
const notGoing = { outcome: 'NOT_TRAVELLING' as const, occurredAt: `${DAY}T14:51:00+05:30` }

/** Everybody came in the morning; all but Manpreet boarded in the evening. */
function eveningManifest(): Manifest {
  const both = (id: number, name: string, cls: string) =>
    child(id, name, { BOARDED_MORNING: morning, BOARDED_EVENING: evening }, cls)
  return makeManifest({
    stops: [
      {
        id: 1,
        name: 'Sadhanwas',
        children: [both(400, 'Mohit', '5 A'), both(401, 'Anjali', '2 A')],
      },
      {
        id: 2,
        name: 'Jakhal',
        children: [
          both(405, 'Aryan', '3 B'),
          child(407, 'Manpreet', { BOARDED_MORNING: morning, BOARDED_EVENING: notGoing }, '6 A'),
        ],
      },
      { id: 3, name: 'Kanheri', children: [both(412, 'Yash', 'LKG'), both(414, 'Rohit', '10 A')] },
      { id: 4, name: 'Tohana town', children: [both(416, 'Vivek', '7 A')] },
    ],
  })
}

describe('Home drop (/trip/drop)', () => {
  it('homeDropUsesReversedStopOrder: starts with the last morning stop and skips children who are not on the bus', async () => {
    await openPhone('/trip/drop', { manifest: eveningManifest() })
    expect(await screen.findByRole('heading', { name: 'घर उतारना', level: 1 })).toBeInTheDocument()
    expect(screen.getByLabelText('बच्चे उतरे')).toHaveTextContent('0 / 6')
    expect(screen.getByRole('heading', { name: 'स्टॉप 1 · Tohana town' })).toBeInTheDocument()
    expect(screen.getByText('0 उतरे · 1 बाकी')).toBeInTheDocument()
    expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual(['Vivek'])
    expect(screen.getByText('आगे: Kanheri (2 बच्चे) · Jakhal (1 बच्चे)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'अगला स्टॉप: Kanheri ›' })).toBeInTheDocument()
  })

  it('one tap per child: the row turns green, the count goes up, the tap is saved first', async () => {
    await openPhone('/trip/drop', { manifest: eveningManifest(), online: false })
    const vivek = await screen.findByRole('group', { name: 'Vivek' })
    await userEvent.click(within(vivek).getByRole('button', { name: 'उतर गए' }))
    expect(await within(vivek).findByRole('button', { name: '✓ उतर गए' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(await getQueue()).toMatchObject([
      { studentId: 416, eventType: 'REACHED_HOME', outcome: 'DONE' },
    ])
    expect(screen.getByLabelText('बच्चे उतरे')).toHaveTextContent('1 / 6')
    expect(within(vivek).getByText('कक्षा 7 A · 7:48 · फ़ोन में सेव')).toBeInTheDocument()
    // The only child of the stop got off: no "whole stop" button.
    expect(
      screen.queryByRole('button', { name: 'इस स्टॉप के सब बच्चे उतर गए' }),
    ).not.toBeInTheDocument()
    // The same button again takes it back.
    await userEvent.click(within(vivek).getByRole('button', { name: '✓ उतर गए' }))
    await waitFor(async () => expect(await getQueue()).toEqual([]))
  })

  it('"all children of this stop got off" taps every child of the stop that is still on the bus', async () => {
    await openPhone('/trip/drop?stop=3', { manifest: eveningManifest(), online: false })
    expect(await screen.findByRole('heading', { name: 'स्टॉप 2 · Kanheri' })).toBeInTheDocument()
    expect(screen.getByText('✓ स्टॉप 1 · Tohana town')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'इस स्टॉप के सब बच्चे उतर गए' }))
    await waitFor(async () => expect(await getQueue()).toHaveLength(2))
    expect((await getQueue()).map((t) => t.studentId).sort()).toEqual([412, 414])
    expect(screen.getByText('2 उतरे')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'इस स्टॉप के सब बच्चे उतर गए' }),
    ).not.toBeInTheDocument()
  })

  it('only the children still on the bus are tapped when one got off already', async () => {
    await openPhone('/trip/drop?stop=3', { manifest: eveningManifest(), online: false })
    await userEvent.click(
      within(await screen.findByRole('group', { name: 'Yash' })).getByRole('button', {
        name: 'उतर गए',
      }),
    )
    await waitFor(async () => expect(await getQueue()).toHaveLength(1))
    await userEvent.click(screen.getByRole('button', { name: 'इस स्टॉप के सब बच्चे उतर गए' }))
    await waitFor(async () => expect(await getQueue()).toHaveLength(2))
  })

  it('goes through the stops in order, and the last stop ends the day', async () => {
    await openPhone('/trip/drop', { manifest: eveningManifest() })
    await userEvent.click(await screen.findByRole('button', { name: 'अगला स्टॉप: Kanheri ›' }))
    await userEvent.click(await screen.findByRole('button', { name: 'अगला स्टॉप: Jakhal ›' }))
    expect(await screen.findByRole('heading', { name: 'स्टॉप 3 · Jakhal' })).toBeInTheDocument()
    expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual(['Aryan'])
    await userEvent.click(screen.getByRole('button', { name: 'अगला स्टॉप: Sadhanwas ›' }))
    expect(await screen.findByRole('heading', { name: 'स्टॉप 4 · Sadhanwas' })).toBeInTheDocument()
    expect(screen.queryByText(/आगे:/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'आज का काम पूरा ›' })).toHaveAttribute('href', '/trip')
  })

  it('sends REACHED_HOME to the server', async () => {
    await openPhone('/trip/drop', { manifest: eveningManifest() })
    await userEvent.click(
      within(await screen.findByRole('group', { name: 'Vivek' })).getByRole('button', {
        name: 'उतर गए',
      }),
    )
    await waitFor(() => expect(db.tripTaps).toHaveLength(1))
    // 416 is a child of Route 4 in the mock server.
    expect(db.tripTaps[0]).toMatchObject({
      studentId: 416,
      eventType: 'REACHED_HOME',
      outcome: 'DONE',
    })
  })

  it('says so when nobody is on the bus', async () => {
    await openPhone('/trip/drop')
    expect(await screen.findByText('बस में कोई बच्चा नहीं है।')).toBeInTheDocument()
  })

  it('its answer buttons are 52px high or more', async () => {
    await openPhone('/trip/drop?stop=3', { manifest: eveningManifest() })
    await screen.findByRole('group', { name: 'Yash' })
    const buttons = document.querySelectorAll<HTMLElement>('[data-answer-button]')
    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons)
      expect(parseInt(button.style.minHeight)).toBeGreaterThanOrEqual(52)
  })
})
