import { monthsBetween, paymentsPerYear, type Frequency } from './types'

// The payment dates and amounts of a plan. The preview in New admission and the mock server use
// these same rules; the real server decides in the end (docs/08-decisions.md, part D).

/** Days from one ISO date to another. Positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** The first day of the month that is `months` after the month of `iso`: ('2026-10-07', 3) → '2027-01-01'. */
export function firstOfMonthAfter(iso: string, months: number): string {
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7)) - 1 + months
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
}

/** The first payment is due on the start date. The others on the 1st of a month, a step apart. */
export function dueDates(startsOn: string, frequency: Frequency): string[] {
  return Array.from({ length: paymentsPerYear[frequency] }, (_, k) =>
    k === 0 ? startsOn : firstOfMonthAfter(startsOn, k * monthsBetween[frequency]),
  )
}

/**
 * 38801 in 4 → [9700, 9700, 9700, 9701]. Whole rupees only.
 * Every payment but the last is the total divided by the count, rounded down.
 * The last payment takes what is left, so the parts always add up to the total.
 */
export function splitAmount(total: number, count: number): number[] {
  const each = Math.floor(total / count)
  return Array.from({ length: count }, (_, k) =>
    k === count - 1 ? total - each * (count - 1) : each,
  )
}
