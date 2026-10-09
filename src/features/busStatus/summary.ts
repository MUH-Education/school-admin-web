import type { BusStatusRoute } from './types'

export interface FleetSummary {
  buses: number
  onTheWay: number
  reached: number
  boarded: number
  total: number
  absent: number
  needAttention: number
}

/** The five tiles are counted from the route list (behaviour 5). A late bus is still on the way. */
export function summarise(routes: BusStatusRoute[]): FleetSummary {
  const count = (states: BusStatusRoute['state'][]) =>
    routes.filter((r) => states.includes(r.state)).length
  const sum = (pick: (r: BusStatusRoute) => number) =>
    routes.reduce((total, r) => total + pick(r), 0)
  return {
    buses: routes.length,
    onTheWay: count(['ON_THE_WAY', 'LATE']),
    reached: count(['REACHED_SCHOOL', 'DONE']),
    boarded: sum((r) => r.boarded),
    total: sum((r) => r.total),
    absent: sum((r) => r.absent),
    needAttention: count(['NO_TAPS', 'LATE']),
  }
}
