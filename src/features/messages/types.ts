// Shapes of /messages. docs/backend/api.md gives the URLs and the filters; the JSON answers are
// my guess (docs/08-decisions.md, part D, 9 Oct 2026).

/** `TEST_ONLY` means the school is in test mode: the SMS was made but not sent to the parent. */
export type MessageStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'TEST_ONLY'

export const messageStatuses: MessageStatus[] = ['SENT', 'QUEUED', 'FAILED', 'TEST_ONLY']

/** The four events of a child's day that can make an SMS. */
export type MessageEvent = 'BOARDED_MORNING' | 'REACHED_SCHOOL' | 'BOARDED_EVENING' | 'REACHED_HOME'

/** One row of GET /messages. */
export interface Message {
  id: number
  studentId: number
  /** "Mohit" */
  studentName: string
  /** The server hides the phone: "+91XXXXXX4321". The web app shows it as it comes. */
  phone: string
  event: MessageEvent
  /** The Hindi text of the SMS. */
  text: string
  status: MessageStatus
  /** ISO time the message was made. */
  createdAt: string
  /** ISO time the provider took it. Only when `status` is SENT. */
  sentAt: string | null
  /** The reason, only when `status` is FAILED. */
  error: string | null
}

/** The answer of GET /messages: one page of one day. */
export interface MessagePage {
  /** The day shown, "2026-10-07". Without `?date=` the server uses today. */
  date: string
  items: Message[]
  /** First page is 1. */
  page: number
  pageSize: number
  /** All messages of the day that match the filters. */
  total: number
}

/** The answer of GET /messages/summary?date=: the counts of one whole day. */
export interface MessageSummary {
  date: string
  queued: number
  sent: number
  failed: number
  /** Rows in test mode. The page shows the amber box when this is more than 0. */
  testOnly: number
}

/** The filters of the list. They live in the address: /messages?date=2026-10-07&status=FAILED */
export interface MessageFilters {
  /** ISO date. Empty means today. */
  date: string
  status: MessageStatus | ''
  /** Part of the child's name. */
  q: string
  page: number
}

/**
 * What One bus shows in "SMS to parent": the newest event of the child.
 * `NONE_THIS_EVENT` and `NO_SMS_CLASS` follow the class rule; `NONE` is a dash.
 */
export type ChildSmsState =
  'SENT' | 'QUEUED' | 'FAILED' | 'TEST_ONLY' | 'NONE_THIS_EVENT' | 'NO_SMS_CLASS' | 'NONE'

export interface ChildSms {
  state: ChildSmsState
  /** ISO time. Only when `state` is SENT. */
  sentAt: string | null
}
