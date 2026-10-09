import type { AnswerOutcome, EventType, Manifest, ManifestChild, ManifestStop, Tap } from './types'

/** One shown answer. `pending` means the tap is on the phone and the server has not confirmed it yet. */
export interface Answer {
  outcome: AnswerOutcome
  /** ISO text, the phone's time of the tap */
  at: string
  pending: boolean
}

export interface ChildView {
  studentId: number
  name: string
  className: string
  stopId: number
  stopName: string
  answers: Partial<Record<EventType, Answer>>
}

export interface StopView {
  id: number
  name: string
  children: ChildView[]
}

export interface ViewCounts {
  total: number
  pickup: { boarded: number; absent: number; waiting: number }
  /** onBus: boarded in the morning. reached: of them, those who got off at school. */
  school: { onBus: number; absent: number; reached: number }
  /** candidates: boarded in the morning. missing: of them, those with no evening answer. */
  evening: { candidates: number; boarded: number; notTravelling: number; missing: number }
  /** onBus: boarded in the evening. dropped: of them, those who got home. */
  drop: { onBus: number; dropped: number }
}

export interface ViewState {
  /** In morning order. */
  stops: StopView[]
  children: ChildView[]
  counts: ViewCounts
}

const noViewState: ViewState = {
  stops: [],
  children: [],
  counts: {
    total: 0,
    pickup: { boarded: 0, absent: 0, waiting: 0 },
    school: { onBus: 0, absent: 0, reached: 0 },
    evening: { candidates: 0, boarded: 0, notTravelling: 0, missing: 0 },
    drop: { onBus: 0, dropped: 0 },
  },
}

/**
 * What the screens show: the saved manifest, with the taps of the queue on top.
 * `today` is the phone's date. A manifest of another day (the new list did not load) shows no
 * old answers, and queue taps of another day are not shown (they are only sent).
 */
export function viewState(manifest: Manifest | null, queue: Tap[], today: string): ViewState {
  if (!manifest) return noViewState
  const manifestIsToday = manifest.date === today
  const queueOf = new Map<string, Tap>()
  for (const tap of queue) {
    if (tap.serviceDate === today) queueOf.set(`${tap.studentId}|${tap.eventType}`, tap)
  }

  const stops: StopView[] = manifest.stops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    children: stop.children.map((child) => childView(child, stop, manifestIsToday, queueOf)),
  }))
  const children = stops.flatMap((stop) => stop.children)
  return { stops, children, counts: countsOf(children) }
}

function childView(
  child: ManifestChild,
  stop: ManifestStop,
  manifestIsToday: boolean,
  queueOf: Map<string, Tap>,
): ChildView {
  const answers: ChildView['answers'] = {}
  if (manifestIsToday) {
    for (const [eventType, saved] of Object.entries(child.taps) as [
      EventType,
      NonNullable<ManifestChild['taps'][EventType]>,
    ][]) {
      answers[eventType] = { outcome: saved.outcome, at: saved.occurredAt, pending: false }
    }
  }
  for (const eventType of [
    'BOARDED_MORNING',
    'REACHED_SCHOOL',
    'BOARDED_EVENING',
    'REACHED_HOME',
  ] as const) {
    const tap = queueOf.get(`${child.studentId}|${eventType}`)
    if (!tap) continue
    if (tap.outcome === 'CLEARED') delete answers[eventType]
    else answers[eventType] = { outcome: tap.outcome, at: tap.occurredAt, pending: true }
  }
  return {
    studentId: child.studentId,
    name: child.name,
    className: child.className,
    stopId: stop.id,
    stopName: stop.name,
    answers,
  }
}

function countsOf(children: ChildView[]): ViewCounts {
  const boardedMorning = children.filter((c) => c.answers.BOARDED_MORNING?.outcome === 'DONE')
  const absentMorning = children.filter((c) => c.answers.BOARDED_MORNING?.outcome === 'ABSENT')
  const boardedEvening = children.filter((c) => c.answers.BOARDED_EVENING?.outcome === 'DONE')
  return {
    total: children.length,
    pickup: {
      boarded: boardedMorning.length,
      absent: absentMorning.length,
      waiting: children.length - boardedMorning.length - absentMorning.length,
    },
    school: {
      onBus: boardedMorning.length,
      absent: absentMorning.length,
      reached: boardedMorning.filter((c) => c.answers.REACHED_SCHOOL?.outcome === 'DONE').length,
    },
    evening: {
      candidates: boardedMorning.length,
      boarded: boardedMorning.filter((c) => c.answers.BOARDED_EVENING?.outcome === 'DONE').length,
      notTravelling: boardedMorning.filter(
        (c) => c.answers.BOARDED_EVENING?.outcome === 'NOT_TRAVELLING',
      ).length,
      missing: boardedMorning.filter((c) => !c.answers.BOARDED_EVENING).length,
    },
    drop: {
      onBus: boardedEvening.length,
      dropped: boardedEvening.filter((c) => c.answers.REACHED_HOME?.outcome === 'DONE').length,
    },
  }
}

// ---- Helpers for the pages ----

/** Children who came in the morning, for the evening list. */
export function eveningChildren(view: ViewState): ChildView[] {
  return view.children.filter((c) => c.answers.BOARDED_MORNING?.outcome === 'DONE')
}

export interface DropStop {
  id: number
  name: string
  /** Children who boarded in the evening and are on the bus for this stop. */
  children: ChildView[]
}

/** The stops of the evening: the morning order reversed, only stops that have a child on the bus. */
export function dropStops(view: ViewState): DropStop[] {
  return [...view.stops]
    .reverse()
    .map((stop) => ({
      id: stop.id,
      name: stop.name,
      children: stop.children.filter((c) => c.answers.BOARDED_EVENING?.outcome === 'DONE'),
    }))
    .filter((stop) => stop.children.length > 0)
}

/** The time of the latest tap among the answers, or null. */
export function lastTapTime(answers: (Answer | undefined)[]): string | null {
  const times = answers.flatMap((a) => (a ? [a.at] : []))
  if (times.length === 0) return null
  return times.reduce((latest, time) => (Date.parse(time) > Date.parse(latest) ? time : latest))
}

export type JobState = 'PENDING' | 'RUNNING' | 'DONE'

export interface Jobs {
  pickup: { state: JobState; done: number; total: number }
  school: { state: JobState; done: number; total: number }
  evening: { state: JobState; done: number; total: number }
  drop: { state: JobState; done: number; total: number }
  /** The job that should be done now: the first one that is not done. Null when all four are. */
  current: 'pickup' | 'school' | 'evening' | 'drop' | null
}

function stateOf(done: number, total: number, started: boolean): JobState {
  if (total > 0 && done >= total) return 'DONE'
  return started ? 'RUNNING' : 'PENDING'
}

/** The four job cards of the Today page. */
export function jobsOf(view: ViewState): Jobs {
  const c = view.counts
  const answeredMorning = c.pickup.boarded + c.pickup.absent
  const pickup = {
    done: c.pickup.boarded,
    total: c.total,
    state: stateOf(answeredMorning, c.total, answeredMorning > 0),
  }
  const school = {
    done: c.school.reached,
    total: c.school.onBus,
    state: stateOf(c.school.reached, c.school.onBus, c.school.reached > 0),
  }
  const answeredEvening = c.evening.boarded + c.evening.notTravelling
  const evening = {
    done: c.evening.boarded,
    total: c.evening.candidates,
    state: stateOf(answeredEvening, c.evening.candidates, answeredEvening > 0),
  }
  const drop = {
    done: c.drop.dropped,
    total: c.drop.onBus,
    state: stateOf(c.drop.dropped, c.drop.onBus, c.drop.dropped > 0),
  }
  const order = [
    ['pickup', pickup],
    ['school', school],
    ['evening', evening],
    ['drop', drop],
  ] as const
  const current = order.find(([, job]) => job.state !== 'DONE')?.[0] ?? null
  return { pickup, school, evening, drop, current }
}
