import { seatMeterWidths } from './seatMeterWidths'

interface SeatMeterProps {
  /** Children on the route. */
  count: number
  seats: number
}

/**
 * Blue from the left up to the seat line in the middle. Red after the line.
 * Example: 19 children on 14 seats → blue is full, red is 5 ÷ 14 of the right half.
 */
export function SeatMeter({ count, seats }: SeatMeterProps) {
  const { blue, red } = seatMeterWidths(count, seats)
  const without = Math.max(0, count - seats)
  const text =
    without > 0
      ? `${count} children on ${seats} seats, ${without} without a seat`
      : `${count} children on ${seats} seats`
  return (
    <span
      role="img"
      aria-label={text}
      className="relative mt-2.5 block h-3 border border-rule bg-paper"
    >
      <span
        data-part="blue"
        className="absolute inset-y-0 left-0 bg-canal"
        style={{ width: `${blue}%` }}
      />
      <span
        data-part="red"
        className="absolute inset-y-0 left-1/2 bg-bad"
        style={{ width: `${red}%` }}
      />
      <span className="absolute -inset-y-1 left-1/2 -ml-px w-0.5 bg-ink" />
    </span>
  )
}
