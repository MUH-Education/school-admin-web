import type { BusStatusRoute } from '@/features/busStatus/types'

/** Route 4 at 7:48 am, as in Main.dc.html. Change what a test needs. */
export function makeRoute(change: Partial<BusStatusRoute> = {}): BusStatusRoute {
  return {
    routeId: 4,
    name: 'Route 4',
    vehicle: 'Van 4',
    vehicleType: 'SMALL_VAN',
    seats: 14,
    attendant: 'Balwan',
    phase: 'MORNING',
    state: 'ON_THE_WAY',
    lateMinutes: 0,
    startsAt: null,
    boarded: 11,
    absent: 1,
    total: 19,
    stops: [
      { name: 'Sadhanwas', due: '07:25', tappedAt: '07:26', state: 'DONE' },
      { name: 'Jakhal', due: '07:40', tappedAt: '07:42', state: 'DONE' },
      { name: 'Kanheri', due: '07:55', tappedAt: null, state: 'NEXT' },
      { name: 'Tohana town', due: '08:02', tappedAt: null, state: 'LATER' },
    ],
    school: { due: '08:10', reachedAt: null },
    ...change,
  }
}
