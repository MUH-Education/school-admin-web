import { getLocalState, subscribeLocalState } from './localState'
import { addTap, addTaps, outcomeAfterPress } from './tap'
import { getQueue, writeTaps } from './tapStore'
import { at, makeManifest, seedManifest } from '@/test/attendant'

describe('addTap', () => {
  it('tapKeepsThePhoneTimeNotTheSendTime: stamps the tap with the phone time', async () => {
    await addTap({ studentId: 412, eventType: 'BOARDED_MORNING', outcome: 'DONE' }, at('07:56:10'))
    const [tap] = await getQueue()
    expect(tap).toMatchObject({
      studentId: 412,
      eventType: 'BOARDED_MORNING',
      outcome: 'DONE',
      serviceDate: '2026-10-07',
      occurredAt: '2026-10-07T07:56:10+05:30',
      tries: 0,
    })
    expect(tap?.id).toBeTruthy()
  })

  it('writes the tap to IndexedDB before the screen is told', async () => {
    const screenSaw: number[] = []
    const stop = subscribeLocalState(() => screenSaw.push(getLocalState().queue.length))
    const writing = addTap(
      { studentId: 412, eventType: 'BOARDED_MORNING', outcome: 'DONE' },
      at('07:56'),
    )
    // The write has started but is not finished: the screen has not changed.
    expect(getLocalState().queue).toHaveLength(0)
    expect(screenSaw).toEqual([])
    await writing
    stop()
    // When the screen changes, the tap is already saved.
    expect(await getQueue()).toHaveLength(1)
    expect(screenSaw).toEqual([1])
  })

  it('unsentTapForSameChildIsReplacedNotDuplicated: a second tap takes the place of the first', async () => {
    await addTap({ studentId: 412, eventType: 'BOARDED_MORNING', outcome: 'DONE' }, at('07:56'))
    await addTap({ studentId: 412, eventType: 'BOARDED_MORNING', outcome: 'ABSENT' }, at('07:57'))
    const queue = await getQueue()
    expect(queue).toHaveLength(1)
    expect(queue[0]).toMatchObject({ outcome: 'ABSENT', occurredAt: '2026-10-07T07:57:00+05:30' })
  })

  it('keeps taps of different events and different days apart', async () => {
    await addTap({ studentId: 412, eventType: 'BOARDED_MORNING', outcome: 'DONE' }, at('07:56'))
    await addTap({ studentId: 412, eventType: 'REACHED_SCHOOL', outcome: 'DONE' }, at('08:05'))
    await addTap(
      { studentId: 412, eventType: 'BOARDED_MORNING', outcome: 'DONE' },
      at('07:56', '2026-10-08'),
    )
    expect(await getQueue()).toHaveLength(3)
  })

  it('writes many taps in one step, all with the same phone time', async () => {
    await addTaps(
      [400, 401, 405].map((studentId) => ({
        studentId,
        eventType: 'REACHED_SCHOOL' as const,
        outcome: 'DONE' as const,
      })),
      at('08:05:30'),
    )
    const queue = await getQueue()
    expect(queue.map((t) => t.studentId).sort()).toEqual([400, 401, 405])
    expect(new Set(queue.map((t) => t.occurredAt))).toEqual(new Set(['2026-10-07T08:05:30+05:30']))
  })
})

describe('taking a tap back', () => {
  it('removes an unsent tap when the server has no answer and the tap never left the phone', async () => {
    await seedManifest()
    await addTap({ studentId: 412, eventType: 'BOARDED_MORNING', outcome: 'DONE' }, at('07:56'))
    await addTap({ studentId: 412, eventType: 'BOARDED_MORNING', outcome: 'CLEARED' }, at('07:57'))
    expect(await getQueue()).toEqual([])
  })

  it('queues CLEARED when the server already has an answer', async () => {
    await seedManifest() // Aryan (405) boarded at 7:42, confirmed
    await addTap({ studentId: 405, eventType: 'BOARDED_MORNING', outcome: 'CLEARED' }, at('07:50'))
    expect(await getQueue()).toMatchObject([{ studentId: 405, outcome: 'CLEARED' }])
  })

  it('queues CLEARED when the first tap may already be on the server (it was handed to the network)', async () => {
    await seedManifest()
    await addTap({ studentId: 412, eventType: 'BOARDED_MORNING', outcome: 'DONE' }, at('07:56'))
    const [tap] = await getQueue()
    await writeTaps([{ ...tap!, tries: 1 }])
    await addTap({ studentId: 412, eventType: 'BOARDED_MORNING', outcome: 'CLEARED' }, at('07:57'))
    expect(await getQueue()).toMatchObject([{ studentId: 412, outcome: 'CLEARED', tries: 0 }])
  })

  it('does not queue a CLEARED for a child that has no answer anywhere', async () => {
    await seedManifest(makeManifest())
    await addTap({ studentId: 412, eventType: 'BOARDED_MORNING', outcome: 'CLEARED' }, at('07:57'))
    expect(await getQueue()).toEqual([])
  })

  it('a changed answer replaces the old one: queue holds one tap with the later time', async () => {
    await seedManifest(
      makeManifest({
        stops: [{ id: 1, name: 'A', children: [{ ...makeManifest().stops[0]!.children[0]! }] }],
      }),
    )
    await addTap({ studentId: 400, eventType: 'BOARDED_MORNING', outcome: 'ABSENT' }, at('07:58'))
    expect(await getQueue()).toMatchObject([{ studentId: 400, outcome: 'ABSENT' }])
  })
})

describe('outcomeAfterPress', () => {
  it('the same button again is CLEARED; the other button changes the answer', () => {
    expect(outcomeAfterPress('DONE', 'DONE')).toBe('CLEARED')
    expect(outcomeAfterPress('ABSENT', 'DONE')).toBe('DONE')
    expect(outcomeAfterPress(null, 'ABSENT')).toBe('ABSENT')
    expect(outcomeAfterPress('NOT_TRAVELLING', 'NOT_TRAVELLING')).toBe('CLEARED')
  })
})
