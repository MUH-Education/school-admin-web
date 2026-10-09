import type {
  AnalyticsStudentRow,
  AnalyticsSummary,
  ClassCount,
  MonthCollection,
  OccupationPayment,
  SortColumn,
  SortDirection,
  VillageCount,
} from '@/features/analytics/types'
import { feeStatusLabels, type FeeHead, type FeeStatus, type StudentFees } from '@/features/fees/types'
import { classAndSection } from '@/features/students/labels'
import { classNames, occupationLabels, type Occupation } from '@/features/students/types'
import { db } from './db'
import { currentSession, feeToday, studentFees } from './feesLogic'
import { transportNowOf } from './studentLogic'

/** One active student with everything the analytics questions need. */
interface Row {
  id: number
  name: string
  className: (typeof classNames)[number]
  section: string | null
  village: string
  occupation: Occupation | null
  routeId: number | null
  route: string | null
  usesBus: boolean
  /** Null: no fee plan in this session. */
  fees: StudentFees | null
}

/** The filters as the server reads them from the address. Empty text: no filter. */
export interface MockFilters {
  sessionId: number | null
  className: string
  village: string
  routeId: number | null
  bus: string
  occupation: string
  feeStatus: string
}

export function readFilters(url: URL): MockFilters {
  const get = (name: string) => url.searchParams.get(name) ?? ''
  return {
    sessionId: Number(get('sessionId')) || null,
    className: get('className'),
    village: get('village'),
    routeId: Number(get('routeId')) || null,
    bus: get('bus'),
    occupation: get('occupation'),
    feeStatus: get('feeStatus'),
  }
}

/** The fee plans exist for the session in progress only. Another session has students but no fees. */
function sessionHasFees(sessionId: number | null): boolean {
  return sessionId === null || sessionId === currentSession().id
}

function allRows(sessionId: number | null): Row[] {
  const withFees = sessionHasFees(sessionId)
  return db.students
    .filter((s) => s.active)
    .map((s) => {
      const bus = transportNowOf(s.id)
      const fees = withFees ? studentFees(s) : null
      return {
        id: s.id,
        name: s.name,
        className: s.className,
        section: s.section,
        village: s.village,
        occupation: s.fatherOccupation,
        routeId: bus.routeId,
        route: bus.route,
        usesBus: bus.usesBus,
        fees: fees && fees.plan ? fees : null,
      }
    })
}

/** Every active student that passes the six filters. */
export function filteredRows(filters: MockFilters): Row[] {
  return allRows(filters.sessionId)
    .filter((r) => !filters.className || r.className === filters.className)
    .filter((r) => !filters.village || r.village === filters.village)
    .filter((r) => !filters.routeId || r.routeId === filters.routeId)
    .filter((r) => (filters.bus === 'YES' ? r.usesBus : filters.bus === 'NO' ? !r.usesBus : true))
    .filter((r) => !filters.occupation || r.occupation === filters.occupation)
    .filter((r) => !filters.feeStatus || r.fees?.status === filters.feeStatus)
}

/** Whole percent of the money due by today (on one fee head) that is paid. Null: nothing was due. */
function collectedPercent(rows: Row[], head: FeeHead, inMonth?: string): number | null {
  let due = 0
  let paid = 0
  for (const row of rows) {
    for (const d of row.fees?.dues ?? []) {
      if (d.head !== head || d.dueDate > feeToday) continue
      if (inMonth && d.dueDate.slice(0, 7) !== inMonth) continue
      due += d.amount
      paid += d.paid
    }
  }
  return due === 0 ? null : Math.round((paid / due) * 100)
}

const headStatus = (row: Row, head: FeeHead): FeeStatus | null =>
  row.fees?.heads.find((h) => h.head === head)?.status ?? null

export function summaryOf(filters: MockFilters): AnalyticsSummary {
  const rows = filteredRows(filters)
  return {
    students: rows.length,
    allStudents: allRows(filters.sessionId).length,
    usesBus: rows.filter((r) => r.usesBus).length,
    schoolFeePercent: collectedPercent(rows, 'SCHOOL'),
    busFeePercent: collectedPercent(rows, 'BUS'),
    feePending: rows.filter((r) => (r.fees?.pendingNow ?? 0) > 0).length,
  }
}

/** From the month the session starts to the month of today. A session that has not started has none. */
export function monthsOf(filters: MockFilters): MonthCollection[] {
  const session = db.sessions.find((s) => s.id === (filters.sessionId ?? currentSession().id))
  if (!session || !sessionHasFees(filters.sessionId)) return []
  const rows = filteredRows(filters)
  const out: MonthCollection[] = []
  let year = Number(session.startsOn.slice(0, 4))
  let month = Number(session.startsOn.slice(5, 7))
  for (;;) {
    const key = `${year}-${String(month).padStart(2, '0')}`
    if (key > feeToday.slice(0, 7) || key > session.endsOn.slice(0, 7)) break
    out.push({
      month: key,
      schoolPercent: collectedPercent(rows, 'SCHOOL', key),
      busPercent: collectedPercent(rows, 'BUS', key),
    })
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }
  return out
}

/** Biggest group first; the same size goes by the name. */
export function occupationsOf(filters: MockFilters): OccupationPayment[] {
  const by = new Map<Occupation | null, OccupationPayment>()
  for (const row of filteredRows(filters)) {
    if (!row.fees?.status) continue
    const entry = by.get(row.occupation) ?? {
      occupation: row.occupation,
      onTime: 0,
      delayed: 0,
      defaulted: 0,
    }
    if (row.fees.status === 'ON_TIME') entry.onTime++
    else if (row.fees.status === 'DELAYED') entry.delayed++
    else entry.defaulted++
    by.set(row.occupation, entry)
  }
  const size = (o: OccupationPayment) => o.onTime + o.delayed + o.defaulted
  const label = (o: OccupationPayment) => (o.occupation ? occupationLabels[o.occupation] : '')
  return [...by.values()].sort((a, b) => size(b) - size(a) || label(a).localeCompare(label(b)))
}

/** All 15 classes in teaching order, also the ones with nobody. */
export function classesOf(filters: MockFilters): ClassCount[] {
  const rows = filteredRows(filters)
  return classNames.map((className) => ({
    className,
    count: rows.filter((r) => r.className === className).length,
  }))
}

/** Every village, biggest first. The page shows the top 8 and adds up the rest. */
export function villagesOf(filters: MockFilters): VillageCount[] {
  const counts = new Map<string, number>()
  for (const row of filteredRows(filters)) {
    counts.set(row.village, (counts.get(row.village) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([village, count]) => ({ village, count }))
    .sort((a, b) => b.count - a.count || a.village.localeCompare(b.village))
}

function toStudentRow(row: Row): AnalyticsStudentRow {
  return {
    id: row.id,
    name: row.name,
    className: row.className,
    section: row.section,
    village: row.village,
    occupation: row.occupation,
    route: row.route,
    schoolStatus: headStatus(row, 'SCHOOL'),
    busStatus: headStatus(row, 'BUS'),
    pending: row.fees?.pendingNow ?? 0,
  }
}

/** The list in the order asked for. The name settles a tie, so the order never wobbles. */
export function sortedStudents(
  filters: MockFilters,
  sort: SortColumn,
  dir: SortDirection,
): AnalyticsStudentRow[] {
  const sign = dir === 'asc' ? 1 : -1
  const byName = (a: AnalyticsStudentRow, b: AnalyticsStudentRow) =>
    a.name.localeCompare(b.name) || a.id - b.id
  const compare = (a: AnalyticsStudentRow, b: AnalyticsStudentRow): number => {
    if (sort === 'pending') return sign * (a.pending - b.pending) || byName(a, b)
    if (sort === 'class') {
      const order = classNames.indexOf(a.className) - classNames.indexOf(b.className)
      return sign * (order || (a.section ?? '').localeCompare(b.section ?? '')) || byName(a, b)
    }
    return sign * a.name.localeCompare(b.name) || a.id - b.id
  }
  return filteredRows(filters).map(toStudentRow).sort(compare)
}

const BOM = String.fromCharCode(0xfeff)

const CSV_HEADER = [
  'Student',
  'Class',
  'Village',
  "Father's occupation",
  'Bus',
  'School fee',
  'Bus fee',
  'Pending (Rs)',
]

function csvCell(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * The same list as a file for Excel. It starts with a byte order mark, so Excel reads the names as
 * UTF-8 and not as the local code page. Lines end with CRLF. A missing status is an empty cell.
 */
export function csvOf(rows: AnalyticsStudentRow[]): string {
  const lines = [CSV_HEADER, ...rows.map(csvRow)].map((cells) => cells.map(csvCell).join(','))
  return `${BOM}${lines.join('\r\n')}\r\n`
}

function csvRow(r: AnalyticsStudentRow): string[] {
  return [
    r.name,
    classAndSection(r.className, r.section),
    r.village,
    r.occupation ? occupationLabels[r.occupation] : '',
    r.route ?? 'No bus',
    r.schoolStatus ? feeStatusLabels[r.schoolStatus] : '',
    r.busStatus ? feeStatusLabels[r.busStatus] : '',
    String(r.pending),
  ]
}
