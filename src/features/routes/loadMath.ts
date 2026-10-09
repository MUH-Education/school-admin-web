import { formatInr } from '@/lib/format'
import type { LoadBoardRow } from './types'

export interface FleetTotals {
  children: number
  seats: number
  /** children ÷ seats */
  load: number
  /** Yearly cost of all vehicles ÷ children. */
  costPerChild: number
  /** Fee got ÷ children. */
  feePerChild: number
  /** Fee got minus cost. Negative is a loss. */
  surplus: number
}

/** The six numbers on top of the page, counted from the load-board rows. */
export function fleetTotals(rows: LoadBoardRow[]): FleetTotals {
  const children = rows.reduce((sum, r) => sum + r.children, 0)
  const seats = rows.reduce((sum, r) => sum + r.seats, 0)
  const cost = rows.reduce((sum, r) => sum + r.yearlyCost, 0)
  const feeGot = rows.reduce((sum, r) => sum + r.feeGot, 0)
  return {
    children,
    seats,
    load: seats > 0 ? children / seats : 0,
    costPerChild: children > 0 ? cost / children : 0,
    feePerChild: children > 0 ? feeGot / children : 0,
    surplus: feeGot - cost,
  }
}

/** "Over by 5 · run twice or use a bigger bus" — the words under a route's seat bar. */
export function verdictText(row: LoadBoardRow): string {
  if (row.verdict === 'OVER') return `Over by ${row.overBy} · run twice or use a bigger bus`
  if (row.verdict === 'LOW') return `${row.spare} seats empty · fill these first`
  return 'Within seats'
}

export function perChildText(row: LoadBoardRow): string {
  return row.children > 0
    ? `${formatInr(Math.round(row.costPerChild))} per child`
    : 'No children yet'
}

/** The school year runs April to March: 7 Oct 2026 → "2026–27". */
export function sessionLabel(now: Date = new Date()): string {
  const year = Number(
    new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: 'Asia/Kolkata' }).format(now),
  )
  const month = Number(
    new Intl.DateTimeFormat('en-GB', { month: 'numeric', timeZone: 'Asia/Kolkata' }).format(now),
  )
  const start = month >= 4 ? year : year - 1
  return `${start}–${String(start + 1).slice(-2)}`
}
