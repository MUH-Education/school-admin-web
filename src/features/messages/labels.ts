import type { MessageEvent, MessageStatus } from './types'

/** The event words of the Messages table. */
export const eventLabels: Record<MessageEvent, string> = {
  BOARDED_MORNING: 'Boarded morning bus',
  REACHED_SCHOOL: 'Reached school',
  BOARDED_EVENING: 'Boarded evening bus',
  REACHED_HOME: 'Reached home stop',
}

/** The words of the status filter. `QUEUED` is "Waiting" everywhere on the screen. */
export const statusFilterLabels: Record<MessageStatus, string> = {
  SENT: 'Sent',
  QUEUED: 'Waiting',
  FAILED: 'Failed',
  TEST_ONLY: 'Test only',
}

export const TEST_MODE_WORDS = "Test mode. Messages are not going to parents' phones."
