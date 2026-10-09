// Shapes of /vehicles and /staff. Only the assignment body is in docs/backend/api.md;
// the rest is my guess (see docs/08-decisions.md, part D, 9 Oct 2026).

export type VehicleType = 'SMALL_VAN' | 'MID_BUS' | 'BIG_BUS'
export type OwnedBy = 'SCHOOL' | 'CONTRACTOR'
export type Duty = 'DRIVER' | 'ATTENDANT' | 'HELPER'
export type AssignmentReason = 'ON_LEAVE' | 'LEFT_SCHOOL' | 'MOVED' | 'OTHER'

export type PaperKind = 'FITNESS' | 'INSURANCE' | 'PERMIT' | 'POLLUTION'
/** VALID: more than 30 days left. ENDING: 30 days or less. ENDED: the last day has passed. */
export type PaperStatus = 'VALID' | 'ENDING' | 'ENDED'

export interface VehicleDocument {
  kind: PaperKind
  /** ISO date. The last day the paper is valid. */
  validTill: string
  status: PaperStatus
  /** Days from today to `validTill`. Negative when it has ended. */
  daysLeft: number
}

/** One row of GET /vehicles. */
export interface Vehicle {
  id: number
  name: string
  registrationNo: string
  vehicleType: VehicleType
  seats: number
  monthlyCost: number
  ownedBy: OwnedBy
  active: boolean
  routeId: number | null
  /** For example "Route 4". */
  route: string | null
  driver: string | null
  attendant: string | null
  documents: VehicleDocument[]
}

/** A person on a vehicle today. */
export interface VehiclePerson {
  duty: Duty
  staffId: number
  name: string
  phone: string
  /** Drivers only. */
  licenceValidTill: string | null
  /** ISO date. When this person started on the vehicle. */
  fromDate: string
  /** ISO date. Set when the change was "only till a date". */
  toDate: string | null
  /** The person who comes back after `toDate`. */
  thenBack: string | null
  hasLogin: boolean
}

/** GET /vehicles/{id}. */
export interface VehicleDetail extends Vehicle {
  people: VehiclePerson[]
}

/** Body of POST /vehicles and PUT /vehicles/{id}. */
export interface VehicleBody {
  name: string
  registrationNo: string
  vehicleType: VehicleType
  seats: number
  monthlyCost: number
  ownedBy: OwnedBy
}

/** Body of PUT /vehicles/{id}/documents: the four last-valid days. */
export type DocumentsBody = Record<PaperKind, string>

/** One row of GET /vehicles/{id}/assignments, newest first. */
export interface Assignment {
  id: number
  duty: Duty
  staffId: number
  staffName: string
  fromDate: string
  /** Null: still working. */
  toDate: string | null
  temporary: boolean
  reason: AssignmentReason
}

/** Body of POST /vehicles/{id}/assignments (from docs/backend/api.md). */
export interface AssignmentBody {
  duty: Duty
  staffId: number
  fromDate: string
  toDate?: string
  temporary: boolean
  reason: AssignmentReason
}

/** One row of GET /staff. */
export interface Staff {
  id: number
  name: string
  type: Duty
  phone: string
  licenceNo: string | null
  licenceValidTill: string | null
  licenceStatus: PaperStatus | null
  licenceDaysLeft: number | null
  /** Vehicle today, for example "Van 4". Null: free. */
  vehicle: string | null
  vehicleId: number | null
  /** Route today, for example "Route 4". */
  route: string | null
  /** Has a phone app login (attendants only). */
  hasLogin: boolean
  active: boolean
}

/** Body of POST /staff and PUT /staff/{id}. */
export interface StaffBody {
  name: string
  type: Duty
  phone: string
  licenceNo?: string
  licenceValidTill?: string
}

/** One row of GET /vehicles/attention. Ended first, then ending. */
export interface AttentionItem {
  subjectType: 'VEHICLE' | 'STAFF'
  /** "Bus 9" or "Krishan". */
  subject: string
  vehicleId: number | null
  item: PaperKind | 'LICENCE'
  validTill: string
  status: 'ENDING' | 'ENDED'
  daysLeft: number
}

/** Business errors the vehicle screens show with the server's message. */
export type VehicleErrorCode =
  'STAFF_BUSY' | 'WRONG_STAFF_TYPE' | 'LICENCE_ENDED' | 'VEHICLE_IN_USE'
