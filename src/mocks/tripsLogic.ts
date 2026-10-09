import type {
  EventType,
  Manifest,
  ManifestChild,
  ManifestStop,
  MarkResult,
  MyRoute,
  Outcome,
  TapBody,
} from '@/attendant/types'
import { eventTypes } from '@/attendant/types'
import { detailAnswer, routeStatus } from './busStatusLogic'
import { route4Children } from './data/busStatus'
import {
  hindiChildNames,
  hindiStopNames,
  route4StudentIds,
  schoolEnds,
  schoolStarts,
  type MockTapRecord,
} from './data/trips'
import { db } from './db'
import { placementOf } from './fleetLogic'
import type { MockUser } from './data/users'

const allowedOutcomes: Record<EventType, Outcome[]> = {
  BOARDED_MORNING: ['DONE', 'ABSENT', 'CLEARED'],
  REACHED_SCHOOL: ['DONE', 'CLEARED'],
  BOARDED_EVENING: ['DONE', 'NOT_TRAVELLING', 'CLEARED'],
  REACHED_HOME: ['DONE', 'CLEARED'],
}

/** Which route does a child ride? Route 4 has ids 400 to 418; the generated children are route*1000+n. */
export function routeOfStudent(studentId: number): number | null {
  if (studentId >= route4StudentIds.first && studentId <= route4StudentIds.last) return 4
  if (studentId >= 1000 && studentId < 10000) return Math.floor(studentId / 1000)
  return null
}

/** GET /trips/my-route . The attendant's route today, or none. */
export function myRouteAnswer(user: MockUser): MyRoute {
  const place = placementOf(user.staffId)
  if (!place || place.routeId === null || place.routeName === null) return { route: null }
  return { route: { id: place.routeId, name: place.routeName, vehicle: place.vehicleName } }
}

/** The route this person works on today (null: none). */
export function ownRouteId(user: MockUser): number | null {
  return placementOf(user.staffId)?.routeId ?? null
}

function at(date: string, hhmm: string): string {
  return `${date}T${hhmm}:00+05:30`
}

function route4Base(date: string): Manifest {
  const stopNames = [...new Set(route4Children.map((c) => c.stop))]
  const stops: ManifestStop[] = stopNames.map((name, index) => ({
    id: 4001 + index,
    name: hindiStopNames[name] ?? name,
    children: route4Children
      .map((child, i) => ({ child, i }))
      .filter(({ child }) => child.stop === name)
      .map(({ child, i }): ManifestChild => {
        const taps: ManifestChild['taps'] = {}
        if (child.morning === 'ABSENT') {
          taps.BOARDED_MORNING = { outcome: 'ABSENT', occurredAt: at(date, '07:43') }
        } else if (child.morning !== 'WAITING') {
          taps.BOARDED_MORNING = { outcome: 'DONE', occurredAt: at(date, child.morning) }
        }
        return {
          studentId: route4StudentIds.first + i,
          name: hindiChildNames[child.name] ?? child.name,
          className: child.className,
          taps,
        }
      }),
  }))
  return {
    routeId: 4,
    routeName: 'Route 4',
    vehicle: 'Van 4',
    date,
    schoolStarts,
    schoolEnds,
    stops,
  }
}

function otherRouteBase(routeId: number, date: string): Manifest | null {
  const route = routeStatus(routeId, 'MORNING')
  const detail = detailAnswer(routeId, 'MORNING')
  if (!route || !detail) return null
  const stops: ManifestStop[] = route.stops.map((stop, index) => ({
    id: routeId * 1000 + 100 + index,
    name: stop.name,
    children: detail.children
      .filter((child) => child.stop === stop.name)
      .map((child): ManifestChild => {
        const taps: ManifestChild['taps'] = {}
        const morning = child.events.boardedMorning
        if (morning.status === 'ABSENT') {
          taps.BOARDED_MORNING = { outcome: 'ABSENT', occurredAt: morning.at ?? at(date, '07:30') }
        } else if (morning.status === 'DONE') {
          taps.BOARDED_MORNING = { outcome: 'DONE', occurredAt: morning.at ?? at(date, '07:30') }
        }
        return { studentId: child.studentId, name: child.name, className: child.className, taps }
      }),
  }))
  return {
    routeId,
    routeName: route.name,
    vehicle: route.vehicle,
    date,
    schoolStarts,
    schoolEnds,
    stops,
  }
}

/**
 * GET /trips/manifest . The morning picture of 7:48 is the same on every date the phone asks for,
 * so the demo works on any real day. Taps that were sent to POST /trips/marks are put on top.
 */
export function manifestAnswer(routeId: number, date: string): Manifest | null {
  const base = routeId === 4 ? route4Base(date) : otherRouteBase(routeId, date)
  if (!base) return null
  for (const stop of base.stops) {
    for (const child of stop.children) {
      for (const eventType of eventTypes) {
        const saved = recordFor(date, child.studentId, eventType)
        if (!saved) continue
        if (saved.outcome === 'CLEARED') delete child.taps[eventType]
        else child.taps[eventType] = { outcome: saved.outcome, occurredAt: saved.occurredAt }
      }
    }
  }
  return base
}

function recordFor(
  date: string,
  studentId: number,
  eventType: EventType,
): MockTapRecord | undefined {
  return db.tripTaps.find(
    (r) => r.serviceDate === date && r.studentId === studentId && r.eventType === eventType,
  )
}

function isValid(mark: TapBody): boolean {
  return (
    Number.isInteger(mark.studentId) &&
    eventTypes.includes(mark.eventType) &&
    (allowedOutcomes[mark.eventType] ?? []).includes(mark.outcome) &&
    /^\d{4}-\d{2}-\d{2}$/.test(mark.serviceDate) &&
    !Number.isNaN(Date.parse(mark.occurredAt))
  )
}

/**
 * The server rules for one tap.
 * - The same tap twice is saved once.
 * - An older tap does not replace a newer one (the answer is ok, nothing changes).
 * - With TRIPS_RECORD only, a child of another route is refused: NOT_YOUR_ROUTE.
 */
export function applyMark(user: MockUser, anyRoute: boolean, mark: TapBody): MarkResult {
  const base = { studentId: mark.studentId, eventType: mark.eventType }
  if (!isValid(mark)) return { ...base, ok: false, error: 'INVALID_TAP' }
  const route = routeOfStudent(mark.studentId)
  if (route === null) return { ...base, ok: false, error: 'STUDENT_NOT_FOUND' }
  if (!anyRoute && route !== ownRouteId(user))
    return { ...base, ok: false, error: 'NOT_YOUR_ROUTE' }

  const existing = recordFor(mark.serviceDate, mark.studentId, mark.eventType)
  if (existing && Date.parse(existing.occurredAt) >= Date.parse(mark.occurredAt)) {
    return { ...base, ok: true }
  }
  const record: MockTapRecord = {
    serviceDate: mark.serviceDate,
    studentId: mark.studentId,
    eventType: mark.eventType,
    outcome: mark.outcome,
    occurredAt: mark.occurredAt,
    receivedAt: new Date().toISOString(),
  }
  if (existing) Object.assign(existing, record)
  else db.tripTaps.push(record)
  return { ...base, ok: true }
}
