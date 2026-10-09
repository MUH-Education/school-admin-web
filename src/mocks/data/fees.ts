import type { ClassFee, Frequency, PayMode, Session } from '@/features/fees/types'
import { classNames, type ClassName } from '@/features/students/types'
import { dueDates, netByHead, splitAmount } from '../feeSchedule'
import { MOCK_TODAY } from '../now'
import type { MockEnrolment, MockStudent } from './students'

// All names and numbers are made up.

export const sampleSessions: Session[] = [
  { id: 1, label: '2026–27', startsOn: '2026-04-01', endsOn: '2027-03-31', current: true },
  { id: 2, label: '2027–28', startsOn: '2027-04-01', endsOn: '2028-03-31', current: false },
]

const sampleClassAmounts: Record<ClassName, number> = {
  Nursery: 22000,
  LKG: 24000,
  UKG: 26000,
  'Class 1': 28000,
  'Class 2': 28000,
  'Class 3': 30000,
  'Class 4': 30000,
  'Class 5': 32000,
  'Class 6': 32000,
  'Class 7': 34000,
  'Class 8': 34000,
  'Class 9': 36000,
  'Class 10': 36000,
  'Class 11': 40000,
  'Class 12': 40000,
}

/** The class fees of the current session. The next session has none yet ("not set yet"). */
export function sampleClassFees(sessionId: number): ClassFee[] {
  return classNames.map((className) => ({
    className,
    amount: sessionId === 1 ? sampleClassAmounts[className] : null,
  }))
}

export interface MockFeePlan {
  studentId: number
  sessionId: number
  schoolFee: number
  busFee: number
  discount: number
  discountReason: string | null
  frequency: Frequency
  startsOn: string
  /** Bus fee added later by a bus change: one extra payment each, due on that day. */
  busExtras: { dueDate: string; amount: number }[]
}

export interface MockPayment {
  id: number
  studentId: number
  receiptNo: string
  paidOn: string
  mode: PayMode
  schoolAmount: number
  busAmount: number
  note: string | null
  correctionOf: number | null
}

export interface FeeSample {
  plans: MockFeePlan[]
  payments: MockPayment[]
  /** The next receipt is R-2026-<this>. */
  nextReceiptSeq: number
}

type Behaviour = 'ON_TIME' | 'DELAYED' | 'DEFAULTED' | 'NO_PLAN'

/** The ten children of the Students design come first: Mohit and Kirti are late, Rohit defaulted. */
function behaviourOf(id: number): Behaviour {
  const design: Behaviour[] = [
    'ON_TIME',
    'ON_TIME',
    'ON_TIME',
    'DELAYED',
    'DELAYED',
    'DEFAULTED',
    'ON_TIME',
    'ON_TIME',
    'ON_TIME',
    'ON_TIME',
  ]
  const fromDesign = design[id - 1]
  if (fromDesign) return fromDesign
  if (id % 13 === 0) return 'NO_PLAN'
  if (id % 11 === 0) return 'DEFAULTED'
  if (id % 7 === 0) return 'DELAYED'
  return 'ON_TIME'
}

const MODES: PayMode[] = ['UPI', 'CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE']

/** Plans and payments for the 62 sample children. A late child skips the payments that decide it. */
export function buildSampleFees(students: MockStudent[], enrolments: MockEnrolment[]): FeeSample {
  const session = sampleSessions[0]
  if (!session) throw new Error('No session')
  const plans: MockFeePlan[] = []
  const payments: MockPayment[] = []
  let receiptSeq = 1

  for (const student of students) {
    let behaviour = behaviourOf(student.id)
    if (behaviour === 'NO_PLAN') continue

    // The first ten children always pay every 3 months, as in the designs.
    const frequency: Frequency =
      student.id <= 10
        ? 'QUARTERLY'
        : student.id % 4 === 0
          ? 'MONTHLY'
          : student.id % 9 === 0
            ? 'YEARLY'
            : 'QUARTERLY'
    // A yearly fee is due on 1 April: it is either paid or long late. It cannot be "a few days late".
    if (frequency === 'YEARLY' && behaviour === 'DELAYED') behaviour = 'ON_TIME'

    const bus = enrolments.find((e) => e.studentId === student.id)
    const plan: MockFeePlan = {
      studentId: student.id,
      sessionId: session.id,
      schoolFee: sampleClassAmounts[student.className],
      busFee: bus?.usesBus ? (bus.busFee ?? 0) : 0,
      discount: 0,
      discountReason: null,
      frequency,
      startsOn: student.admissionDate > session.startsOn ? student.admissionDate : session.startsOn,
      busExtras: [],
    }
    plans.push(plan)

    const net = netByHead(plan)
    const dates = dueDates(plan.startsOn, frequency)
    const school = splitAmount(net.SCHOOL, dates.length)
    const busParts = splitAmount(net.BUS, dates.length)
    const past = dates.map((d, k) => ({ d, k })).filter((x) => x.d <= MOCK_TODAY)
    const toPay =
      behaviour === 'ON_TIME'
        ? past
        : behaviour === 'DELAYED'
          ? past.slice(0, -1)
          : past.slice(0, 1)
    for (const { d, k } of toPay) {
      payments.push({
        id: receiptSeq,
        studentId: student.id,
        receiptNo: `R-2026-${String(receiptSeq).padStart(4, '0')}`,
        paidOn: d,
        mode: MODES[(student.id + k) % MODES.length] ?? 'UPI',
        schoolAmount: school[k] ?? 0,
        busAmount: busParts[k] ?? 0,
        note: null,
        correctionOf: null,
      })
      receiptSeq++
    }
  }
  return { plans, payments, nextReceiptSeq: receiptSeq }
}
