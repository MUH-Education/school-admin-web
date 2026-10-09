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
import {
  sampleStudentData,
  samplePhotoBase64,
  type MockEnrolment,
  type MockGuardian,
  type MockHistory,
  type MockStudent,
} from './data/students'
import {
  buildSampleFees,
  sampleClassFees,
  sampleSessions,
  type MockFeePlan,
  type MockPayment,
} from './data/fees'
import type { ClassFee, Session } from '@/features/fees/types'
import { sampleEnquiries, type MockEnquiry } from './data/enquiries'
import type { MockTapRecord } from './data/trips'
import { sampleUsers, type MockUser } from './data/users'

export interface MockPhoto {
  type: string
  bytes: Uint8Array<ArrayBuffer>
}

function samplePhoto(): MockPhoto {
  const text = atob(samplePhotoBase64)
  const bytes = new Uint8Array(new ArrayBuffer(text.length))
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i)
  return { type: 'image/png', bytes }
}

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
  students: [] as MockStudent[],
  guardians: [] as MockGuardian[],
  enrolments: [] as MockEnrolment[],
  history: [] as MockHistory[],
  photos: new Map<number, MockPhoto>(),
  /** Taps the phone app sent to POST /trips/marks. The morning picture of Route 4 is not in here. */
  tripTaps: [] as MockTapRecord[],
  enquiries: [] as MockEnquiry[],
  sessions: [] as Session[],
  /** The class fees by session id. */
  classFees: new Map<number, ClassFee[]>(),
  feePlans: [] as MockFeePlan[],
  payments: [] as MockPayment[],
  nextPaymentId: 1,
  nextStudentId: 1000,
  nextGuardianId: 1000,
  nextEnrolmentId: 1000,
  nextHistoryId: 1000,
  nextEnquiryId: 100,
  nextFollowUpId: 100,
  /** The next admission number is A-<year>-<this>. Ishaan has 118. */
  nextAdmissionSeq: 119,
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
  db.students = sampleStudentData.students.map((x) => ({ ...x }))
  db.guardians = sampleStudentData.guardians.map((x) => ({ ...x }))
  db.enrolments = sampleStudentData.enrolments.map((x) => ({ ...x }))
  db.history = sampleStudentData.history.map((x) => ({ ...x }))
  db.photos = new Map([[2, samplePhoto()]])
  db.tripTaps = []
  db.enquiries = sampleEnquiries.map((e) => ({
    ...e,
    followUps: e.followUps.map((f) => ({ ...f })),
  }))
  db.sessions = sampleSessions.map((x) => ({ ...x }))
  db.classFees = new Map(sampleSessions.map((x) => [x.id, sampleClassFees(x.id)]))
  const fees = buildSampleFees(sampleStudentData.students, sampleStudentData.enrolments)
  db.feePlans = fees.plans.map((x) => ({ ...x }))
  db.payments = fees.payments.map((x) => ({ ...x }))
  db.nextPaymentId = fees.nextReceiptSeq
  db.nextEnquiryId = 100
  db.nextFollowUpId = 100
  db.nextStudentId = 1000
  db.nextGuardianId = 1000
  db.nextEnrolmentId = 1000
  db.nextHistoryId = 1000
  db.nextAdmissionSeq = 119
  db.nextVehicleId = 100
  db.nextStaffId = 100
  db.nextAssignmentId = 100
  db.nextRouteId = 100
  db.nextStopId = Math.max(1000, lastSampleStopId + 1)
}

resetMockDb()
