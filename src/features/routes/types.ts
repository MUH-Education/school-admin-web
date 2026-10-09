// Shapes of /routes and /settings. The load-board row is in docs/backend/api.md;
// the rest is my guess (see docs/08-decisions.md, part D, 9 Oct 2026).
import type { VehicleType } from '@/features/vehicles/types'

export interface RouteStop {
  id: number
  name: string
  /** "07:25" */
  morningTime: string
  /** Read-only. It comes from the student list. */
  children: number
}

/** One row of GET /routes and the answer of GET /routes/{id}. */
export interface Route {
  id: number
  name: string
  vehicleId: number | null
  /** For example "Van 4". */
  vehicle: string | null
  vehicleType: VehicleType | null
  seats: number
  monthlyCost: number
  stops: RouteStop[]
}

/** Body of POST /routes and PUT /routes/{id}. */
export interface RouteBody {
  name: string
  vehicleId: number | null
}

/** One item of the body of PUT /routes/{id}/stops. No `id` means a new stop. */
export interface StopBody {
  id?: number
  name: string
  morningTime: string
}

export type Verdict = 'OVER' | 'OK' | 'LOW'

/** One row of GET /routes/load-board. */
export interface LoadBoardRow {
  routeId: number
  name: string
  vehicle: string | null
  vehicleType: VehicleType | null
  seats: number
  children: number
  /** children ÷ seats */
  load: number
  overBy: number
  spare: number
  yearlyCost: number
  costPerChild: number
  feeGot: number
  /** Fee got minus yearly cost. Negative is a loss. */
  surplus: number
  /** OVER: more children than seats. LOW: load under 0.6. OK: the rest. */
  verdict: Verdict
}

/** GET and PUT /settings. */
export interface Settings {
  busMonths: number
  busFeePerChild: number
  feeCollectedPercent: number
}

export type RouteErrorCode = 'VEHICLE_HAS_ROUTE' | 'STOP_HAS_STUDENTS' | 'ROUTE_HAS_STUDENTS'
