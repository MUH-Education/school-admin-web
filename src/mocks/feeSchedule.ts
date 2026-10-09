import { monthsBetween, paymentsPerYear, type FeeHead, type Frequency } from '@/features/fees/types'

// The fee rules of the mock server. They are my copy of the backend rules (docs/08-decisions.md,
// part D, 9 Oct 2026): the real server decides, this file only has to answer in the same way.

/** Days from one ISO date to another. Positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** The first day of the month that is `months` after the month of `iso`: ('2026-10-07', 3) → '2027-01-01'. */
export function firstOfMonthAfter(iso: string, months: number): string {
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7)) - 1 + months
  const date = new Date(Date.UTC(year, month, 1))
  return date.toISOString().slice(0, 10)
}

/** The first payment is due on the start date. The others on the 1st of a month, a step apart. */
export function dueDates(startsOn: string, frequency: Frequency): string[] {
  const count = paymentsPerYear[frequency]
  return Array.from({ length: count }, (_, k) =>
    k === 0 ? startsOn : firstOfMonthAfter(startsOn, k * monthsBetween[frequency]),
  )
}

/** 38801 in 4 → [9700, 9700, 9700, 9701]. Whole rupees; the last payment takes the odd rupees. */
export function splitAmount(total: number, count: number): number[] {
  const each = Math.floor(total / count)
  return Array.from({ length: count }, (_, k) =>
    k === count - 1 ? total - each * (count - 1) : each,
  )
}

export interface PlanAmounts {
  schoolFee: number
  busFee: number
  discount: number
}

/** The discount takes from the school fee first, then from the bus fee. */
export function netByHead(plan: PlanAmounts): Record<FeeHead, number> {
  const school = Math.max(0, plan.schoolFee - plan.discount)
  const rest = plan.discount - (plan.schoolFee - school)
  return { SCHOOL: school, BUS: Math.max(0, plan.busFee - rest) }
}
