// Shapes of /bus-status. docs/backend/api.md gives one route of GET /bus-status; the rest is my
// guess (see docs/08-decisions.md, part D, 9 Oct 2026).
import type { ChildSms } from '@/features/messages/types'
import type { VehicleType } from '@/features/vehicles/types'

/** The three choices on the switch. Without `?phase=` the server picks by the time of day. */
export type BusPhase = 'MORNING' | 'AT_SCHOOL' | 'EVENING'

/** `DONE` square filled; `NEXT` blue border; `LATER` grey border. */
export type StopState = 'DONE' | 'NEXT' | 'LATER'

/** `DONE` is the evening state when every child is home. */
export type RouteState =
  'NOT_STARTED' | 'ON_THE_WAY' | 'LATE' | 'NO_TAPS' | 'REACHED_SCHOOL' | 'DONE'

export interface BusStop {
  name: string
  /** "07:25" */
  due: string
  /** "07:26"; null until the attendant taps the stop. */
  tappedAt: string | null
  state: StopState
  /** The server decides if a tap was late. The web app does not repeat that rule. */
  late?: boolean
}

/** The last square of the strip. */
export interface SchoolStop {
  /** "08:10" */
  due: string
  /** "07:46"; null while the bus is not there yet. */
  reachedAt: string | null
}

/** One route in GET /bus-status. */
export interface BusStatusRoute {
  routeId: number
  name: string
  /** For example "Van 4". */
  vehicle: string
  vehicleType: VehicleType
  seats: number
  attendant: string
  phase: BusPhase
  state: RouteState
  /** Minutes behind. Also set for NO_TAPS (minutes since the first stop was due). */
  lateMinutes: number
  /** "07:50", only for NOT_STARTED. */
  startsAt: string | null
  boarded: number
  absent: number
  total: number
  stops: BusStop[]
  school: SchoolStop
}

/** The answer of GET /bus-status?phase=. */
export interface BusStatusAnswer {
  /** The day shown, "2026-10-07". */
  date: string
  /** The server's time of this answer, ISO text. The page shows it as "updated 7:48 am". */
  asOf: string
  phase: BusPhase
  routes: BusStatusRoute[]
}

export type AttentionKind = 'NO_TAPS' | 'LATE' | 'CHILD_MISSING'

/** One problem in GET /bus-status/attention. The text is written by the server. */
export interface AttentionItem {
  routeId: number
  kind: AttentionKind
  /** "Route 3 has no taps yet" */
  title: string
  /** "The first stop, Pirthala, was due at 7:15. That is 33 minutes ago. Attendant: Mahender." */
  message: string
}

/**
 * One of the four events of a child's day.
 * `DONE` has a time; `ABSENT` and `NOT_TRAVELLING` are final; `WAITING` is due now;
 * `LATER` has not come yet.
 */
export type EventStatus = 'DONE' | 'ABSENT' | 'NOT_TRAVELLING' | 'WAITING' | 'LATER'

export interface ChildEvent {
  status: EventStatus
  /** ISO time of the tap. Only when `status` is DONE. */
  at: string | null
}

export interface BusChildEvents {
  boardedMorning: ChildEvent
  reachedSchool: ChildEvent
  boardedEvening: ChildEvent
  reachedHome: ChildEvent
}

/** One child in GET /bus-status/routes/{routeId}. */
export interface BusChildRow {
  studentId: number
  name: string
  /** "5 A" */
  className: string
  /** The stop name. */
  stop: string
  events: BusChildEvents
  /** The SMS of the newest event, for the column "SMS to parent". The server applies the class rule. */
  sms: ChildSms
}

/** The answer of GET /bus-status/routes/{routeId}. */
export interface BusDetailAnswer {
  date: string
  asOf: string
  route: BusStatusRoute
  /** The fitness certificate of the vehicle, "2027-03-31". */
  fitnessValidTill: string | null
  children: BusChildRow[]
}
