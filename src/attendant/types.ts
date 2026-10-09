// The shapes of the phone app. docs/backend/api.md names the three calls and shows the body of
// POST /trips/marks. The other shapes are my guess: see docs/08-decisions.md, part D, Phase 5.

/** The four events of a day, in order. */
export type EventType = 'BOARDED_MORNING' | 'REACHED_SCHOOL' | 'BOARDED_EVENING' | 'REACHED_HOME'

export const eventTypes: EventType[] = [
  'BOARDED_MORNING',
  'REACHED_SCHOOL',
  'BOARDED_EVENING',
  'REACHED_HOME',
]

/** `CLEARED` takes a wrong tap back. `NOT_TRAVELLING` is for the evening only. */
export type Outcome = 'DONE' | 'ABSENT' | 'NOT_TRAVELLING' | 'CLEARED'

/** An answer that is shown on a button. CLEARED means "no answer", so it is not one of them. */
export type AnswerOutcome = Exclude<Outcome, 'CLEARED'>

/** What the server already knows about one event of one child. */
export interface ServerAnswer {
  outcome: AnswerOutcome
  /** ISO text with the phone's time, for example 2026-10-07T07:42:10+05:30 */
  occurredAt: string
}

export interface ManifestChild {
  studentId: number
  name: string
  /** For example "3 B", "UKG" */
  className: string
  /** Taps so far, by event. An event without an entry has no answer. */
  taps: Partial<Record<EventType, ServerAnswer>>
}

export interface ManifestStop {
  id: number
  name: string
  children: ManifestChild[]
}

/** GET /trips/manifest?routeId=&date= . Stops are in morning order. */
export interface Manifest {
  routeId: number
  routeName: string
  vehicle: string
  /** The service day, for example 2026-10-07 */
  date: string
  /** School starts, for example "08:10" */
  schoolStarts: string
  /** School ends, for example "14:40" */
  schoolEnds: string
  stops: ManifestStop[]
}

/** GET /trips/my-route . `route` is null when the attendant is on no vehicle today. */
export interface MyRoute {
  route: { id: number; name: string; vehicle: string } | null
}

/** One tap as the phone keeps it until the server confirms it. */
export interface Tap {
  /** Random. Tells the sync loop whether the tap it sent is still the one in the queue. */
  id: string
  studentId: number
  eventType: EventType
  outcome: Outcome
  serviceDate: string
  /** The phone's time at the moment of the tap. Never the time of sending. */
  occurredAt: string
  /** How many times the tap was handed to the network. 0: the server cannot have it. */
  tries: number
}

/** The part of a Tap that goes to the server. */
export type TapBody = Pick<
  Tap,
  'studentId' | 'eventType' | 'outcome' | 'serviceDate' | 'occurredAt'
>

export interface MarksRequest {
  marks: TapBody[]
}

/** One result per tap, in the same order. */
export interface MarkResult {
  studentId: number
  eventType: EventType
  ok: boolean
  /** Only when ok is false, for example NOT_YOUR_ROUTE */
  error?: string
}

export interface MarksResponse {
  results: MarkResult[]
}

/** A tap the server refused. It is not sent again; the attendant reads it and clears the list. */
export interface TapProblem extends Tap {
  error: string
  /** The child's name at the time, because tomorrow's manifest may not hold the child. */
  name: string
}
