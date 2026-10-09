import { formatTimeAmPm } from '@/lib/format'

interface LiveNoteProps {
  /** The server's time of the last good answer. */
  asOf: string
  /** The last ask failed. The old buses stay on the screen. */
  failed: boolean
}

/** "Live · updated 7:48 am", or in amber "Last updated 7:48 am. Trying again." (behaviour 2, 3). */
export function LiveNote({ asOf, failed }: LiveNoteProps) {
  const time = formatTimeAmPm(asOf)
  return (
    <div
      role="status"
      className={`font-mono text-xs ${failed ? 'font-semibold text-dust-text' : 'text-ink-soft'}`}
    >
      {failed ? `Last updated ${time}. Trying again.` : `Live · updated ${time}`}
    </div>
  )
}
