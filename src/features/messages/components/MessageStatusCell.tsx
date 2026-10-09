import { formatTime } from '@/lib/format'
import { StatusDot } from '@/ui/StatusDot'
import type { Message } from '../types'

/** The status of one SMS: a small square and words, and the reason under a failed one. */
export function MessageStatusCell({ message }: { message: Message }) {
  switch (message.status) {
    case 'SENT':
      return (
        <StatusDot tone="good">
          {message.sentAt ? `Sent ${formatTime(message.sentAt)}` : 'Sent'}
        </StatusDot>
      )
    case 'QUEUED':
      return <StatusDot tone="canal">Waiting</StatusDot>
    case 'FAILED':
      return (
        <div className="flex flex-col gap-0.5">
          <StatusDot tone="bad">Failed</StatusDot>
          {message.error && <div className="text-[12.5px] text-bad">{message.error}</div>}
        </div>
      )
    case 'TEST_ONLY':
      return <StatusDot tone="muted">Test only, not sent</StatusDot>
  }
}
