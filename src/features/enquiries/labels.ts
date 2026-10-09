import type { StatusTone } from '@/ui/StatusDot'
import { formatDayMonth } from '@/lib/format'
import type { ClassName } from '@/features/students/types'
import type { EnquiryRow, EnquiryStatus } from './types'

/** The colour of the small square, as in the Enquiry list design. */
export const statusTones: Record<EnquiryStatus, StatusTone> = {
  NEW: 'canal',
  CONTACTED: 'grey',
  VISITED: 'dust',
  APPLIED: 'ink',
  ADMITTED: 'good',
  LOST: 'bad',
}

/** The Class column is short: "Class 6" is "6", the nursery classes keep their names. */
export function shortClass(className: ClassName): string {
  return className.replace(/^Class /, '')
}

/** The words before the date, by stage. The design shows these four. */
const nextStepWords: Partial<Record<EnquiryStatus, string>> = {
  NEW: 'Call by',
  CONTACTED: 'School visit on',
  VISITED: 'Call by',
  APPLIED: 'Documents due',
}

export interface NextStepText {
  text: string
  /** Red and bold. */
  overdue: boolean
  /** A dash, shown in the quiet colour. */
  empty: boolean
}

/** The Next step cell: "Call by 7 Oct", "Overdue since 5 Oct", "Reason: fee too high" or a dash. */
export function nextStepText(
  row: Pick<EnquiryRow, 'status' | 'nextStepDate' | 'overdue' | 'lostReason'>,
): NextStepText {
  if (row.status === 'LOST') {
    return {
      text: row.lostReason ? `Reason: ${row.lostReason}` : '—',
      overdue: false,
      empty: !row.lostReason,
    }
  }
  if (!row.nextStepDate || row.status === 'ADMITTED')
    return { text: '—', overdue: false, empty: true }
  const date = formatDayMonth(row.nextStepDate)
  if (row.overdue) return { text: `Overdue since ${date}`, overdue: true, empty: false }
  return { text: `${nextStepWords[row.status] ?? 'Call by'} ${date}`, overdue: false, empty: false }
}

/** The button that moves an enquiry to a stage. */
export const moveLabels: Record<EnquiryStatus, string> = {
  NEW: 'Reopen as New',
  CONTACTED: 'Mark as Contacted',
  VISITED: 'Mark as Visited',
  APPLIED: 'Mark as Applied',
  ADMITTED: 'Mark as Admitted',
  LOST: 'Mark as lost',
}
