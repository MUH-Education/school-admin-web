import { formatDayClock, formatTime } from '@/lib/format'
import type { ChildSms } from '@/features/messages/types'

/** "9 A" → "9". The class rule note names the class: "None (Class 11)". */
function classOf(className: string): string {
  return /\d+/.exec(className)?.[0] ?? className
}

/**
 * One short line for the newest event of the child (BusDetail.dc.html): 12.5px, soft grey.
 * "Failed" is red. The server decides what was sent; the class rule is only explained here.
 */
export function SmsCell({ sms, className }: { sms: ChildSms; className: string }) {
  switch (sms.state) {
    case 'SENT':
      return <>{sms.sentAt ? `Sent ${formatDayClock(formatTime(sms.sentAt))}` : 'Sent'}</>
    case 'QUEUED':
      return <>Waiting</>
    case 'FAILED':
      return <span className="font-semibold text-bad">Failed</span>
    case 'TEST_ONLY':
      return <>Test only, not sent</>
    case 'NONE_THIS_EVENT':
      return <>{`None for this event (Class ${classOf(className)})`}</>
    case 'NO_SMS_CLASS':
      return <>{`None (Class ${classOf(className)})`}</>
    case 'NONE':
      return (
        <>
          <span aria-hidden="true">—</span>
          <span className="sr-only">No SMS yet</span>
        </>
      )
  }
}
