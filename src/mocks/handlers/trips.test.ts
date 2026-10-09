import { api, setToken } from '@/api/client'
import { ApiError } from '@/api/errors'
import type { Manifest, MarksResponse, MyRoute, TapBody } from '@/attendant/types'
import { db } from '../db'

const OWNER = 1
const OFFICE_ADMIN = 2
const BALWAN = 5
const RAMESH = 6

function loginAs(userId: number): void {
  setToken(`mock-token-${userId}`)
}

const day = '2026-10-07'
const aryan = 405 // Jakhal, Route 4
const yash = 412 // Kanheri, Route 4, still waiting at 7:48

function mark(change: Partial<TapBody> = {}): TapBody {
  return {
    studentId: yash,
    eventType: 'BOARDED_MORNING',
    outcome: 'DONE',
    serviceDate: day,
    occurredAt: `${day}T07:56:10+05:30`,
    ...change,
  }
}

function post(...marks: TapBody[]) {
  return api<MarksResponse>('POST', '/trips/marks', { marks })
}

function getManifest() {
  return api<Manifest>('GET', `/trips/manifest?routeId=4&date=${day}`)
}

function childOf(manifest: Manifest, studentId: number) {
  return manifest.stops.flatMap((s) => s.children).find((c) => c.studentId === studentId)
}

describe('mock GET /trips/my-route', () => {
  it('gives Balwan Route 4 and Van 4', async () => {
    loginAs(BALWAN)
    expect(await api<MyRoute>('GET', '/trips/my-route')).toEqual({
      route: { id: 4, name: 'Route 4', vehicle: 'Van 4' },
    })
  })

  it('gives no route to a person who is on no vehicle', async () => {
    db.assignments = db.assignments.filter((a) => a.staffId !== 24)
    loginAs(BALWAN)
    expect(await api<MyRoute>('GET', '/trips/my-route')).toEqual({ route: null })
  })

  it('is only for the attendant permission', async () => {
    loginAs(OFFICE_ADMIN)
    await expect(api('GET', '/trips/my-route')).rejects.toMatchObject({ status: 403 })
  })
})

describe('mock GET /trips/manifest', () => {
  it('has the 4 stops and 19 children of Route 4, in Hindi, with the 7:48 taps', async () => {
    loginAs(BALWAN)
    const manifest = await getManifest()
    expect(manifest).toMatchObject({
      routeId: 4,
      routeName: 'Route 4',
      vehicle: 'Van 4',
      date: day,
    })
    expect(manifest.stops.map((s) => s.name)).toEqual(['साधनवास', 'जाखल', 'कन्हेड़ी', 'टोहाना शहर'])
    expect(manifest.stops.map((s) => s.children.length)).toEqual([5, 7, 4, 3])
    const children = manifest.stops.flatMap((s) => s.children)
    expect(children).toHaveLength(19)
    expect(children.filter((c) => c.taps.BOARDED_MORNING?.outcome === 'DONE')).toHaveLength(11)
    expect(children.filter((c) => c.taps.BOARDED_MORNING?.outcome === 'ABSENT')).toHaveLength(1)
    expect(childOf(manifest, aryan)).toMatchObject({
      name: 'आर्यन',
      className: '3 B',
      taps: { BOARDED_MORNING: { outcome: 'DONE', occurredAt: `${day}T07:42:00+05:30` } },
    })
  })

  it('answers for any date the phone asks, with the same picture', async () => {
    loginAs(BALWAN)
    const next = await api<Manifest>('GET', '/trips/manifest?routeId=4&date=2026-12-01')
    expect(next.date).toBe('2026-12-01')
    expect(childOf(next, aryan)?.taps.BOARDED_MORNING?.occurredAt).toBe('2026-12-01T07:42:00+05:30')
  })

  it('refuses another route for an attendant, but not for the office', async () => {
    loginAs(BALWAN)
    await expect(api('GET', `/trips/manifest?routeId=2&date=${day}`)).rejects.toMatchObject({
      status: 403,
      code: 'NOT_YOUR_ROUTE',
    })
    loginAs(OFFICE_ADMIN)
    expect((await api<Manifest>('GET', `/trips/manifest?routeId=2&date=${day}`)).routeId).toBe(2)
  })

  it('needs routeId and date', async () => {
    loginAs(BALWAN)
    await expect(api('GET', '/trips/manifest?routeId=4')).rejects.toMatchObject({
      status: 400,
    })
  })
})

describe('mock POST /trips/marks', () => {
  it('saves a tap and shows it in the next manifest', async () => {
    loginAs(BALWAN)
    expect(await post(mark())).toEqual({
      results: [{ studentId: yash, eventType: 'BOARDED_MORNING', ok: true }],
    })
    expect(childOf(await getManifest(), yash)?.taps.BOARDED_MORNING).toEqual({
      outcome: 'DONE',
      occurredAt: `${day}T07:56:10+05:30`,
    })
  })

  it('saves the same tap twice as one', async () => {
    loginAs(BALWAN)
    await post(mark())
    const second = await post(mark())
    expect(second.results[0]?.ok).toBe(true)
    expect(db.tripTaps).toHaveLength(1)
  })

  it('ignores an older tap but still says ok', async () => {
    loginAs(BALWAN)
    await post(mark({ outcome: 'ABSENT', occurredAt: `${day}T07:58:00+05:30` }))
    const older = await post(mark({ outcome: 'DONE', occurredAt: `${day}T07:56:00+05:30` }))
    expect(older.results[0]?.ok).toBe(true)
    expect(childOf(await getManifest(), yash)?.taps.BOARDED_MORNING?.outcome).toBe('ABSENT')
  })

  it('keeps the newest tap when two arrive in one call', async () => {
    loginAs(BALWAN)
    await post(
      mark({ outcome: 'DONE', occurredAt: `${day}T07:50:00+05:30` }),
      mark({ outcome: 'ABSENT', occurredAt: `${day}T07:51:00+05:30` }),
    )
    expect(childOf(await getManifest(), yash)?.taps.BOARDED_MORNING?.outcome).toBe('ABSENT')
  })

  it('CLEARED takes the answer away, and an older tap cannot bring it back', async () => {
    loginAs(BALWAN)
    await post(mark({ studentId: aryan, outcome: 'CLEARED', occurredAt: `${day}T07:50:00+05:30` }))
    expect(childOf(await getManifest(), aryan)?.taps.BOARDED_MORNING).toBeUndefined()
  })

  it('refuses a child of another route with NOT_YOUR_ROUTE and goes on with the others', async () => {
    loginAs(BALWAN)
    const answer = await post(mark({ studentId: 2003 }), mark())
    expect(answer.results).toEqual([
      { studentId: 2003, eventType: 'BOARDED_MORNING', ok: false, error: 'NOT_YOUR_ROUTE' },
      { studentId: yash, eventType: 'BOARDED_MORNING', ok: true },
    ])
    expect(db.tripTaps).toHaveLength(1)
  })

  it('lets the office tap any route (TRIPS_RECORD_ANY)', async () => {
    loginAs(OFFICE_ADMIN)
    expect((await post(mark({ studentId: 2003 }))).results[0]?.ok).toBe(true)
    loginAs(OWNER)
    expect((await post(mark({ studentId: 3004 }))).results[0]?.ok).toBe(true)
  })

  it('refuses a wrong combination such as NOT_TRAVELLING in the morning', async () => {
    loginAs(BALWAN)
    const answer = await post(mark({ outcome: 'NOT_TRAVELLING' }))
    expect(answer.results[0]).toMatchObject({ ok: false, error: 'INVALID_TAP' })
  })

  it('answers 400 for an empty list and for more than 100', async () => {
    loginAs(BALWAN)
    await expect(post()).rejects.toBeInstanceOf(ApiError)
    await expect(post(...Array.from({ length: 101 }, () => mark()))).rejects.toMatchObject({
      status: 400,
    })
  })

  it('needs a login', async () => {
    setToken(null)
    await expect(post(mark())).rejects.toMatchObject({ status: 401 })
  })

  it('keeps the other attendant out of Route 4 (Ramesh is on Route 1)', async () => {
    loginAs(RAMESH)
    expect((await post(mark())).results[0]).toMatchObject({ ok: false, error: 'NOT_YOUR_ROUTE' })
  })
})
