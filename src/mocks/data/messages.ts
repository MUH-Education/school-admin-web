import type { MessageEvent } from '@/features/messages/types'

// All names and numbers are made up. The morning of 7 October 2026 is built from the children of
// Bus status (src/mocks/busStatusLogic.ts). Here are only the exceptions and the test-mode day.

export interface MessageProblem {
  /** `studentId:event`, for example "1003:BOARDED_MORNING". */
  key: `${number}:${MessageEvent}`
  status: 'FAILED' | 'QUEUED'
  error: string | null
}

/** A few failed and waiting messages. Route 4 has none, because BusDetail.dc.html shows it all sent. */
export const messageProblems: MessageProblem[] = [
  { key: '1003:BOARDED_MORNING', status: 'FAILED', error: 'Number not reachable (DND is on)' },
  { key: '6002:BOARDED_MORNING', status: 'FAILED', error: 'Provider rejected the message' },
  { key: '8005:BOARDED_MORNING', status: 'FAILED', error: 'Phone number is not valid' },
  { key: '2023:REACHED_SCHOOL', status: 'QUEUED', error: null },
  { key: '2024:REACHED_SCHOOL', status: 'QUEUED', error: null },
]

export interface TestDayRow {
  studentId: number
  name: string
  event: MessageEvent
  /** "07:26" on the test day. */
  at: string
}

/** The day before: the school was still in test mode, so nothing went to a phone. */
export const TEST_DAY = '2026-10-06'
export const testDayRows: TestDayRow[] = [
  { studentId: 400, name: 'Mohit', event: 'BOARDED_MORNING', at: '07:24' },
  { studentId: 401, name: 'Anjali', event: 'BOARDED_MORNING', at: '07:24' },
  { studentId: 402, name: 'Sahil', event: 'BOARDED_MORNING', at: '07:25' },
  { studentId: 400, name: 'Mohit', event: 'REACHED_SCHOOL', at: '07:52' },
  { studentId: 401, name: 'Anjali', event: 'REACHED_SCHOOL', at: '07:52' },
]
