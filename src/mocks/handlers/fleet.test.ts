import { api, setToken } from '@/api/client'
import type { LoadBoardRow, Route, Settings } from '@/features/routes/types'
import type {
  Assignment,
  AttentionItem,
  Staff,
  Vehicle,
  VehicleDetail,
} from '@/features/vehicles/types'

function loginAs(userId: number): void {
  setToken(`mock-token-${userId}`)
}
const OWNER = 1
const OFFICE_ADMIN = 2
const ADMISSIONS = 4

describe('mock vehicles, staff and routes', () => {
  it('has 9 vehicles, 19 people and 9 routes with 255 children', async () => {
    loginAs(OWNER)
    expect(await api<Vehicle[]>('GET', '/vehicles')).toHaveLength(9)
    expect(await api<Staff[]>('GET', '/staff')).toHaveLength(19)
    const board = await api<LoadBoardRow[]>('GET', '/routes/load-board')
    expect(board).toHaveLength(9)
    expect(board.reduce((sum, r) => sum + r.children, 0)).toBe(255)
    expect(board.reduce((sum, r) => sum + r.seats, 0)).toBe(150)
  })

  it('counts Route 4 as in the design', async () => {
    loginAs(OWNER)
    const board = await api<LoadBoardRow[]>('GET', '/routes/load-board')
    const route4 = board.find((r) => r.name === 'Route 4')
    expect(route4).toMatchObject({
      children: 19,
      seats: 14,
      load: 1.36,
      overBy: 5,
      yearlyCost: 333300,
      feeGot: 158840,
      surplus: -174460,
      verdict: 'OVER',
    })
  })

  it('lists ended papers before ending ones', async () => {
    loginAs(OWNER)
    const items = await api<AttentionItem[]>('GET', '/vehicles/attention')
    expect(items.map((i) => [i.subject, i.status, i.daysLeft])).toEqual([
      ['Bus 9', 'ENDED', -7],
      ['Van 6', 'ENDING', 21],
      ['Driver Krishan', 'ENDING', 26],
    ])
  })

  it('refuses roles without permission', async () => {
    loginAs(ADMISSIONS)
    await expect(api('GET', '/vehicles')).rejects.toMatchObject({ status: 403 })
    loginAs(OFFICE_ADMIN)
    expect(await api<Vehicle[]>('GET', '/vehicles')).toHaveLength(9)
    await expect(api('POST', '/vehicles', {})).rejects.toMatchObject({ status: 403 })
    await expect(api('PUT', '/settings', {})).rejects.toMatchObject({ status: 403 })
  })

  it('checks a new vehicle and shows it in the next GET', async () => {
    loginAs(OWNER)
    await expect(
      api('POST', '/vehicles', {
        name: 'Van 10',
        registrationNo: 'HR 23 XX 1110',
        vehicleType: 'SMALL_VAN',
        seats: 0,
        monthlyCost: 1000,
      }),
    ).rejects.toMatchObject({ status: 400, fields: { seats: expect.any(String) } })
    await api('POST', '/vehicles', {
      name: 'Van 10',
      registrationNo: 'HR 23 XX 1110',
      vehicleType: 'SMALL_VAN',
      seats: 14,
      monthlyCost: 30300,
      ownedBy: 'SCHOOL',
    })
    expect(await api<Vehicle[]>('GET', '/vehicles')).toHaveLength(10)
  })

  it('does not remove a vehicle that runs a route', async () => {
    loginAs(OWNER)
    await expect(api('DELETE', '/vehicles/4')).rejects.toMatchObject({
      status: 409,
      code: 'VEHICLE_IN_USE',
    })
  })

  it('changes a driver for some days, then the old driver is back', async () => {
    loginAs(OWNER)
    const detail = await api<VehicleDetail>('POST', '/vehicles/4/assignments', {
      duty: 'DRIVER',
      staffId: 10,
      fromDate: '2026-10-07',
      toDate: '2026-10-16',
      temporary: true,
      reason: 'ON_LEAVE',
    })
    const driver = detail.people.find((p) => p.duty === 'DRIVER')
    expect(driver).toMatchObject({ name: 'Surender', toDate: '2026-10-16', thenBack: 'Jagdish' })
    const history = await api<Assignment[]>('GET', '/vehicles/4/assignments')
    expect(history[0]).toMatchObject({ staffName: 'Surender', temporary: true })
  })

  it('moves the driver for good and ends the old assignment', async () => {
    loginAs(OWNER)
    const detail = await api<VehicleDetail>('POST', '/vehicles/4/assignments', {
      duty: 'DRIVER',
      staffId: 10,
      fromDate: '2026-10-07',
      temporary: false,
      reason: 'LEFT_SCHOOL',
    })
    expect(detail.people.find((p) => p.duty === 'DRIVER')).toMatchObject({
      name: 'Surender',
      toDate: null,
    })
    const history = await api<Assignment[]>('GET', '/vehicles/4/assignments')
    expect(history.find((a) => a.staffName === 'Jagdish' && a.toDate === '2026-10-06')).toBeTruthy()
  })

  it('returns STAFF_BUSY, WRONG_STAFF_TYPE and LICENCE_ENDED', async () => {
    loginAs(OWNER)
    const base = { duty: 'DRIVER', fromDate: '2026-10-12', temporary: false, reason: 'OTHER' }
    await expect(
      api('POST', '/vehicles/4/assignments', { ...base, staffId: 1 }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'STAFF_BUSY',
      message: 'Rajpal drives Van 1 on these days.',
    })
    await expect(
      api('POST', '/vehicles/4/assignments', { ...base, staffId: 21 }),
    ).rejects.toMatchObject({ code: 'WRONG_STAFF_TYPE' })
    await expect(
      api('POST', '/vehicles/4/assignments', {
        ...base,
        staffId: 7,
        fromDate: '2026-11-10',
        temporary: false,
      }),
    ).rejects.toMatchObject({ code: 'LICENCE_ENDED' })
  })

  it('keeps a person on a vehicle: delete is refused', async () => {
    loginAs(OWNER)
    await expect(api('DELETE', '/staff/4')).rejects.toMatchObject({ status: 409 })
    await api('DELETE', '/staff/10')
    expect(await api<Staff[]>('GET', '/staff')).toHaveLength(18)
  })

  it('saves the stops in the order sent and keeps the children counts', async () => {
    loginAs(OWNER)
    const before = await api<Route>('GET', '/routes/4')
    const [sadhanwas, jakhal, kanheri, tohana] = before.stops.map((s) => s.id)
    const route = await api<Route>('PUT', '/routes/4/stops', [
      { id: jakhal, name: 'Jakhal', morningTime: '07:40' },
      { id: sadhanwas, name: 'Sadhanwas', morningTime: '07:25' },
      { id: kanheri, name: 'Kanheri', morningTime: '07:55' },
      { id: tohana, name: 'Tohana town', morningTime: '08:02' },
      { name: 'New stop', morningTime: '08:10' },
    ])
    expect(route.stops.map((s) => [s.name, s.children])).toEqual([
      ['Jakhal', 7],
      ['Sadhanwas', 5],
      ['Kanheri', 4],
      ['Tohana town', 3],
      ['New stop', 0],
    ])
  })

  it('refuses to drop a stop that has children', async () => {
    loginAs(OWNER)
    const before = await api<Route>('GET', '/routes/4')
    const first = before.stops[0]
    await expect(
      api('PUT', '/routes/4/stops', [{ id: first?.id, name: 'Sadhanwas', morningTime: '07:25' }]),
    ).rejects.toMatchObject({ status: 409, code: 'STOP_HAS_STUDENTS' })
  })

  it('refuses a vehicle that already has a route, and a route that has children', async () => {
    loginAs(OWNER)
    await expect(api('POST', '/routes', { name: 'Route 10', vehicleId: 4 })).rejects.toMatchObject({
      code: 'VEHICLE_HAS_ROUTE',
    })
    await expect(api('DELETE', '/routes/4')).rejects.toMatchObject({ code: 'ROUTE_HAS_STUDENTS' })
    const created = await api<Route>('POST', '/routes', { name: 'Route 10', vehicleId: null })
    await api('DELETE', `/routes/${created.id}`)
    expect(await api<Route[]>('GET', '/routes')).toHaveLength(9)
  })

  it('counts costs again when settings change', async () => {
    loginAs(OWNER)
    const settings = await api<Settings>('GET', '/settings')
    expect(settings).toEqual({ busMonths: 11, busFeePerChild: 8800, feeCollectedPercent: 95 })
    await expect(api('PUT', '/settings', { ...settings, busMonths: 0 })).rejects.toMatchObject({
      status: 400,
      fields: { busMonths: expect.any(String) },
    })
    await api('PUT', '/settings', { ...settings, busMonths: 10 })
    const board = await api<LoadBoardRow[]>('GET', '/routes/load-board')
    expect(board.find((r) => r.name === 'Route 4')?.yearlyCost).toBe(303000)
  })
})
