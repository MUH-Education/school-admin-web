import { api, setToken } from '@/api/client'
import type {
  AttentionItem,
  BusDetailAnswer,
  BusPhase,
  BusStatusAnswer,
} from '@/features/busStatus/types'

function loginAs(userId: number): void {
  setToken(`mock-token-${userId}`)
}
const OWNER = 1
const TRANSPORT = 3
const ADMISSIONS = 4

const sum = (numbers: number[]) => numbers.reduce((a, b) => a + b, 0)

describe('mock bus status: the 7:48 picture of Main.dc.html', () => {
  it('has nine routes with the states of the design', async () => {
    loginAs(OWNER)
    const answer = await api<BusStatusAnswer>('GET', '/bus-status')
    expect(answer.phase).toBe('MORNING')
    expect(answer.asOf).toBe('2026-10-07T02:18:00.000Z')
    expect(answer.routes.map((r) => r.state)).toEqual([
      'ON_THE_WAY',
      'REACHED_SCHOOL',
      'NO_TAPS',
      'ON_THE_WAY',
      'LATE',
      'ON_THE_WAY',
      'REACHED_SCHOOL',
      'ON_THE_WAY',
      'NOT_STARTED',
    ])
    expect(sum(answer.routes.map((r) => r.boarded))).toBe(118)
    expect(sum(answer.routes.map((r) => r.total))).toBe(255)
    expect(sum(answer.routes.map((r) => r.absent))).toBe(9)
  })

  it('takes name, vehicle and attendant from the vehicle and staff data', async () => {
    loginAs(OWNER)
    const { routes } = await api<BusStatusAnswer>('GET', '/bus-status')
    const route4 = routes.find((r) => r.routeId === 4)
    expect(route4).toMatchObject({
      name: 'Route 4',
      vehicle: 'Van 4',
      vehicleType: 'SMALL_VAN',
      seats: 14,
      attendant: 'Balwan',
      boarded: 11,
      absent: 1,
      total: 19,
    })
    expect(route4?.stops.map((s) => [s.name, s.state, s.tappedAt])).toEqual([
      ['Sadhanwas', 'DONE', '07:26'],
      ['Jakhal', 'DONE', '07:42'],
      ['Kanheri', 'NEXT', null],
      ['Tohana town', 'LATER', null],
    ])
    expect(routes.find((r) => r.routeId === 8)).toMatchObject({ vehicle: 'Bus 8', seats: 26 })
  })

  it('says what needs attention, with the server text', async () => {
    loginAs(OWNER)
    const items = await api<AttentionItem[]>('GET', '/bus-status/attention')
    expect(items).toEqual([
      {
        routeId: 3,
        kind: 'NO_TAPS',
        title: 'Route 3 has no taps yet',
        message:
          'The first stop, Pirthala, was due at 7:15. That is 33 minutes ago. Attendant: Mahender.',
      },
      {
        routeId: 5,
        kind: 'LATE',
        title: 'Route 5 is running 16 minutes late',
        message: 'Samain was due at 7:24 and was tapped at 7:40. Four stops are still left.',
      },
    ])
  })

  it('gives the 19 children of Route 4 with four events each', async () => {
    loginAs(OWNER)
    const detail = await api<BusDetailAnswer>('GET', '/bus-status/routes/4')
    expect(detail.children).toHaveLength(19)
    expect(detail.fitnessValidTill).toBe('2027-03-31')
    const pooja = detail.children.find((c) => c.name === 'Pooja')
    expect(pooja?.events.boardedMorning.status).toBe('ABSENT')
    const mohit = detail.children.find((c) => c.name === 'Mohit')
    expect(mohit?.events.boardedMorning).toEqual({
      status: 'DONE',
      at: '2026-10-07T07:26:00+05:30',
    })
    expect(mohit?.events.reachedHome.status).toBe('LATER')
    expect(
      detail.children.filter((c) => c.events.boardedMorning.status === 'WAITING'),
    ).toHaveLength(7)
  })

  it.each([1, 2, 3, 5, 6, 7, 8, 9])(
    'the children of route %i add up to its numbers',
    async (id) => {
      loginAs(OWNER)
      const { route, children } = await api<BusDetailAnswer>('GET', `/bus-status/routes/${id}`)
      const count = (status: string) =>
        children.filter((c) => c.events.boardedMorning.status === status).length
      expect(children).toHaveLength(route.total)
      expect(count('DONE')).toBe(route.boarded)
      expect(count('ABSENT')).toBe(route.absent)
      expect(count('WAITING')).toBe(route.total - route.boarded - route.absent)
    },
  )
})

describe('mock bus status: evening and other answers', () => {
  it('?phase=EVENING gives some boarding, some on the way and one child missing', async () => {
    loginAs(OWNER)
    const answer = await api<BusStatusAnswer>('GET', '/bus-status?phase=EVENING')
    expect(answer.phase).toBe('EVENING')
    const states = new Set(answer.routes.map((r) => r.state))
    expect(states).toEqual(new Set(['DONE', 'ON_THE_WAY', 'NOT_STARTED', 'LATE']))
    expect(answer.routes.find((r) => r.routeId === 5)?.startsAt).toBe('15:20')
    const items = await api<AttentionItem[]>('GET', '/bus-status/attention?phase=EVENING')
    expect(items.map((i) => i.kind)).toEqual(['LATE', 'CHILD_MISSING'])
    expect(items[1]?.routeId).toBe(6)
  })

  it.each<BusPhase>(['EVENING', 'AT_SCHOOL'])('detail also adds up for %s', async (phase) => {
    loginAs(OWNER)
    for (let id = 1; id <= 9; id++) {
      const { route, children } = await api<BusDetailAnswer>(
        'GET',
        `/bus-status/routes/${id}?phase=${phase}`,
      )
      expect(children).toHaveLength(route.total)
    }
  })

  it('refuses a wrong phase, an unknown route, and people without the permission', async () => {
    loginAs(OWNER)
    await expect(api('GET', '/bus-status?phase=NIGHT')).rejects.toMatchObject({ status: 400 })
    await expect(api('GET', '/bus-status/routes/99')).rejects.toMatchObject({ status: 404 })
    loginAs(ADMISSIONS)
    await expect(api('GET', '/bus-status')).rejects.toMatchObject({ status: 403 })
    await expect(api('GET', '/bus-status/attention')).rejects.toMatchObject({ status: 403 })
    loginAs(TRANSPORT)
    await expect(api('GET', '/bus-status')).resolves.toBeTruthy()
  })
})
