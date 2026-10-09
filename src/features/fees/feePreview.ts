import { dueDates, splitAmount } from './schedule'
import type { Frequency } from './types'

export interface FeePreviewInput {
  /** Whole rupees. Null: the box is empty, counted as 0. */
  schoolFee: number | null
  busFee: number | null
  discount: number | null
  /** Null: the family has not been asked yet. */
  frequency: Frequency | null
  paidToday: number | null
  /** ISO date of the first payment: the admission date. */
  startsOn: string
}

export interface FeePreview {
  /** school fee + bus fee − discount, never below 0 */
  total: number
  paidToday: number
  /** total − paid today, never below 0 */
  stillToPay: number
  /** The amount of every payment of the year. Empty until `frequency` is known. */
  payments: number[]
  /** The first payment that is not fully paid yet, with its date. Null: all is paid, or no plan yet. */
  next: { amount: number; dueDate: string } | null
  /** The discount is bigger than the two fees together. */
  discountTooLarge: boolean
  /** Paid today is bigger than the total. */
  paidTooLarge: boolean
}

/**
 * The Fee summary of New admission, calculated while the clerk types. All in whole rupees.
 *
 * Example: ₹30,000 + ₹8,800 − ₹0 = ₹38,800. Paid today ₹9,700. Still to pay ₹29,100.
 * Every 3 months: four payments of ₹9,700. The first is covered by the money paid today,
 * so the next payment is ₹9,700 on the 1st of the month three months on.
 *
 * It is only a preview. After saving, the numbers come from the server.
 */
export function feePreview(input: FeePreviewInput): FeePreview {
  const school = input.schoolFee ?? 0
  const bus = input.busFee ?? 0
  const discount = input.discount ?? 0
  const paid = input.paidToday ?? 0

  const total = Math.max(0, school + bus - discount)
  const stillToPay = Math.max(0, total - paid)

  let payments: number[] = []
  let next: FeePreview['next'] = null
  if (input.frequency !== null && total > 0) {
    const dates = dueDates(input.startsOn, input.frequency)
    payments = splitAmount(total, dates.length)
    // The money paid today goes to the payments in order, oldest first.
    let left = paid
    for (const [k, amount] of payments.entries()) {
      const covered = Math.min(left, amount)
      left -= covered
      const date = dates[k]
      if (covered < amount && date !== undefined) {
        next = { amount: amount - covered, dueDate: date }
        break
      }
    }
  }

  return {
    total,
    paidToday: paid,
    stillToPay,
    payments,
    next,
    discountTooLarge: discount > school + bus,
    paidTooLarge: paid > total,
  }
}

/** "4 payments of ₹9,700 in the year." or, when the last one differs, "4 payments in the year: 3 of ₹9,700 and the last of ₹9,701." */
export function describePayments(payments: number[], formatMoney: (n: number) => string): string {
  const [first] = payments
  const last = payments.at(-1)
  if (first === undefined || last === undefined) return ''
  if (payments.length === 1) return `1 payment of ${formatMoney(first)} in the year.`
  if (first === last) return `${payments.length} payments of ${formatMoney(first)} in the year.`
  return `${payments.length} payments in the year: ${payments.length - 1} of ${formatMoney(first)} and the last of ${formatMoney(last)}.`
}
