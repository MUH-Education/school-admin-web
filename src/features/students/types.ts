// Shapes of /students and its sub-paths. The URLs and the transport body are in
// docs/backend/api.md; the JSON answers are my guess (docs/08-decisions.md, part D, 9 Oct 2026).

export type Gender = 'BOY' | 'GIRL'

export const genderLabels: Record<Gender, string> = { BOY: 'Boy', GIRL: 'Girl' }

/** The classes of the school, in teaching order. The value is what the server stores and filters by. */
export const classNames = [
  'Nursery',
  'LKG',
  'UKG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
] as const
export type ClassName = (typeof classNames)[number]

export const sections = ['A', 'B', 'C'] as const

export type Occupation =
  | 'SHOPKEEPER_TRADER'
  | 'FARMER_SMALL'
  | 'FARMER_LARGE'
  | 'GOVERNMENT'
  | 'DEFENCE'
  | 'PRIVATE_JOB'
  | 'LABOUR'
  | 'PROFESSIONAL'
  | 'ABROAD'
  | 'OTHER'

/** The order and the words are those of the Admission design. */
export const occupationLabels: Record<Occupation, string> = {
  SHOPKEEPER_TRADER: 'Shopkeeper or trader',
  FARMER_SMALL: 'Farmer, small (under 5 acres)',
  FARMER_LARGE: 'Farmer, large (5+ acres)',
  GOVERNMENT: 'Government employee',
  DEFENCE: 'Ex-serviceman or defence',
  PRIVATE_JOB: 'Private job',
  LABOUR: 'Labour, daily wage',
  PROFESSIONAL: 'Teacher or professional',
  ABROAD: 'Family abroad',
  OTHER: 'Other',
}
export const occupations = Object.keys(occupationLabels) as Occupation[]

export type Relation = 'FATHER' | 'MOTHER' | 'GRANDFATHER' | 'GRANDMOTHER' | 'UNCLE_AUNT' | 'OTHER'

/** The order is that of the "Relation to the child" list in the StudentProfile design. */
export const relationLabels: Record<Relation, string> = {
  GRANDFATHER: 'Grandfather',
  FATHER: 'Father',
  MOTHER: 'Mother',
  GRANDMOTHER: 'Grandmother',
  UNCLE_AUNT: 'Uncle or aunt',
  OTHER: 'Other',
}
export const relations = Object.keys(relationLabels) as Relation[]

/** One row of GET /students. */
export interface StudentListRow {
  id: number
  /** "A-2026-118" */
  admissionNo: string
  name: string
  className: ClassName
  section: string | null
  village: string
  /** The photo can be fetched with GET /students/{id}/photo. */
  hasPhoto: boolean
  usesBus: boolean
  /** "Route 4", or null when there is no bus. */
  route: string | null
  stop: string | null
  /** As the server sends it, for example "98XXX XX340". Not logged. */
  parentPhone: string | null
}

/** The answer of GET /students: one page and the counts for the current filters. */
export interface StudentPage {
  items: StudentListRow[]
  /** First page is 1. */
  page: number
  pageSize: number
  /** All students that match the filters. */
  total: number
  /** Of those, how many use the bus and how many do not. */
  usesBus: number
  noBus: number
  /** Every village of the school, A to Z. It fills the Village filter. */
  villages: string[]
}

/** The filters of the list. They live in the address: /students?village=Jakhal&page=2 */
export interface StudentFilters {
  q: string
  className: string
  /** '' (all), 'YES', 'NO' or a route id as text, for example '4'. */
  bus: string
  village: string
  page: number
}

export interface Guardian {
  id: number
  name: string
  relation: Relation
  /** As the server sends it, for example "94XXX XX208". */
  phone: string
  receivesSms: boolean
}

/** Where the child rides now (or will ride from `since`). */
export interface TransportNow {
  usesBus: boolean
  routeId: number | null
  route: string | null
  stopId: number | null
  stop: string | null
  /** The date this state started. ISO date. */
  since: string
  busFee: number | null
}

/** The answer of GET /students/{id}. */
export interface Student {
  id: number
  admissionNo: string
  name: string
  /** ISO date */
  dateOfBirth: string
  gender: Gender
  className: ClassName
  section: string | null
  /** ISO date */
  admissionDate: string
  village: string
  address: string | null
  fatherOccupation: Occupation | null
  hasPhoto: boolean
  /** False after "Mark as left the school". */
  active: boolean
  leftOn: string | null
  guardians: Guardian[]
  /** The state today. */
  transport: TransportNow
  /** A change booked for a later date, or null. */
  upcomingTransport: TransportNow | null
}

/** Body of PUT /students/{id}. `leftOn` marks the child as left. */
export interface StudentUpdateBody {
  name: string
  dateOfBirth: string
  gender: Gender
  className: ClassName
  section: string | null
  village: string
  address: string | null
  fatherOccupation: Occupation | null
  leftOn?: string | null
}

/** Body of POST /students/{id}/guardians. */
export interface GuardianCreateBody {
  name: string
  relation: Relation
  phone: string
  receivesSms: boolean
}

/** Body of PUT /students/{id}/guardians/{guardianId}. The number itself cannot be changed. */
export interface GuardianUpdateBody {
  name: string
  relation: Relation
  receivesSms: boolean
}

/** Body of PUT /students/{id}/transport (docs/backend/api.md). */
export interface TransportBody {
  usesBus: boolean
  routeId?: number
  stopId?: number
  /** ISO date */
  fromDate: string
  busFee?: number
}

export interface RouteFullWarning {
  code: 'ROUTE_FULL'
  message: string
}

/** The answer of PUT /students/{id}/transport. The change is saved even with a warning. */
export interface TransportSaved {
  saved: true
  warning?: RouteFullWarning
}

/** One line of GET /students/{id}/transport: the bus history, newest first. */
export interface TransportEnrolment {
  id: number
  usesBus: boolean
  routeId: number | null
  route: string | null
  stopId: number | null
  stop: string | null
  fromDate: string
  /** Null: still the current state. */
  toDate: string | null
  busFee: number | null
}

/** One line of GET /students/{id}/history, newest first. */
export interface HistoryEntry {
  id: number
  /** ISO date and time */
  at: string
  /** For example "Section changed from B to A" */
  text: string
  /** Name of the person who made the change. */
  by: string
}

/** One line that did not pass the check of the import. */
export interface ImportProblem {
  line: number
  /** For example "phone has 9 digits" */
  message: string
}

/** The answer of POST /students/import, with or without dryRun=true. */
export interface ImportResult {
  dryRun: boolean
  /** Lines that are good. With dryRun they are checked only; without it they are saved. */
  okLines: number
  skippedLines: number
  problems: ImportProblem[]
}

export type StudentErrorCode = 'PHONE_ALREADY_LINKED' | 'LAST_GUARDIAN' | 'STOP_NOT_ON_ROUTE'

/** Photo rules, checked in the browser before the upload. */
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024
export const PHOTO_TYPES = ['image/jpeg', 'image/png']

/** The columns of the CSV file for POST /students/import, in this order. The first line is the header. */
export const importColumns = [
  'name',
  'dateOfBirth',
  'gender',
  'className',
  'section',
  'village',
  'fatherName',
  'fatherPhone',
]
