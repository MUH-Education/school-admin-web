import { formatInr } from '@/lib/format'
import { vehicleTypeLabels } from '@/features/vehicles/labels'
import type { VehicleType } from '@/features/vehicles/types'
import { fleetTotals } from './loadMath'
import type { LoadBoardRow } from './types'

export interface InsightPart {
  text: string
  strong?: boolean
}

export interface Insight {
  id: string
  parts: InsightPart[]
}

export function insightText(insight: Insight): string {
  return insight.parts.map((p) => p.text).join('')
}

const hundred = (n: number) => Math.round(n / 100) * 100

function children(n: number): string {
  return n === 1 ? '1 child' : `${n} children`
}
function seats(n: number): string {
  return n === 1 ? '1 seat' : `${n} seats`
}

/** One sentence about seats: too few seats, or children spread badly, or enough for all. */
function seatSentence(rows: LoadBoardRow[]): Insight {
  const without = rows.reduce((sum, r) => sum + r.overBy, 0)
  const empty = rows.reduce((sum, r) => sum + r.spare, 0)
  if (without === 0) {
    return {
      id: 'seats',
      parts: [
        { text: 'Every child has a seat.', strong: true },
        {
          text:
            empty > 0 ? ` ${seats(empty)} are empty, so some routes can take more children.` : '',
        },
      ],
    }
  }
  const lead: InsightPart[] = [
    { text: children(without), strong: true },
    { text: ` ${without === 1 ? 'travels' : 'travel'} without a seat, and ` },
    { text: seats(empty), strong: true },
    { text: ` ${empty === 1 ? 'is' : 'are'} empty. ` },
  ]
  return {
    id: 'seats',
    parts: [
      ...lead,
      {
        text:
          empty === 0
            ? 'So the problem is too few seats, not children spread badly across routes.'
            : 'So part of the problem is how children are spread: fill the routes with empty seats first.',
      },
    ],
  }
}

function worstSentence(rows: LoadBoardRow[]): Insight | null {
  const over = rows.filter((r) => r.verdict === 'OVER')
  if (over.length === 0) return null
  const worst = [...over].sort((a, b) => b.load - a.load)[0]
  if (!worst) return null
  const start =
    over.length === rows.length
      ? 'Every route is over.'
      : `${over.length} of ${rows.length} routes are over.`
  return {
    id: 'worst',
    parts: [
      {
        text: `${start} ${worst.name} is the worst: ${children(worst.children)} on ${seats(worst.seats)}.`,
      },
    ],
  }
}

/** "Mid bus routes cost about ₹7,300 per child. Small van routes cost ₹12,300 to ₹17,500 per child." */
function costSentence(rows: LoadBoardRow[]): Insight | null {
  const groups = new Map<VehicleType, number[]>()
  for (const r of rows) {
    if (!r.vehicleType || r.children === 0) continue
    groups.set(r.vehicleType, [...(groups.get(r.vehicleType) ?? []), r.costPerChild])
  }
  if (groups.size < 2) return null
  const parts = [...groups.entries()]
    .map(([type, costs]) => {
      const low = Math.min(...costs)
      const high = Math.max(...costs)
      const average = costs.reduce((a, b) => a + b, 0) / costs.length
      const range =
        high - low <= high * 0.05
          ? `about ${formatInr(hundred(average))}`
          : `${formatInr(hundred(low))} to ${formatInr(hundred(high))}`
      return { average, text: `${vehicleTypeLabels[type]} routes cost ${range} per child.` }
    })
    .sort((a, b) => a.average - b.average)
  return { id: 'cost', parts: [{ text: parts.map((p) => p.text).join(' ') }] }
}

function moneySentence(rows: LoadBoardRow[]): Insight | null {
  const t = fleetTotals(rows)
  if (t.children === 0) return null
  const base = `The school gets ${formatInr(Math.round(t.feePerChild))} per child and spends ${formatInr(Math.round(t.costPerChild))}.`
  if (t.surplus < 0) {
    return {
      id: 'money',
      parts: [
        {
          text: `${base} The gap is about ${formatInr(hundred(t.costPerChild - t.feePerChild))} for each of ${t.children} children. That is the yearly loss of ${formatInr(-Math.round(t.surplus)).replace('−', '')}.`,
        },
      ],
    }
  }
  return {
    id: 'money',
    parts: [
      { text: `${base} That leaves a yearly surplus of ${formatInr(Math.round(t.surplus))}.` },
    ],
  }
}

/** The sentences under "What this page is telling you", made from the load-board numbers. */
export function loadBoardInsights(rows: LoadBoardRow[]): Insight[] {
  if (rows.length === 0) return []
  return [seatSentence(rows), worstSentence(rows), costSentence(rows), moneySentence(rows)].filter(
    (i): i is Insight => i !== null,
  )
}
