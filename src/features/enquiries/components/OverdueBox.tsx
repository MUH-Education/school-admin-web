import { Button } from '@/ui/Button'
import { Panel } from '@/ui/Panel'

interface OverdueBoxProps {
  /** How many open enquiries are late. The box is not shown for 0. */
  count: number
  /** True while the list shows only the late ones. */
  active: boolean
  onToggle: () => void
}

/** The amber box: "4 follow-ups are overdue" with the button that filters the list. */
export function OverdueBox({ count, active, onToggle }: OverdueBoxProps) {
  if (count === 0) return null
  return (
    <Panel
      tone="dust"
      aria-label="Overdue follow-ups"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3.5"
    >
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-0.5">
        <div className="font-semibold">
          {count} {count === 1 ? 'follow-up is' : 'follow-ups are'} overdue
        </div>
        <div className="text-[13.5px] text-ink-soft">
          These parents were promised a call and did not get one. Call them today.
        </div>
      </div>
      <Button variant="outline" className="px-4!" aria-pressed={active} onClick={onToggle}>
        {active ? 'Show all enquiries' : 'Show only overdue'}
      </Button>
    </Panel>
  )
}
