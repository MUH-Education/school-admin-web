import type {
  AttentionItem,
  BusChildEvents,
  BusChildRow,
  BusDetailAnswer,
  BusPhase,
  BusStatusAnswer,
  BusStatusRoute,
  BusStop,
  ChildEvent,
  EventStatus,
} from '@/features/busStatus/types'
import { formatDayClock } from '@/lib/format'
import {
  classNames,
  eveningParts,
  firstNames,
  lastNames,
  morningSpecs,
  route4Children,
  type RouteSpec,
  type SpecStop,
} from './data/busStatus'
import { db } from './db'
import { childSms } from './messageRules'
import { holderOn, staffById } from './fleetLogic'
import { MOCK_NOW, MOCK_TODAY } from './now'

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']

/** "07:42" on a day → ISO text in Indian time. */
function at(hhmm: string): string {
  return `${MOCK_TODAY}T${hhmm}:00+05:30`
}

/** Without `?phase=` the server picks by the time of day. In the mock it is 7:48 am: morning. */
export function defaultPhase(): BusPhase {
  const hour = Number(
    MOCK_NOW.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }),
  )
  if (hour >= 14) return 'EVENING'
  return 'MORNING'
}

export function parsePhase(raw: string | null): BusPhase | null | 'BAD' {
  if (raw === null || raw === '') return null
  return raw === 'MORNING' || raw === 'AT_SCHOOL' || raw === 'EVENING' ? raw : 'BAD'
}

/** The evening picture, built from the morning stops: same places, afternoon times. */
function eveningSpec(morning: RouteSpec): RouteSpec | null {
  const part = eveningParts.find((p) => p.routeId === morning.routeId)
  if (!part) return null
  const stops: SpecStop[] = morning.stops.map((stop, index) => {
    const minutes = 15 * 60 + 35 + index * 8
    const due = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    if (index < part.stopsDone) return { name: stop.name, due, tappedAt: due, state: 'DONE' }
    return { name: stop.name, due, state: index === part.stopsDone ? 'NEXT' : 'LATER' }
  })
  const started = part.state !== 'NOT_STARTED'
  return {
    routeId: morning.routeId,
    state: part.state,
    lateMinutes: part.lateMinutes,
    startsAt: part.startsAt,
    boarded: part.boarded,
    absent: part.absent,
    total: morning.total,
    stops,
    school: { due: '15:30', reachedAt: started ? '15:30' : null },
  }
}

function specFor(routeId: number, phase: BusPhase): RouteSpec | null {
  const morning = morningSpecs.find((s) => s.routeId === routeId)
  if (!morning) return null
  return phase === 'EVENING' ? eveningSpec(morning) : morning
}

function toStop(stop: SpecStop): BusStop {
  return {
    name: stop.name,
    due: stop.due,
    tappedAt: stop.tappedAt ?? null,
    state: stop.state,
    ...(stop.late ? { late: true } : {}),
  }
}

/** Name, vehicle and attendant come from the Phase 2 data, so a change there shows here. */
function toRoute(spec: RouteSpec, phase: BusPhase): BusStatusRoute | null {
  const route = db.routes.find((r) => r.id === spec.routeId && r.active)
  if (!route) return null
  const vehicle = db.vehicles.find((v) => v.id === route.vehicleId)
  const holder = vehicle ? holderOn(vehicle.id, 'ATTENDANT', MOCK_TODAY) : undefined
  return {
    routeId: route.id,
    name: route.name,
    vehicle: vehicle?.name ?? '',
    vehicleType: vehicle?.vehicleType ?? 'SMALL_VAN',
    seats: vehicle?.seats ?? 0,
    attendant: (holder && staffById(holder.staffId)?.name) ?? '',
    phase,
    state: spec.state,
    lateMinutes: spec.lateMinutes,
    startsAt: spec.startsAt,
    boarded: spec.boarded,
    absent: spec.absent,
    total: spec.total,
    stops: spec.stops.map(toStop),
    school: { ...spec.school },
  }
}

function asOf(phase: BusPhase): string {
  return phase === 'EVENING' ? at('15:32') : MOCK_NOW.toISOString()
}

export function busStatusAnswer(phase: BusPhase): BusStatusAnswer {
  const routes = morningSpecs.flatMap((spec) => {
    const specForPhase = specFor(spec.routeId, phase)
    const route = specForPhase ? toRoute(specForPhase, phase) : null
    return route ? [route] : []
  })
  return { date: MOCK_TODAY, asOf: asOf(phase), phase, routes }
}

export function routeStatus(routeId: number, phase: BusPhase): BusStatusRoute | null {
  const spec = specFor(routeId, phase)
  return spec ? toRoute(spec, phase) : null
}

// ---- Children of one route ----

/** A child before the SMS state is added. */
export type ChildRowBase = Omit<BusChildRow, 'sms'>

const doneEvent = (hhmm: string): ChildEvent => ({ status: 'DONE', at: at(hhmm) })
const plain = (status: EventStatus): ChildEvent => ({ status, at: null })

function childName(index: number): string {
  const first = firstNames[index % firstNames.length]
  const last = lastNames[Math.floor(index / firstNames.length) % lastNames.length]
  return `${first} ${last}`
}

/** The 19 children of Route 4 as drawn, with the four events for any phase. */
function route4Rows(route: BusStatusRoute): ChildRowBase[] {
  if (route.phase !== 'EVENING') {
    return route4Children.map((child, index) => ({
      studentId: 400 + index,
      name: child.name,
      className: child.className,
      stop: child.stop,
      events: {
        boardedMorning:
          child.morning === 'ABSENT' || child.morning === 'WAITING'
            ? plain(child.morning)
            : doneEvent(child.morning),
        reachedSchool: plain('LATER'),
        boardedEvening: plain('LATER'),
        reachedHome: plain('LATER'),
      },
    }))
  }
  return generatedRows(route)
}

/**
 * Children for the routes that have no drawing. Stops that are done hold the boarded and the
 * absent children; the other stops hold the ones still waiting. Numbers match the route.
 */
function generatedRows(route: BusStatusRoute): ChildRowBase[] {
  const evening = route.phase === 'EVENING'
  const doneStops = route.stops.filter((s) => s.state === 'DONE')
  const openStops = route.stops.filter((s) => s.state !== 'DONE')
  const waiting = route.total - route.boarded - route.absent
  const rows: ChildRowBase[] = []
  const add = (stop: BusStop, kind: 'BOARDED' | 'ABSENT' | 'WAITING') => {
    const index = rows.length
    const school = route.state === 'REACHED_SCHOOL' ? route.school.reachedAt : null
    let events: BusChildEvents
    if (!evening) {
      events = {
        boardedMorning:
          kind === 'BOARDED'
            ? doneEvent(stop.tappedAt ?? stop.due)
            : plain(kind === 'ABSENT' ? 'ABSENT' : 'WAITING'),
        reachedSchool: kind === 'BOARDED' && school ? doneEvent(school) : plain('LATER'),
        boardedEvening: plain('LATER'),
        reachedHome: plain('LATER'),
      }
    } else {
      const travelling = kind !== 'ABSENT'
      events = {
        boardedMorning: travelling ? doneEvent('07:30') : plain('ABSENT'),
        reachedSchool: travelling ? doneEvent('07:50') : plain('ABSENT'),
        boardedEvening:
          kind === 'BOARDED'
            ? doneEvent('15:10')
            : plain(kind === 'ABSENT' ? 'NOT_TRAVELLING' : 'WAITING'),
        reachedHome:
          kind === 'BOARDED' && stop.state === 'DONE'
            ? doneEvent(stop.tappedAt ?? stop.due)
            : plain('LATER'),
      }
    }
    rows.push({
      studentId: route.routeId * 1000 + index,
      name: childName(route.routeId * 7 + index),
      className: classNames[(route.routeId * 3 + index) % classNames.length] ?? '1 A',
      stop: stop.name,
      events,
    })
  }

  if (!evening) {
    for (let i = 0; i < route.boarded; i++) add(doneStops[i % doneStops.length]!, 'BOARDED')
    for (let i = 0; i < route.absent; i++) add(doneStops[i % doneStops.length]!, 'ABSENT')
    for (let i = 0; i < waiting; i++) add(openStops[i % openStops.length]!, 'WAITING')
  } else {
    // A child at a stop the bus has left must have boarded. Others spread over all stops.
    const all = route.stops
    for (let i = 0; i < route.boarded; i++) add(all[i % all.length]!, 'BOARDED')
    const pending = openStops.length > 0 ? openStops : all
    for (let i = 0; i < route.absent; i++) add(pending[i % pending.length]!, 'ABSENT')
    for (let i = 0; i < waiting; i++) add(pending[i % pending.length]!, 'WAITING')
  }
  return rows
}

export function detailAnswer(routeId: number, phase: BusPhase): BusDetailAnswer | null {
  const route = routeStatus(routeId, phase)
  if (!route) return null
  const vehicle = db.vehicles.find((v) => v.name === route.vehicle)
  const base = routeId === 4 ? route4Rows(route) : generatedRows(route)
  const children: BusChildRow[] = base.map((child) => ({
    ...child,
    sms: childSms(child.studentId, child.className, child.events),
  }))
  return {
    date: MOCK_TODAY,
    asOf: asOf(phase),
    route,
    fitnessValidTill: vehicle?.papers.FITNESS ?? null,
    children,
  }
}

// ---- Needs attention ----

function minutesText(n: number): string {
  return `${n} minute${n === 1 ? '' : 's'}`
}

export function attentionItems(phase: BusPhase): AttentionItem[] {
  const items: AttentionItem[] = []
  for (const route of busStatusAnswer(phase).routes) {
    if (route.state === 'NO_TAPS') {
      const first = route.stops[0]
      if (!first) continue
      items.push({
        routeId: route.routeId,
        kind: 'NO_TAPS',
        title: `${route.name} has no taps yet`,
        message: `The first stop, ${first.name}, was due at ${formatDayClock(first.due)}. That is ${minutesText(route.lateMinutes)} ago. Attendant: ${route.attendant}.`,
      })
    }
    if (route.state === 'LATE') {
      const lateStop = [...route.stops].reverse().find((s) => s.late && s.tappedAt)
      const left = route.stops.filter((s) => s.state !== 'DONE').length
      items.push({
        routeId: route.routeId,
        kind: 'LATE',
        title: `${route.name} is running ${minutesText(route.lateMinutes)} late`,
        message: lateStop
          ? `${lateStop.name} was due at ${formatDayClock(lateStop.due)} and was tapped at ${formatDayClock(lateStop.tappedAt ?? '')}. ${NUMBER_WORDS[left] ?? left} stops are still left.`
          : `${NUMBER_WORDS[left] ?? left} stops are still left.`,
      })
    }
    if (phase === 'EVENING' && route.state !== 'NOT_STARTED') {
      const missing = route.total - route.boarded - route.absent
      if (missing > 0) {
        const who = generatedRows(route).find((r) => r.events.boardedEvening.status === 'WAITING')
        items.push({
          routeId: route.routeId,
          kind: 'CHILD_MISSING',
          title: `${who?.name ?? 'A child'} is not on the ${route.name} bus`,
          message: `${who?.name ?? 'A child'} (${who?.className ?? ''}) has not been tapped on the evening bus. Attendant: ${route.attendant}.`,
        })
      }
    }
  }
  return items
}
