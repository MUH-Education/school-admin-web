import type {
  FeeDue,
  FeeHead,
  FeePayment,
  FeeStatus,
  HeadSummary,
  NextPayment,
  Session,
  StudentFees,
} from '@/features/fees/types'
import { DEFAULTED_AFTER_DAYS } from '@/features/fees/types'
import type { MockFeePlan, MockPayment } from './data/fees'
import type { MockStudent } from './data/students'
import { db } from './db'
import { daysBetween, dueDates, netByHead, splitAmount } from './feeSchedule'
import { MOCK_TODAY } from './now'

/** The fee status is decided against the fixed day of the mock (7 Oct 2026). */
export const feeToday = MOCK_TODAY

export function currentSession(): Session {
  const session = db.sessions.find((s) => s.current) ?? db.sessions[0]
  if (!session) throw new Error('No session')
  return session
}

export function planOf(studentId: number): MockFeePlan | undefined {
  const session = currentSession()
  return db.feePlans.find((p) => p.studentId === studentId && p.sessionId === session.id)
}

export function paymentsOf(studentId: number): MockPayment[] {
  return db.payments
    .filter((p) => p.studentId === studentId)
    .sort((a, b) => b.paidOn.localeCompare(a.paidOn) || b.id - a.id)
}

/** R-2026-0412 */
export function nextReceiptNo(): string {
  const seq = db.nextPaymentId++
  return `R-${feeToday.slice(0, 4)}-${String(seq).padStart(4, '0')}`
}

/** Every instalment of the plan, without what was paid. Both heads share the dates. */
function planDues(plan: MockFeePlan): { head: FeeHead; dueDate: string; amount: number }[] {
  const net = netByHead(plan)
  const dates = dueDates(plan.startsOn, plan.frequency)
  const school = splitAmount(net.SCHOOL, dates.length)
  const bus = splitAmount(net.BUS, dates.length)
  const dues: { head: FeeHead; dueDate: string; amount: number }[] = []
  dates.forEach((dueDate, k) => {
    if ((school[k] ?? 0) > 0) dues.push({ head: 'SCHOOL', dueDate, amount: school[k] ?? 0 })
    if ((bus[k] ?? 0) > 0) dues.push({ head: 'BUS', dueDate, amount: bus[k] ?? 0 })
  })
  for (const extra of plan.busExtras) {
    dues.push({ head: 'BUS', dueDate: extra.dueDate, amount: extra.amount })
  }
  return dues.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

/** What the plan asks for in the year, per head, after the discount. */
export function planTotals(plan: MockFeePlan): Record<FeeHead, number> {
  const net = netByHead(plan)
  return { SCHOOL: net.SCHOOL, BUS: net.BUS + plan.busExtras.reduce((s, e) => s + e.amount, 0) }
}

/** Money paid so far, per head. A correction counts with its negative amounts. */
export function paidByHead(studentId: number): Record<FeeHead, number> {
  const list = db.payments.filter((p) => p.studentId === studentId)
  return {
    SCHOOL: list.reduce((sum, p) => sum + p.schoolAmount, 0),
    BUS: list.reduce((sum, p) => sum + p.busAmount, 0),
  }
}

/** The money paid on a head goes to its oldest instalments first. */
function withPaid(plan: MockFeePlan, paid: Record<FeeHead, number>): FeeDue[] {
  const left = { ...paid }
  return planDues(plan).map((due) => {
    const part = Math.max(0, Math.min(due.amount, left[due.head]))
    left[due.head] -= part
    return { ...due, paid: part }
  })
}

/** On time: nothing late. Delayed: the oldest unpaid payment is 1 to 30 days late. Defaulted: more. */
function statusOf(dues: FeeDue[]): FeeStatus {
  const late = dues.find((d) => d.paid < d.amount && d.dueDate < feeToday)
  if (!late) return 'ON_TIME'
  return daysBetween(late.dueDate, feeToday) > DEFAULTED_AFTER_DAYS ? 'DEFAULTED' : 'DELAYED'
}

const worse: Record<FeeStatus, number> = { ON_TIME: 0, DELAYED: 1, DEFAULTED: 2 }

function toPayment(p: MockPayment): FeePayment {
  return {
    id: p.id,
    receiptNo: p.receiptNo,
    paidOn: p.paidOn,
    mode: p.mode,
    schoolAmount: p.schoolAmount,
    busAmount: p.busAmount,
    amount: p.schoolAmount + p.busAmount,
    note: p.note,
    correctionOf: p.correctionOf,
    corrected: db.payments.some((x) => x.correctionOf === p.id),
  }
}

export function toFeePayment(p: MockPayment): FeePayment {
  return toPayment(p)
}

/** The answer of GET /students/{id}/fees. */
export function studentFees(student: MockStudent): StudentFees {
  const session = currentSession()
  const plan = planOf(student.id)
  const payments = paymentsOf(student.id).map(toPayment)
  if (!plan) {
    return {
      studentId: student.id,
      session,
      plan: null,
      total: 0,
      paidSoFar: 0,
      pendingNow: 0,
      stillToPay: 0,
      status: null,
      nextPayment: null,
      heads: [],
      dues: [],
      payments,
    }
  }

  const paid = paidByHead(student.id)
  const totals = planTotals(plan)
  const dues = withPaid(plan, paid)
  const heads: HeadSummary[] = (['SCHOOL', 'BUS'] as const)
    .filter((head) => totals[head] > 0)
    .map((head) => {
      const own = dues.filter((d) => d.head === head)
      return {
        head,
        total: totals[head],
        paid: paid[head],
        pendingNow: own
          .filter((d) => d.dueDate <= feeToday)
          .reduce((sum, d) => sum + d.amount - d.paid, 0),
        status: statusOf(own),
      }
    })

  const nextDate = dues.find((d) => d.paid < d.amount && d.dueDate >= feeToday)?.dueDate
  const nextPayment: NextPayment | null = nextDate
    ? {
        dueDate: nextDate,
        amount: dues
          .filter((d) => d.dueDate === nextDate)
          .reduce((sum, d) => sum + d.amount - d.paid, 0),
      }
    : null

  const total = heads.reduce((sum, h) => sum + h.total, 0)
  const paidSoFar = heads.reduce((sum, h) => sum + h.paid, 0)
  return {
    studentId: student.id,
    session,
    plan: {
      sessionId: plan.sessionId,
      schoolFee: plan.schoolFee,
      busFee: plan.busFee + plan.busExtras.reduce((sum, e) => sum + e.amount, 0),
      discount: plan.discount,
      discountReason: plan.discountReason,
      frequency: plan.frequency,
      startsOn: plan.startsOn,
    },
    total,
    paidSoFar,
    pendingNow: heads.reduce((sum, h) => sum + h.pendingNow, 0),
    stillToPay: total - paidSoFar,
    status: heads.reduce<FeeStatus>(
      (w, h) => (worse[h.status] > worse[w] ? h.status : w),
      'ON_TIME',
    ),
    nextPayment,
    heads,
    dues,
    payments,
  }
}

/** The "Fee" column of the student list. Null: no fee plan. */
export function feeStatusOf(studentId: number): FeeStatus | null {
  const student = db.students.find((s) => s.id === studentId)
  return student ? studentFees(student).status : null
}

/**
 * The first payment of an admission goes to the oldest instalments, school fee before bus fee.
 * Returns how much landed on each head.
 */
export function splitFirstPayment(plan: MockFeePlan, amount: number): Record<FeeHead, number> {
  const split = { SCHOOL: 0, BUS: 0 }
  let left = amount
  for (const due of planDues(plan)) {
    const part = Math.min(due.amount, left)
    split[due.head] += part
    left -= part
    if (left === 0) break
  }
  return split
}
