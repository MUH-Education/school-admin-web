// Shape of POST /admissions. Docs/backend/api.md gives only the URL; the JSON is my guess
// (docs/08-decisions.md, part D, 9 Oct 2026). The fees part comes in web phase 8.
import type { ClassName, Gender, Occupation, RouteFullWarning } from '@/features/students/types'

/** Body of POST /admissions. Flat names, so a field error can name its input. */
export interface AdmissionRequest {
  name: string
  dateOfBirth: string
  gender: Gender
  className: ClassName
  section?: string
  /** ISO date. Empty: today. */
  admissionDate?: string
  village: string
  address?: string
  fatherOccupation: Occupation
  /** Not sent when `siblingStudentId` is given: the parents are copied. */
  fatherName?: string
  fatherPhone?: string
  motherName?: string
  motherPhone?: string
  smsToFather?: boolean
  smsToMother?: boolean
  siblingStudentId?: number
  usesBus: boolean
  routeId?: number
  stopId?: number
}

/** The answer of POST /admissions. */
export interface AdmissionResult {
  studentId: number
  /** "A-2026-119" */
  admissionNo: string
  warning?: RouteFullWarning
}
