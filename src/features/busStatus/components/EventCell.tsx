import { formatDayClock, formatTime } from '@/lib/format'
import type { ChildEvent } from '../types'

/** One of the four events of a child: a time, "Absent", "Waiting" or a dash (behaviour 12). */
export function EventCell({ event }: { event: ChildEvent }) {
  const base = 'font-mono text-[13px]'
  switch (event.status) {
    case 'DONE':
      return (
        <span className={`${base} font-semibold`}>
          {event.at ? formatDayClock(formatTime(event.at)) : '—'}
        </span>
      )
    case 'ABSENT':
      return <span className={`${base} font-semibold text-bad`}>Absent</span>
    case 'NOT_TRAVELLING':
      return <span className={`${base} font-semibold text-ink-soft`}>Not travelling</span>
    case 'WAITING':
      return <span className={`${base} font-semibold text-ink-soft`}>Waiting</span>
    case 'LATER':
      return (
        <span className={`${base} text-ink-soft`}>
          <span aria-hidden="true">—</span>
          <span className="sr-only">Not yet</span>
        </span>
      )
  }
}
