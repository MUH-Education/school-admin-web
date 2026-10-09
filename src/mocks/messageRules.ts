import type { BusChildEvents, ChildEvent } from '@/features/busStatus/types'
import type { ChildSms, MessageEvent, MessageStatus } from '@/features/messages/types'
import { messageProblems } from './data/messages'

/** From the oldest to the newest event of a day. */
export const eventOrder: { event: MessageEvent; key: keyof BusChildEvents }[] = [
  { event: 'BOARDED_MORNING', key: 'boardedMorning' },
  { event: 'REACHED_SCHOOL', key: 'reachedSchool' },
  { event: 'BOARDED_EVENING', key: 'boardedEvening' },
  { event: 'REACHED_HOME', key: 'reachedHome' },
]

/** "9 A" → 9, "Class 11" → 11, "Nursery" → null. */
export function classNumber(className: string): number | null {
  const match = /(\d+)/.exec(className)
  return match ? Number(match[1]) : null
}

/**
 * The class rule (BusDetail.dc.html): Nursery to Class 8 get all four messages. Class 9 and 10 get
 * only "reached school" and "boarded evening bus". Class 11 and 12 get no bus SMS.
 */
export function smsRule(
  className: string,
  event: MessageEvent,
): 'ALLOWED' | 'NOT_THIS_EVENT' | 'NO_CLASS' {
  const n = classNumber(className)
  if (n === null || n <= 8) return 'ALLOWED'
  if (n >= 11) return 'NO_CLASS'
  return event === 'REACHED_SCHOOL' || event === 'BOARDED_EVENING' ? 'ALLOWED' : 'NOT_THIS_EVENT'
}

/** SENT, unless the sample data says this one failed or still waits. */
export function statusOf(
  studentId: number,
  event: MessageEvent,
): { status: MessageStatus; error: string | null } {
  const problem = messageProblems.find((p) => p.key === `${studentId}:${event}`)
  return problem
    ? { status: problem.status, error: problem.error }
    : { status: 'SENT', error: null }
}

/** What One bus shows for a child: the newest event that has a tap. */
export function childSms(studentId: number, className: string, events: BusChildEvents): ChildSms {
  const newest = [...eventOrder]
    .reverse()
    .find((e) => (events[e.key] as ChildEvent).status === 'DONE')
  if (!newest) return { state: 'NONE', sentAt: null }
  const rule = smsRule(className, newest.event)
  if (rule === 'NO_CLASS') return { state: 'NO_SMS_CLASS', sentAt: null }
  if (rule === 'NOT_THIS_EVENT') return { state: 'NONE_THIS_EVENT', sentAt: null }
  const { status } = statusOf(studentId, newest.event)
  const at = events[newest.key].at
  return { state: status, sentAt: status === 'SENT' ? at : null }
}
