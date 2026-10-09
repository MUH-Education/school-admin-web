import type { ReactNode } from 'react'

interface RouteFullBoxProps {
  routeName: string
  /** Children on the route now, before this one. */
  onBoard: number
  seats: number
  /** Who is meant, for example "Ishaan" or "This child". */
  who: string
  /** A link or button on the right, for example "See Routes and load". */
  action?: ReactNode
}

/** "Route 9 is already full." A warning, not a stop: the person can still save. */
export function RouteFullBox({ routeName, onBoard, seats, who, action }: RouteFullBoxProps) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 border border-bad px-4 py-3 text-sm"
    >
      <span>
        <strong className="text-bad">{routeName} is already full.</strong> It has {onBoard} children
        on {seats} seats. {who} will be number {onBoard + 1}.
      </span>
      {action}
    </div>
  )
}
