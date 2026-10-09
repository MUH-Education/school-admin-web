import { delay, http, HttpResponse } from 'msw'
import { getToken, setToken } from '@/api/client'
import { db } from '@/mocks/db'
import { server } from '@/mocks/server'
import { at, BALWAN, DAY, makeManifest, seedManifest, setOnline } from '@/test/attendant'
import { getLocalState } from './localState'
import { addTap } from './tap'
import { getManifest, getProblems, getQueue, writeTaps } from './tapStore'
import { syncOnce } from './sync'
import type { MarksRequest, Tap } from './types'

function login() {
  setToken(`mock-token-${BALWAN}`)
}

/** Counts the calls to POST /trips/marks, and lets the real mock answer. */
function watchMarks() {
  const calls: MarksRequest[] = []
  server.use(
    http.post('/api/v1/trips/marks', async ({ request }) => {
      calls.push((await request.clone().json()) as MarksRequest)
      // Not handled here: the next handler (the mock server) answers.
      return undefined
    }),
  )
  return calls
}

async function tapMorning(studentId: number, hhmmss: string, outcome: 'DONE' | 'ABSENT' = 'DONE') {
  await addTap({ studentId, eventType: 'BOARDED_MORNING', outcome }, at(hhmmss))
}

beforeEach(() => {
  login()
  setOnline(true)
})

describe('syncOnce', () => {
  it('sends every waiting tap in one call, oldest first, and then the queue is empty', async () => {
    await seedManifest()
    const calls = watchMarks()
    await tapMorning(414, '07:58:00')
    await tapMorning(412, '07:56:10')

    expect(await syncOnce()).toBe('SENT')

    expect(calls).toHaveLength(1)
    expect(calls[0]?.marks.map((m) => m.studentId)).toEqual([412, 414])
    expect(await getQueue()).toEqual([])
    expect(getLocalState().queue).toEqual([])
  })

  it('sends the time the tap was made on the phone, not the time of sending', async () => {
    await seedManifest()
    await tapMorning(412, '07:56:10')
    setOnline(true)
    await syncOnce()
    expect(db.tripTaps).toMatchObject([
      { studentId: 412, outcome: 'DONE', occurredAt: '2026-10-07T07:56:10+05:30' },
    ])
  })

  it('puts a confirmed tap in the saved manifest, so the answer stays after the queue is empty', async () => {
    await seedManifest()
    await tapMorning(412, '07:56:10')
    await syncOnce()
    const yash = (await getManifest())?.stops
      .flatMap((s) => s.children)
      .find((c) => c.studentId === 412)
    expect(yash?.taps.BOARDED_MORNING).toEqual({
      outcome: 'DONE',
      occurredAt: '2026-10-07T07:56:10+05:30',
    })
  })

  it('takes a confirmed CLEARED out of the saved manifest', async () => {
    await seedManifest()
    await addTap({ studentId: 405, eventType: 'BOARDED_MORNING', outcome: 'CLEARED' }, at('07:50'))
    await syncOnce()
    const aryan = (await getManifest())?.stops
      .flatMap((s) => s.children)
      .find((c) => c.studentId === 405)
    expect(aryan?.taps.BOARDED_MORNING).toBeUndefined()
  })

  it('does nothing when the queue is empty', async () => {
    const calls = watchMarks()
    expect(await syncOnce()).toBe('EMPTY')
    expect(calls).toHaveLength(0)
  })

  it('does not call the server without a login, and keeps the taps', async () => {
    await seedManifest()
    await tapMorning(412, '07:56')
    setToken(null)
    const calls = watchMarks()
    expect(await syncOnce()).toBe('NO_LOGIN')
    expect(calls).toHaveLength(0)
    expect(await getQueue()).toHaveLength(1)
  })

  it('does not call the server when the phone has no network, and keeps the taps', async () => {
    await seedManifest()
    await tapMorning(412, '07:56')
    setOnline(false)
    const calls = watchMarks()
    expect(await syncOnce()).toBe('OFFLINE')
    expect(calls).toHaveLength(0)
    expect(await getQueue()).toHaveLength(1)
  })
})

describe('onlyOneSyncRunsAtATime', () => {
  it('two calls at once make one call to the server', async () => {
    await seedManifest()
    await tapMorning(412, '07:56')
    let calls = 0
    server.use(
      http.post('/api/v1/trips/marks', async () => {
        calls++
        await delay(30)
        return HttpResponse.json({
          results: [{ studentId: 412, eventType: 'BOARDED_MORNING', ok: true }],
        })
      }),
    )
    const [first, second] = await Promise.all([syncOnce(), syncOnce()])
    expect(first).toBe('SENT')
    expect(second).toBe('SENT')
    expect(calls).toBe(1)
  })

  it('a tap added while a run is going is sent by the same run', async () => {
    await seedManifest()
    await tapMorning(412, '07:56')
    const batches: number[] = []
    server.use(
      http.post('/api/v1/trips/marks', async ({ request }) => {
        const { marks } = (await request.json()) as MarksRequest
        batches.push(marks.length)
        await delay(20)
        return HttpResponse.json({
          results: marks.map((m) => ({ studentId: m.studentId, eventType: m.eventType, ok: true })),
        })
      }),
    )
    const run = syncOnce()
    await delay(5)
    await tapMorning(414, '07:57')
    await syncOnce() // asks the running loop to look again
    await run
    expect(batches).toEqual([1, 1])
    expect(await getQueue()).toEqual([])
  })
})

describe('when the sending goes wrong', () => {
  it('keeps every tap after a network error, counts a try, and says the network failed', async () => {
    await seedManifest()
    await tapMorning(412, '07:56')
    await tapMorning(414, '07:57')
    server.use(http.post('/api/v1/trips/marks', () => HttpResponse.error()))
    expect(await syncOnce()).toBe('FAILED')
    const queue = await getQueue()
    expect(queue).toHaveLength(2)
    expect(queue.every((t) => t.tries === 1)).toBe(true)
    expect(getLocalState().networkFailed).toBe(true)
    expect(getLocalState().syncing).toBe(false)
  })

  it('keeps every tap after a 5xx answer', async () => {
    await seedManifest()
    await tapMorning(412, '07:56')
    server.use(
      http.post('/api/v1/trips/marks', () =>
        HttpResponse.json({ error: 'SERVER' }, { status: 503 }),
      ),
    )
    expect(await syncOnce()).toBe('FAILED')
    expect(await getQueue()).toHaveLength(1)
    expect(await getProblems()).toEqual([])
  })

  it('the next run sends them after a failure', async () => {
    await seedManifest()
    await tapMorning(412, '07:56')
    server.use(http.post('/api/v1/trips/marks', () => HttpResponse.error(), { once: true }))
    expect(await syncOnce()).toBe('FAILED')
    expect(await syncOnce()).toBe('SENT')
    expect(getLocalState().networkFailed).toBe(false)
    expect(await getQueue()).toEqual([])
  })

  it('keeps the taps after a 401 and forgets the login (the person logs in again)', async () => {
    await seedManifest()
    await tapMorning(412, '07:56')
    server.use(
      http.post('/api/v1/trips/marks', () =>
        HttpResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 }),
      ),
    )
    expect(await syncOnce()).toBe('UNAUTHORIZED')
    expect(await getQueue()).toHaveLength(1)
  })

  it('an answer with the wrong number of results is not trusted: every tap stays', async () => {
    await seedManifest()
    await tapMorning(412, '07:56')
    server.use(http.post('/api/v1/trips/marks', () => HttpResponse.json({ results: [] })))
    expect(await syncOnce()).toBe('FAILED')
    expect(await getQueue()).toHaveLength(1)
  })
})

describe('the loop deletes only taps with ok: true', () => {
  it('moves a refused tap to the problems list, keeps its name and error, and never sends it again', async () => {
    const manifest = makeManifest()
    manifest.stops[2]!.children.push({
      studentId: 2003,
      name: 'Kavya',
      className: '4 B',
      taps: {},
    })
    await seedManifest(manifest)
    await tapMorning(2003, '07:56:00') // a child of Route 2
    await tapMorning(412, '07:57:00')
    const calls = watchMarks()

    expect(await syncOnce()).toBe('SENT')

    expect(await getQueue()).toEqual([])
    const problems = await getProblems()
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatchObject({
      studentId: 2003,
      error: 'NOT_YOUR_ROUTE',
      name: 'Kavya',
      occurredAt: '2026-10-07T07:56:00+05:30',
    })
    expect(getLocalState().problems).toHaveLength(1)

    expect(await syncOnce()).toBe('EMPTY')
    expect(calls).toHaveLength(1)
  })

  it('does not delete a tap that was changed while it was on its way', async () => {
    await seedManifest()
    await tapMorning(412, '07:56:00')
    server.use(
      http.post('/api/v1/trips/marks', async ({ request }) => {
        const { marks } = (await request.json()) as MarksRequest
        await delay(30)
        return HttpResponse.json({
          results: marks.map((m) => ({ studentId: m.studentId, eventType: m.eventType, ok: true })),
        })
      }),
    )
    const run = syncOnce()
    await delay(10)
    // While the first tap is on its way, the attendant takes the answer back.
    await addTap(
      { studentId: 412, eventType: 'BOARDED_MORNING', outcome: 'CLEARED' },
      at('07:56:20'),
    )
    await run
    // The loop went on and sent the CLEARED too; both are confirmed and the queue is empty.
    expect(await getQueue()).toEqual([])
    const yash = (await getManifest())?.stops
      .flatMap((s) => s.children)
      .find((c) => c.studentId === 412)
    expect(yash?.taps.BOARDED_MORNING).toBeUndefined()
  })

  it('sends at most 100 taps in a call', async () => {
    await seedManifest()
    const taps: Tap[] = Array.from({ length: 105 }, (_, i) => ({
      id: `t${i}`,
      studentId: 400 + (i % 19),
      eventType: 'BOARDED_MORNING',
      outcome: 'DONE',
      serviceDate: `2026-08-${String(1 + Math.floor(i / 19)).padStart(2, '0')}`,
      occurredAt: `2026-08-${String(1 + Math.floor(i / 19)).padStart(2, '0')}T07:30:00+05:30`,
      tries: 0,
    }))
    await writeTaps(taps)
    const sizes: number[] = []
    server.use(
      http.post('/api/v1/trips/marks', async ({ request }) => {
        const { marks } = (await request.json()) as MarksRequest
        sizes.push(marks.length)
        return HttpResponse.json({
          results: marks.map((m) => ({ studentId: m.studentId, eventType: m.eventType, ok: true })),
        })
      }),
    )
    await syncOnce()
    expect(sizes).toEqual([100, 5])
    expect(await getQueue()).toEqual([])
  })

  it('still sends yesterday’s taps, with their own date and time', async () => {
    await seedManifest()
    await addTap(
      { studentId: 412, eventType: 'BOARDED_EVENING', outcome: 'DONE' },
      at('15:10:05', '2026-10-06'),
    )
    await syncOnce()
    expect(db.tripTaps).toMatchObject([
      { serviceDate: '2026-10-06', occurredAt: '2026-10-06T15:10:05+05:30' },
    ])
  })
})

describe('tapsSurviveLogoutAndAreSentAfterLogin', () => {
  it('a logout does not touch the queue; after the next login the taps go', async () => {
    await seedManifest()
    await tapMorning(412, '07:56')
    await tapMorning(414, '07:57')

    setToken(null) // logout, or a 401
    expect(await syncOnce()).toBe('NO_LOGIN')
    expect(await getQueue()).toHaveLength(2)
    expect(getToken()).toBeNull()

    login()
    expect(await syncOnce()).toBe('SENT')
    expect(await getQueue()).toEqual([])
    expect(db.tripTaps).toHaveLength(2)
    expect(DAY).toBe('2026-10-07')
  })
})
