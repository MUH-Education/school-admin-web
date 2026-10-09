import type {
  Guardian,
  Student,
  StudentListRow,
  TransportEnrolment,
  TransportNow,
} from '@/features/students/types'
import { formatDate } from '@/lib/format'
import type { MockEnrolment, MockGuardian, MockStudent } from './data/students'
import { db } from './db'
import { MOCK_NOW, MOCK_TODAY } from './now'

/** 9812345340 → 98XXX XX340. The server never sends the whole number. */
export function maskStudentPhone(phone: string): string {
  return `${phone.slice(0, 2)}XXX XX${phone.slice(7)}`
}

/** Keeps the ten digits of +91 98123 45678, 09812345678 or 98123 45678. Null: not a mobile number. */
export function tenDigits(input: string): string | null {
  let digits = input.replace(/[\s\-()]/g, '')
  if (digits.startsWith('+91')) digits = digits.slice(3)
  else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  return /^[6-9]\d{9}$/.test(digits) ? digits : null
}

export function studentById(id: unknown): MockStudent | undefined {
  return db.students.find((s) => s.id === Number(id) && s.active)
}

export function guardiansOf(studentId: number): MockGuardian[] {
  return db.guardians.filter((g) => g.studentId === studentId)
}

export function enrolmentsOf(studentId: number): MockEnrolment[] {
  return db.enrolments
    .filter((e) => e.studentId === studentId)
    .sort((a, b) => b.fromDate.localeCompare(a.fromDate) || b.id - a.id)
}

/** The bus state on a day: the latest start that is not after the day. */
export function enrolmentOn(studentId: number, date: string): MockEnrolment | undefined {
  return enrolmentsOf(studentId).find((e) => e.fromDate <= date)
}

export function stopById(stopId: number | null) {
  if (stopId === null) return undefined
  for (const route of db.routes) {
    const stop = route.stops.find((s) => s.id === stopId)
    if (stop) return { route, stop }
  }
  return undefined
}

/** A student joins (+1) or leaves (-1) a stop. The Routes and load numbers follow. */
export function moveChildCount(stopId: number | null, delta: 1 | -1): void {
  const place = stopById(stopId)
  if (place) place.stop.children = Math.max(0, place.stop.children + delta)
}

export function childrenOnRoute(routeId: number): number {
  const route = db.routes.find((r) => r.id === routeId)
  return route ? route.stops.reduce((sum, s) => sum + s.children, 0) : 0
}

function toNow(e: MockEnrolment | undefined): TransportNow {
  const place = stopById(e?.stopId ?? null)
  return {
    usesBus: Boolean(e?.usesBus),
    routeId: e?.usesBus ? (e.routeId ?? null) : null,
    route: e?.usesBus ? (place?.route.name ?? null) : null,
    stopId: e?.usesBus ? (e.stopId ?? null) : null,
    stop: e?.usesBus ? (place?.stop.name ?? null) : null,
    since: e?.fromDate ?? MOCK_TODAY,
    busFee: e?.usesBus ? e.busFee : null,
  }
}

export function toGuardian(g: MockGuardian): Guardian {
  return {
    id: g.id,
    name: g.name,
    relation: g.relation,
    phone: maskStudentPhone(g.phone),
    receivesSms: g.receivesSms,
  }
}

export function toStudent(s: MockStudent): Student {
  const upcoming = enrolmentsOf(s.id)
    .filter((e) => e.fromDate > MOCK_TODAY)
    .at(-1)
  return {
    id: s.id,
    admissionNo: s.admissionNo,
    name: s.name,
    dateOfBirth: s.dateOfBirth,
    gender: s.gender,
    className: s.className,
    section: s.section,
    admissionDate: s.admissionDate,
    village: s.village,
    address: s.address,
    fatherOccupation: s.fatherOccupation,
    hasPhoto: db.photos.has(s.id),
    active: s.active,
    leftOn: s.leftOn,
    guardians: guardiansOf(s.id).map(toGuardian),
    transport: toNow(enrolmentOn(s.id, MOCK_TODAY)),
    upcomingTransport: upcoming ? toNow(upcoming) : null,
  }
}

export function toListRow(s: MockStudent): StudentListRow {
  // The row shows where the child rides today, or the booked change when nothing runs yet.
  const now = toNow(enrolmentOn(s.id, MOCK_TODAY) ?? enrolmentsOf(s.id).at(-1))
  const first = guardiansOf(s.id)[0]
  return {
    id: s.id,
    admissionNo: s.admissionNo,
    name: s.name,
    className: s.className,
    section: s.section,
    village: s.village,
    hasPhoto: db.photos.has(s.id),
    usesBus: now.usesBus,
    route: now.route,
    stop: now.stop,
    parentPhone: first ? maskStudentPhone(first.phone) : null,
  }
}

export function toEnrolment(e: MockEnrolment): TransportEnrolment {
  const place = stopById(e.stopId)
  return {
    id: e.id,
    usesBus: e.usesBus,
    routeId: e.usesBus ? e.routeId : null,
    route: e.usesBus ? (place?.route.name ?? null) : null,
    stopId: e.usesBus ? e.stopId : null,
    stop: e.usesBus ? (place?.stop.name ?? null) : null,
    fromDate: e.fromDate,
    toDate: e.toDate,
    busFee: e.busFee,
  }
}

export function addHistory(studentId: number, text: string, by: string): void {
  db.history.push({
    id: db.nextHistoryId++,
    studentId,
    at: MOCK_NOW.toISOString(),
    text,
    by,
  })
}

export function nextAdmissionNo(): string {
  const year = MOCK_TODAY.slice(0, 4)
  return `A-${year}-${String(db.nextAdmissionSeq++).padStart(3, '0')}`
}

export function describeTransport(
  usesBus: boolean,
  routeId: number | null,
  stopId: number | null,
  fromDate: string,
): string {
  if (!usesBus) return `Bus stopped from ${formatDate(fromDate)}`
  const place = stopById(stopId)
  const where = place ? `${place.route.name}, ${place.stop.name}` : `route ${routeId}`
  return `Bus set to ${where} from ${formatDate(fromDate)}`
}

/** The new child on a bus: counts and history. Used by POST /admissions and PUT /students/{id}/transport. */
export function startEnrolment(
  studentId: number,
  body: {
    usesBus: boolean
    routeId: number | null
    stopId: number | null
    fromDate: string
    busFee: number | null
  },
): void {
  const previous = enrolmentsOf(studentId)[0]
  if (previous) {
    if (previous.usesBus) moveChildCount(previous.stopId, -1)
    if (previous.fromDate >= body.fromDate) {
      db.enrolments = db.enrolments.filter((e) => e.id !== previous.id)
    } else {
      previous.toDate = new Date(new Date(`${body.fromDate}T00:00:00Z`).getTime() - 86_400_000)
        .toISOString()
        .slice(0, 10)
    }
  }
  db.enrolments.push({
    id: db.nextEnrolmentId++,
    studentId,
    usesBus: body.usesBus,
    routeId: body.usesBus ? body.routeId : null,
    stopId: body.usesBus ? body.stopId : null,
    fromDate: body.fromDate,
    toDate: null,
    busFee: body.usesBus ? body.busFee : null,
  })
  if (body.usesBus) moveChildCount(body.stopId, 1)
}
