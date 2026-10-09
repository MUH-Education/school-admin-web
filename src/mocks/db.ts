import type { Settings } from '@/features/routes/types'
import {
  lastSampleStopId,
  sampleAssignments,
  sampleRoutes,
  sampleSettings,
  sampleStaff,
  sampleVehicles,
  type MockAssignment,
  type MockRoute,
  type MockStaff,
  type MockVehicle,
} from './data/fleet'
import { sampleUsers, type MockUser } from './data/users'

/** In-memory data. A POST changes it, so the next GET shows the change. */
export const db = {
  users: [] as MockUser[],
  otpAttempts: new Map<string, number>(),
  nextUserId: 100,
  vehicles: [] as MockVehicle[],
  staff: [] as MockStaff[],
  assignments: [] as MockAssignment[],
  routes: [] as MockRoute[],
  settings: { ...sampleSettings } as Settings,
  nextVehicleId: 100,
  nextStaffId: 100,
  nextAssignmentId: 100,
  nextRouteId: 100,
  nextStopId: 1000,
}

export function resetMockDb(): void {
  db.users = sampleUsers.map((u) => ({ ...u }))
  db.otpAttempts = new Map()
  db.nextUserId = 100
  db.vehicles = sampleVehicles.map((v) => ({ ...v, papers: { ...v.papers } }))
  db.staff = sampleStaff.map((s) => ({ ...s }))
  db.assignments = sampleAssignments.map((a) => ({ ...a }))
  db.routes = sampleRoutes.map((r) => ({ ...r, stops: r.stops.map((s) => ({ ...s })) }))
  db.settings = { ...sampleSettings }
  db.nextVehicleId = 100
  db.nextStaffId = 100
  db.nextAssignmentId = 100
  db.nextRouteId = 100
  db.nextStopId = Math.max(1000, lastSampleStopId + 1)
}

resetMockDb()
