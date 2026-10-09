// Shape of POST /admissions. Docs/backend/api.md gives only the URL; the JSON is my guess
// (docs/08-decisions.md, part D, 9 Oct 2026).
import type { Frequency, PayMode } from '@/features/fees/types'
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
  /** The enquiry this admission came from. The server marks it Admitted. */
  enquiryId?: number
  // Part 4, Fees. Left out when the person cannot edit fees. Whole rupees.
  schoolFee?: number
  /** 0 when the child does not use the bus. */
  busFee?: number
  discount?: number
  /** Needed when the discount is above 0. */
  discountReason?: string
  frequency?: Frequency
  /** Money received today. Left out when the family pays later. */
  firstPaymentAmount?: number
  firstPaymentMode?: PayMode
}

/** The answer of POST /admissions. */
export interface AdmissionResult {
  studentId: number
  /** "A-2026-119" */
  admissionNo: string
  warning?: RouteFullWarning
  /** The receipt of the first payment, when there was one. */
  receiptNo?: string
}
