import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/mocks/db'
import { child, DAY, done, makeManifest } from '@/test/attendant'
import { openPhone } from '@/test/phone'
import { getQueue } from '../tapStore'

/** Three children boarded, one absent (the fixture of the tests), nobody at school yet. */
const manifest = () => makeManifest()

describe('Reached school (/trip/school)', () => {
  it('shows the question, the two numbers, the big button and the children who did not come', async () => {
    await openPhone('/trip/school', { manifest: manifest() })
    expect(
      await screen.findByRole('heading', { name: 'स्कूल पहुँचे', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'बस स्कूल पहुँच गई?' })).toBeInTheDocument()
    expect(screen.getByText('बच्चे बस में हैं').previousElementSibling).toHaveTextContent('3')
    expect(
      screen.getByText('आज नहीं आए', { selector: 'span' }).previousElementSibling,
    ).toHaveTextContent('1')
    expect(
      screen.getByRole('button', { name: /हाँ, सब 3 बच्चे\s*स्कूल में उतर गए/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'यह बटन दबाते ही माता-पिता को SMS चला जाता है। हर बच्चे का नाम दोबारा दबाना नहीं पड़ता।',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'एक-एक बच्चे का नाम देखें' })).toBeInTheDocument()
    expect(screen.getByText('Siya')).toBeInTheDocument()
  })

  it('reachedSchoolAsksOnceThenQueuesOneTapPerBoardedChild', async () => {
    await openPhone('/trip/school', { manifest: manifest(), online: false })
    await userEvent.click(await screen.findByRole('button', { name: /हाँ, सब 3 बच्चे/ }))

    // One question, nothing is saved before the answer.
    const dialog = await screen.findByRole('dialog', { name: '3 बच्चे स्कूल में उतर गए?' })
    expect(await getQueue()).toEqual([])
    await userEvent.click(within(dialog).getByRole('button', { name: 'हाँ' }))

    await waitFor(async () => expect(await getQueue()).toHaveLength(3))
    const queue = await getQueue()
    expect(queue.map((t) => t.studentId).sort()).toEqual([400, 401, 405])
    expect(queue.every((t) => t.eventType === 'REACHED_SCHOOL' && t.outcome === 'DONE')).toBe(true)
    expect(new Set(queue.map((t) => t.occurredAt)).size).toBe(1)
    expect(await screen.findByText('✓ सब 3 बच्चे स्कूल पहुँच गए')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(/3 टैप फ़ोन में सेव हैं/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'आज के काम' })).toHaveAttribute('href', '/trip')
  })

  it('"No" in the question saves nothing', async () => {
    await openPhone('/trip/school', { manifest: manifest(), online: false })
    await userEvent.click(await screen.findByRole('button', { name: /हाँ, सब 3 बच्चे/ }))
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'नहीं' }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await getQueue()).toEqual([])
  })

  it('with network the three taps reach the server', async () => {
    await openPhone('/trip/school', { manifest: manifest() })
    await userEvent.click(await screen.findByRole('button', { name: /हाँ, सब 3 बच्चे/ }))
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'हाँ' }),
    )
    await waitFor(() => expect(db.tripTaps).toHaveLength(3))
    expect(db.tripTaps.every((t) => t.eventType === 'REACHED_SCHOOL')).toBe(true)
    await waitFor(() => expect(screen.getByText('सब जानकारी ऑफ़िस पहुँच गई')).toBeInTheDocument())
  })

  it('does not tap again a child who already got off one by one', async () => {
    const m = makeManifest()
    m.stops[0]!.children[0] = child(400, 'Mohit', {
      BOARDED_MORNING: done('07:26', DAY),
      REACHED_SCHOOL: done('08:05', DAY),
    })
    await openPhone('/trip/school', { manifest: m, online: false })
    await userEvent.click(await screen.findByRole('button', { name: /हाँ, सब 3 बच्चे/ }))
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'हाँ' }),
    )
    await waitFor(async () => expect(await getQueue()).toHaveLength(2))
    expect((await getQueue()).map((t) => t.studentId).sort()).toEqual([401, 405])
  })

  it('"see the names one by one" lists the boarded children; each has one button, and again undoes it', async () => {
    const { router } = await openPhone('/trip/school', { manifest: manifest(), online: false })
    await userEvent.click(await screen.findByRole('button', { name: 'एक-एक बच्चे का नाम देखें' }))
    expect(router.state.location.search).toBe('?names=1')
    expect(await screen.findByRole('heading', { name: 'एक-एक बच्चा' })).toBeInTheDocument()
    expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual([
      'Mohit',
      'Anjali',
      'Aryan',
    ])
    expect(screen.getByText('0 / 3 उतरे')).toBeInTheDocument()

    const aryan = screen.getByRole('group', { name: 'Aryan' })
    await userEvent.click(within(aryan).getByRole('button', { name: 'उतर गए' }))
    expect(await within(aryan).findByRole('button', { name: '✓ उतर गए' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('1 / 3 उतरे')).toBeInTheDocument()
    expect(await getQueue()).toMatchObject([
      { studentId: 405, eventType: 'REACHED_SCHOOL', outcome: 'DONE' },
    ])
    expect(within(aryan).getByText('कक्षा 3 B · 7:48 · फ़ोन में सेव')).toBeInTheDocument()

    await userEvent.click(within(aryan).getByRole('button', { name: '✓ उतर गए' }))
    await waitFor(async () => expect(await getQueue()).toEqual([]))

    await userEvent.click(screen.getByRole('button', { name: 'वापस बड़े बटन पर' }))
    expect(await screen.findByRole('heading', { name: 'बस स्कूल पहुँच गई?' })).toBeInTheDocument()
  })

  it('says so when nobody is on the bus', async () => {
    const empty = makeManifest({
      stops: [{ id: 1, name: 'A', children: [child(400, 'Mohit')] }],
    })
    await openPhone('/trip/school', { manifest: empty })
    expect(await screen.findByText('आज कोई बच्चा बस में नहीं है।')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /हाँ, सब/ })).not.toBeInTheDocument()
  })
})
