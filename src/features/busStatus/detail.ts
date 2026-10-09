import type { BusChildRow, BusPhase, BusStatusRoute, BusStop, ChildEvent } from './types'

/** Which event tells "did the child get on the bus" in this part of the day? */
function boardingEvent(phase: BusPhase, child: BusChildRow): ChildEvent {
  return phase === 'EVENING' ? child.events.boardedEvening : child.events.boardedMorning
}

export interface StopCounts {
  boarded: number
  absent: number
  waiting: number
}

/** "5 boarded, 0 absent" and "4 children waiting" for one stop, counted from the children. */
export function countAtStop(
  children: BusChildRow[],
  stopName: string,
  phase: BusPhase,
): StopCounts {
  const here = children.filter((c) => c.stop === stopName).map((c) => boardingEvent(phase, c))
  return {
    boarded: here.filter((e) => e.status === 'DONE').length,
    absent: here.filter((e) => e.status === 'ABSENT' || e.status === 'NOT_TRAVELLING').length,
    waiting: here.filter((e) => e.status === 'WAITING').length,
  }
}

/** The stop the bus is going to, or null when there is none. */
export function nextStopOf(route: BusStatusRoute): BusStop | null {
  return route.stops.find((s) => s.state === 'NEXT') ?? null
}

/** The stop that was tapped last, or null before the first tap. */
export function lastTapOf(route: BusStatusRoute): BusStop | null {
  return [...route.stops].reverse().find((s) => s.state === 'DONE' && s.tappedAt) ?? null
}
