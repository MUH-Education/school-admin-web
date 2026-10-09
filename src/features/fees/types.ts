// Shapes of the fee calls (docs/backend/api.md → Fees). The API doc names the URLs and the
// permissions only; the JSON is my guess (docs/08-decisions.md, part D, 9 Oct 2026).
import type { ClassName } from '@/features/students/types'

/** One school year, for example "2026–27". */
export interface Session {
  id: number
  label: string
  /** ISO dates. */
  startsOn: string
  endsOn: string
  /** The year in progress. New admissions get their plan in this session. */
  current: boolean
}

/** The school fee of one class (GET and PUT /sessions/{id}/class-fees send the whole list of 15). `amount` null means "not set yet". Whole rupees. */
export interface ClassFee {
  className: ClassName
  amount: number | null
}

/** The two parts of what a family pays. */
export type FeeHead = 'SCHOOL' | 'BUS'

export const feeHeadLabels: Record<FeeHead, string> = {
  SCHOOL: 'School fee',
  BUS: 'Bus fee',
}

/** How often the family pays. */
export type Frequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

/** The words and the order are those of the Admission design. */
export const frequencyLabels: Record<Frequency, string> = {
  MONTHLY: 'Every month',
  QUARTERLY: 'Every 3 months',
  YEARLY: 'Once a year',
}
export const frequencies = Object.keys(frequencyLabels) as Frequency[]

/** How many payments the year has, and how many months lie between two of them. */
export const paymentsPerYear: Record<Frequency, number> = { MONTHLY: 12, QUARTERLY: 4, YEARLY: 1 }
export const monthsBetween: Record<Frequency, number> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 }

export type PayMode = 'UPI' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE'

/** The words and the order are those of the Admission design. */
export const payModeLabels: Record<PayMode, string> = {
  UPI: 'UPI',
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank transfer',
  CHEQUE: 'Cheque',
}
export const payModes = Object.keys(payModeLabels) as PayMode[]

/** The reasons of the discount list in the Admission design. "No discount" is the empty answer. */
export const discountReasons = [
  'Brother or sister in school',
  'Referral credit',
  'Staff child',
  'Other',
] as const

/** On time: nothing late. Delayed: late by 1 to 30 days. Defaulted: late by more than 30 days. */
export type FeeStatus = 'ON_TIME' | 'DELAYED' | 'DEFAULTED'

export const feeStatusLabels: Record<FeeStatus, string> = {
  ON_TIME: 'On time',
  DELAYED: 'Delayed',
  DEFAULTED: 'Defaulted',
}

/** The Delayed / Defaulted line, in days late. */
export const DEFAULTED_AFTER_DAYS = 30

/** The plan of one child for one session. */
export interface FeePlan {
  sessionId: number
  schoolFee: number
  busFee: number
  discount: number
  /** Null when there is no discount. */
  discountReason: string | null
  frequency: Frequency
  /** ISO date of the first payment. */
  startsOn: string
}

/** One instalment of one fee head. */
export interface FeeDue {
  head: FeeHead
  /** ISO date */
  dueDate: string
  amount: number
  paid: number
}

/** One line of the payment list. A correction is a line with negative amounts. */
export interface FeePayment {
  id: number
  /** "R-2026-0412" */
  receiptNo: string
  /** ISO date */
  paidOn: string
  mode: PayMode
  schoolAmount: number
  busAmount: number
  /** schoolAmount + busAmount. Negative on a correction. */
  amount: number
  note: string | null
  /** The payment this line takes back, or null. */
  correctionOf: number | null
  /** True when a correction line exists for this payment. */
  corrected: boolean
}

/** What one fee head owes and has paid this year. */
export interface HeadSummary {
  head: FeeHead
  total: number
  paid: number
  pendingNow: number
  status: FeeStatus
}

export interface NextPayment {
  amount: number
  /** ISO date */
  dueDate: string
}

/** The answer of GET /students/{id}/fees. `plan` is null when the child has no fee plan yet. */
export interface StudentFees {
  studentId: number
  session: Session
  plan: FeePlan | null
  total: number
  paidSoFar: number
  /** Money that was due on or before today and is not paid. */
  pendingNow: number
  /** What is left to pay in the whole year. */
  stillToPay: number
  /** The worst of the fee heads. Null without a plan. */
  status: FeeStatus | null
  nextPayment: NextPayment | null
  heads: HeadSummary[]
  dues: FeeDue[]
  /** Newest first. */
  payments: FeePayment[]
}

/** Body of PUT /students/{id}/fee-plan. */
export interface FeePlanBody {
  sessionId: number
  schoolFee: number
  busFee: number
  discount: number
  discountReason?: string
  frequency: Frequency
}

/** Body of POST /students/{id}/payments. An amount of 0 means that head is not paid now. */
export interface PaymentBody {
  schoolAmount: number
  busAmount: number
  paidOn: string
  mode: PayMode
  note?: string
}

/** Body of POST /students/{id}/payment-corrections. The whole payment is taken back. */
export interface CorrectionBody {
  paymentId: number
  note: string
}

export type FeeErrorCode = 'PAYMENT_TOO_LARGE'
