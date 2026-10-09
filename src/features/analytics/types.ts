// Shapes of the analytics calls (docs/backend/api.md → Analytics). The API doc names the URLs, the
// permission and the six filters only; the JSON is my guess (docs/08-decisions.md, part D, 9 Oct 2026).
import type { FeeStatus } from '@/features/fees/types'
import type { ClassName, Occupation } from '@/features/students/types'

/**
 * The six filters. They live in the address and every call gets this same object, so the page can
 * never show two different sets of students. An empty text means "no filter".
 */
export interface AnalyticsFilters {
  /** A session id as text. Empty: the session in progress. */
  session: string
  className: string
  village: string
  /** '' (all), 'YES', 'NO' or a route id as text, for example '4'. Same words as the Students list. */
  bus: string
  /** An `Occupation` code, for example 'FARMER_SMALL'. */
  occupation: string
  /** A `FeeStatus` code, for example 'DELAYED'. */
  feeStatus: string
}

export const emptyFilters: AnalyticsFilters = {
  session: '',
  className: '',
  village: '',
  bus: '',
  occupation: '',
  feeStatus: '',
}

/** The columns the table can be sorted by. */
export type SortColumn = 'name' | 'class' | 'pending'
export type SortDirection = 'asc' | 'desc'

/** Sort and page of the table. They go to the table call and to the file, not to the charts. */
export interface TableState {
  sort: SortColumn
  dir: SortDirection
  /** First page is 1. */
  page: number
}

/** The list opens with the biggest debts on top, as in the design. */
export const defaultTable: TableState = { sort: 'pending', dir: 'desc', page: 1 }

export const TABLE_PAGE_SIZE = 25

/** GET /analytics/summary */
export interface AnalyticsSummary {
  /** Students that match the filters. */
  students: number
  /** All students of the session, whatever the filters say. It fills "Showing 37 of 290 students". */
  allStudents: number
  /** Of `students`, how many use the bus. */
  usesBus: number
  /** Whole percent of the school fee that was due by today and is paid. Null: nothing was due. */
  schoolFeePercent: number | null
  busFeePercent: number | null
  /** Students with money that was due by today and is not paid. */
  feePending: number
}

/** One month of GET /analytics/fee-collection-by-month. Null: no fee fell due in that month. */
export interface MonthCollection {
  /** "2026-09" */
  month: string
  schoolPercent: number | null
  busPercent: number | null
}

/** One father's occupation of GET /analytics/payment-by-occupation. Students without a fee plan are not counted. */
export interface OccupationPayment {
  /** Null: the occupation was never told. */
  occupation: Occupation | null
  onTime: number
  delayed: number
  defaulted: number
}

/** GET /analytics/students-by-class. */
export interface ClassCount {
  className: ClassName
  count: number
}

/** GET /analytics/students-by-village, biggest first. */
export interface VillageCount {
  village: string
  count: number
}

/** One row of GET /analytics/students. A null status: no fee plan, or no bus fee. */
export interface AnalyticsStudentRow {
  id: number
  name: string
  className: ClassName
  section: string | null
  village: string
  occupation: Occupation | null
  /** "Route 4", or null when there is no bus. */
  route: string | null
  schoolStatus: FeeStatus | null
  busStatus: FeeStatus | null
  /** Money that was due by today and is not paid, in whole rupees. */
  pending: number
}

/** The answer of GET /analytics/students. */
export interface AnalyticsStudentPage {
  items: AnalyticsStudentRow[]
  page: number
  pageSize: number
  /** All students that match the filters. */
  total: number
}
