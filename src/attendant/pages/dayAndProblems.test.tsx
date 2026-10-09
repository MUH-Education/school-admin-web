import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { db } from '@/mocks/db'
import { server } from '@/mocks/server'
import { refreshLocalState } from '../localState'
import { addTap } from '../tap'
import { getProblems, getQueue, saveManifest } from '../tapStore'
import { DAY, at, makeManifest } from '@/test/attendant'
import { openPhone } from '@/test/phone'
import { phoneDb } from '../phoneDb'
import type { TapProblem } from '../types'

describe('a new day', () => {
  it('loads the new day’s list at the first open after midnight, and keeps yesterday’s unsent taps', async () => {
    // The phone has yesterday's list and one tap that was never sent.
    const yesterday = makeManifest({ date: '2026-10-06' })
    await saveManifest(yesterday)
    await addTap(
      { studentId: 412, eventType: 'BOARDED_EVENING', outcome: 'DONE' },
      at('15:10', '2026-10-06'),
    )
    server.use(http.all('/api/v1/trips/*', () => HttpResponse.error()))
    await openPhone('/trip', { manifest: yesterday })
    // No network at first: yesterday's list with the banner.
    expect(
      await screen.findByText('आज की सूची नहीं आई। नेटवर्क में जाकर दोबारा खोलें।'),
    ).toBeInTheDocument()
    // Yesterday's answers are not shown as today's: nobody has boarded yet.
    expect(screen.getByRole('link', { name: /सुबह चढ़ाना/ })).toHaveTextContent('बाकी है')
    expect((await getQueue()).map((t) => t.serviceDate)).toEqual(['2026-10-06'])
  })

  it('replaces the old list and drops the banner when the network comes back', async () => {
    const yesterday = makeManifest({ date: '2026-10-06' })
    server.use(http.get('/api/v1/trips/my-route', () => HttpResponse.error(), { once: true }))
    await openPhone('/trip', { manifest: yesterday })
    expect(await screen.findByText(/आज की सूची नहीं आई/)).toBeInTheDocument()

    window.dispatchEvent(new Event('online'))
    await waitFor(() => expect(screen.queryByText(/आज की सूची नहीं आई/)).not.toBeInTheDocument())
    // Today's list from the server (19 children of Route 4, 11 boarded).
    expect(screen.getByRole('link', { name: /सुबह चढ़ाना/ })).toHaveTextContent('11 / 19')
    expect(db.tripTaps).toEqual([])
  })

  it('opens yesterday’s list with a banner and lets the attendant tap', async () => {
    const yesterday = makeManifest({ date: '2026-10-06' })
    server.use(http.get('/api/v1/trips/my-route', () => HttpResponse.error()))
    await openPhone('/trip', { manifest: yesterday })
    expect(await screen.findByRole('alert')).toHaveTextContent('आज की सूची नहीं आई')
    // The pages still open from the saved list.
    expect(screen.getByRole('link', { name: /सुबह चढ़ाना/ })).toBeInTheDocument()
    expect(DAY).toBe('2026-10-07')
  })
})

describe('the problems list', () => {
  async function withProblem(): Promise<TapProblem> {
    const problem: TapProblem = {
      id: 'p1',
      studentId: 407,
      eventType: 'BOARDED_EVENING',
      outcome: 'DONE',
      serviceDate: DAY,
      occurredAt: `${DAY}T15:12:00+05:30`,
      tries: 1,
      error: 'NOT_YOUR_ROUTE',
      name: 'Manpreet',
    }
    await (await phoneDb()).put('tapProblems', problem)
    await refreshLocalState()
    return problem
  }

  it('shows a red line under the strip, opens the list with the reason in simple Hindi, and clears it', async () => {
    await openPhone('/trip')
    await screen.findByText('आज के चार काम')
    await withProblem()
    expect(await screen.findByText('1 टैप ऑफ़िस ने नहीं लिया। ऑफ़िस को बताएँ।')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'देखें' }))
    const dialog = await screen.findByRole('dialog', { name: 'ऑफ़िस ने ये टैप नहीं लिए' })
    expect(within(dialog).getByText(/Manpreet · छुट्टी में चढ़ना/)).toBeInTheDocument()
    expect(within(dialog).getByText(/3:12/)).toBeInTheDocument()
    expect(within(dialog).getByText('यह बच्चा अब आपके रूट पर नहीं है।')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'सूची साफ़ करें' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByText(/ऑफ़िस ने नहीं लिया/)).not.toBeInTheDocument()
    expect(await getProblems()).toEqual([])
  })

  it('its buttons are at least 52px high', async () => {
    await openPhone('/trip')
    await screen.findByText('आज के चार काम')
    await withProblem()
    await userEvent.click(await screen.findByRole('button', { name: 'देखें' }))
    const dialog = await screen.findByRole('dialog')
    for (const button of within(dialog).getAllByRole('button')) {
      expect(parseInt(button.style.minHeight)).toBeGreaterThanOrEqual(52)
    }
  })

  it('a refused tap from a real send ends up in the list', async () => {
    await openPhone('/trip')
    await screen.findByText('आज के चार काम')
    await addTap({ studentId: 2003, eventType: 'BOARDED_MORNING', outcome: 'DONE' }, at('07:50'))
    expect(await screen.findByText('1 टैप ऑफ़िस ने नहीं लिया। ऑफ़िस को बताएँ।')).toBeInTheDocument()
  })
})
