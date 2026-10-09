import { dropStops, eveningChildren, jobsOf, lastTapTime, viewState } from './viewState'
import type { Tap } from './types'
import { absent, child, DAY, done, makeManifest } from '@/test/attendant'

function tap(change: Partial<Tap>): Tap {
  return {
    id: crypto.randomUUID(),
    studentId: 412,
    eventType: 'BOARDED_MORNING',
    outcome: 'DONE',
    serviceDate: DAY,
    occurredAt: `${DAY}T07:56:00+05:30`,
    tries: 0,
    ...change,
  }
}

describe('viewState', () => {
  it('is the saved manifest when the queue is empty', () => {
    const view = viewState(makeManifest(), [], DAY)
    expect(view.counts.total).toBe(7)
    expect(view.counts.pickup).toEqual({ boarded: 3, absent: 1, waiting: 3 })
    const mohit = view.children.find((c) => c.studentId === 400)
    expect(mohit?.answers.BOARDED_MORNING).toEqual({
      outcome: 'DONE',
      at: `${DAY}T07:26:00+05:30`,
      pending: false,
    })
  })

  it('shows an unsent tap as an answer at once, marked pending', () => {
    const view = viewState(makeManifest(), [tap({ studentId: 412 })], DAY)
    const yash = view.children.find((c) => c.studentId === 412)
    expect(yash?.answers.BOARDED_MORNING).toMatchObject({ outcome: 'DONE', pending: true })
    expect(view.counts.pickup.boarded).toBe(4)
    expect(view.counts.pickup.waiting).toBe(2)
  })

  it('lets a queued tap win over the saved answer (changed from DONE to ABSENT)', () => {
    const view = viewState(makeManifest(), [tap({ studentId: 405, outcome: 'ABSENT' })], DAY)
    expect(view.children.find((c) => c.studentId === 405)?.answers.BOARDED_MORNING?.outcome).toBe(
      'ABSENT',
    )
    expect(view.counts.pickup).toEqual({ boarded: 2, absent: 2, waiting: 3 })
  })

  it('shows a queued CLEARED as no answer', () => {
    const view = viewState(makeManifest(), [tap({ studentId: 405, outcome: 'CLEARED' })], DAY)
    expect(view.children.find((c) => c.studentId === 405)?.answers.BOARDED_MORNING).toBeUndefined()
    expect(view.counts.pickup.waiting).toBe(4)
  })

  it('shows no old answers when the list is from yesterday, and ignores old taps in the queue', () => {
    const yesterday = makeManifest({ date: '2026-10-06' })
    const view = viewState(
      yesterday,
      [tap({ studentId: 412, serviceDate: '2026-10-06' }), tap({ studentId: 400 })],
      DAY,
    )
    expect(view.counts.total).toBe(7)
    // Only today's tap (Mohit) shows. Yesterday's answers and the tap of 6 Oct do not.
    expect(view.counts.pickup).toEqual({ boarded: 1, absent: 0, waiting: 6 })
  })

  it('has nothing without a manifest', () => {
    expect(viewState(null, [], DAY).children).toEqual([])
  })

  it('counts the evening: children who came in the morning, answered and missing', () => {
    const view = viewState(
      makeManifest(),
      [
        tap({ studentId: 400, eventType: 'BOARDED_EVENING' }),
        tap({ studentId: 401, eventType: 'BOARDED_EVENING', outcome: 'NOT_TRAVELLING' }),
      ],
      DAY,
    )
    expect(view.counts.evening).toEqual({ candidates: 3, boarded: 1, notTravelling: 1, missing: 1 })
    expect(eveningChildren(view).map((c) => c.studentId)).toEqual([400, 401, 405])
  })

  it('counts the school stop and the home drop', () => {
    const view = viewState(
      makeManifest(),
      [
        tap({ studentId: 400, eventType: 'REACHED_SCHOOL' }),
        tap({ studentId: 400, eventType: 'BOARDED_EVENING' }),
        tap({ studentId: 405, eventType: 'BOARDED_EVENING' }),
        tap({ studentId: 405, eventType: 'REACHED_HOME' }),
      ],
      DAY,
    )
    expect(view.counts.school).toEqual({ onBus: 3, absent: 1, reached: 1 })
    expect(view.counts.drop).toEqual({ onBus: 2, dropped: 1 })
  })
})

describe('homeDropUsesReversedStopOrder', () => {
  it('lists the stops of the evening in the reverse of the morning, with only children on the bus', () => {
    const view = viewState(
      makeManifest(),
      [
        tap({ studentId: 400, eventType: 'BOARDED_EVENING' }),
        tap({ studentId: 405, eventType: 'BOARDED_EVENING' }),
        tap({ studentId: 401, eventType: 'BOARDED_EVENING', outcome: 'NOT_TRAVELLING' }),
      ],
      DAY,
    )
    const stops = dropStops(view)
    expect(stops.map((s) => s.name)).toEqual(['Jakhal', 'Sadhanwas'])
    expect(stops[1]?.children.map((c) => c.studentId)).toEqual([400])
  })
})

describe('jobsOf', () => {
  it('at 7:48 the morning pickup is the one running', () => {
    const jobs = jobsOf(viewState(makeManifest(), [], DAY))
    expect(jobs.pickup).toEqual({ state: 'RUNNING', done: 3, total: 7 })
    expect(jobs.school.state).toBe('PENDING')
    expect(jobs.current).toBe('pickup')
  })

  it('moves to the school job when every child has a morning answer', () => {
    const manifest = makeManifest({
      stops: [
        {
          id: 1,
          name: 'A',
          children: [
            child(400, 'Mohit', { BOARDED_MORNING: done('07:26') }),
            child(401, 'Anjali', { BOARDED_MORNING: absent('07:27') }),
          ],
        },
      ],
    })
    const jobs = jobsOf(viewState(manifest, [], DAY))
    expect(jobs.pickup.state).toBe('DONE')
    expect(jobs.current).toBe('school')
  })

  it('nothing is current when all four jobs are done', () => {
    const finished = makeManifest({
      stops: [
        {
          id: 1,
          name: 'A',
          children: [
            child(400, 'Mohit', {
              BOARDED_MORNING: done('07:26'),
              REACHED_SCHOOL: done('08:05'),
              BOARDED_EVENING: done('14:50'),
              REACHED_HOME: done('15:10'),
            }),
          ],
        },
      ],
    })
    expect(jobsOf(viewState(finished, [], DAY)).current).toBeNull()
  })
})

describe('lastTapTime', () => {
  it('gives the latest time, or null', () => {
    expect(lastTapTime([])).toBeNull()
    expect(
      lastTapTime([
        { outcome: 'DONE', at: `${DAY}T07:26:00+05:30`, pending: false },
        undefined,
        { outcome: 'DONE', at: `${DAY}T07:27:00+05:30`, pending: false },
      ]),
    ).toBe(`${DAY}T07:27:00+05:30`)
  })
})
