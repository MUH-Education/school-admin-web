import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/mocks/db'
import { openPhone } from '@/test/phone'
import { getQueue } from '../tapStore'

const gated = (n: number) =>
  screen.getByRole('button', { name: `बस चलाने से पहले ${n} का जवाब दें` })

async function press(name: string, button: string) {
  await userEvent.click(
    within(await screen.findByRole('group', { name })).getByRole('button', { name: button }),
  )
}

describe('Evening boarding (/trip/evening)', () => {
  it('lists the children who came in the morning with the red banner and the gated button', async () => {
    await openPhone('/trip/evening', { online: false })
    expect(
      await screen.findByRole('heading', { name: 'छुट्टी में चढ़ाना', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('बच्चे चढ़े')).toHaveTextContent('0 / 3')
    expect(screen.getByRole('alert')).toHaveTextContent('3 बच्चे अभी बस में नहीं हैं')
    expect(screen.getByText('ये सुबह बस से आए थे। हर बच्चे का जवाब दें।')).toBeInTheDocument()
    // Siya was absent and Manpreet never boarded: neither is listed.
    expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual([
      'Mohit',
      'Anjali',
      'Aryan',
    ])
    expect(
      within(screen.getByRole('group', { name: 'Mohit' })).getByText('कक्षा 5 A · Sadhanwas'),
    ).toBeInTheDocument()
    expect(gated(3)).toBeDisabled()
    expect(screen.getByRole('link', { name: 'ऑफ़िस को फ़ोन करें' })).toBeInTheDocument()
  })

  it('the bottom button is off while any child has no answer, and turns on at zero', async () => {
    await openPhone('/trip/evening', { online: false })
    await press('Mohit', 'चढ़ गए')
    await waitFor(() => expect(gated(2)).toBeDisabled())
    await press('Anjali', 'नहीं जाएँगे')
    await waitFor(() => expect(gated(1)).toBeDisabled())
    expect(screen.getByLabelText('बच्चे चढ़े')).toHaveTextContent('1 / 3')

    await press('Aryan', 'चढ़ गए')
    const go = await screen.findByRole('link', { name: 'घर उतारना शुरू करें ›' })
    expect(go).toHaveAttribute('href', '/trip/drop')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('बच्चे चढ़े')).toHaveTextContent('2 / 3')
  })

  it('answered children go into one green line; "see names" shows them again and a second press undoes', async () => {
    await openPhone('/trip/evening', { online: false })
    await press('Mohit', 'चढ़ गए')
    await press('Anjali', 'नहीं जाएँगे')
    expect(await screen.findByText('✓ 1 बच्चे बस में बैठ गए · 1 नहीं जाएँगे')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Mohit' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'नाम देखें' }))
    const mohit = await screen.findByRole('group', { name: 'Mohit' })
    expect(
      within(mohit).getByText('कक्षा 5 A · Sadhanwas · 7:48 · फ़ोन में सेव'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('group', { name: 'Anjali' })).getByText(
        'कक्षा 2 A · Sadhanwas · आज नहीं जाएँगे · फ़ोन में सेव',
      ),
    ).toBeInTheDocument()

    await userEvent.click(within(mohit).getByRole('button', { name: '✓ चढ़ गए' }))
    await waitFor(() => expect(gated(2)).toBeInTheDocument())
    expect(await getQueue()).toMatchObject([{ studentId: 401, outcome: 'NOT_TRAVELLING' }])
  })

  it('sends BOARDED_EVENING and NOT_TRAVELLING to the server', async () => {
    await openPhone('/trip/evening')
    await press('Mohit', 'चढ़ गए')
    await press('Anjali', 'नहीं जाएँगे')
    await waitFor(() => expect(db.tripTaps).toHaveLength(2))
    expect(db.tripTaps.map((t) => [t.studentId, t.eventType, t.outcome]).sort()).toEqual([
      [400, 'BOARDED_EVENING', 'DONE'],
      [401, 'BOARDED_EVENING', 'NOT_TRAVELLING'],
    ])
  })

  it('its answer buttons are 52px high or more', async () => {
    await openPhone('/trip/evening')
    await screen.findByRole('group', { name: 'Mohit' })
    const buttons = document.querySelectorAll<HTMLElement>('[data-answer-button]')
    expect(buttons).toHaveLength(6)
    for (const button of buttons)
      expect(parseInt(button.style.minHeight)).toBeGreaterThanOrEqual(52)
  })

  it('says so when nobody came in the morning', async () => {
    const { makeManifest, child } = await import('@/test/attendant')
    await openPhone('/trip/evening', {
      manifest: makeManifest({ stops: [{ id: 1, name: 'A', children: [child(400, 'Mohit')] }] }),
    })
    expect(await screen.findByText('आज सुबह कोई बच्चा बस में नहीं आया।')).toBeInTheDocument()
  })
})
