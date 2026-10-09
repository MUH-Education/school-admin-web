import type { FeeHead } from '@/features/fees/types'

// The payment dates and the split come from the feature (one copy of the rules). This file adds
// what only the server needs: how the discount is shared between the two fee heads.
export { daysBetween, dueDates, firstOfMonthAfter, splitAmount } from '@/features/fees/schedule'

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
