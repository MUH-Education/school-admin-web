import { Link } from 'react-router'
import { vehicleTypeLabels } from '@/features/vehicles/labels'
import { formatDayClock } from '@/lib/format'
import { StatusDot } from '@/ui/StatusDot'
import { StopStrip } from '@/ui/StopStrip'
import { routeStateLabel } from '../labels'
import type { BusStatusRoute } from '../types'

const borders: Partial<Record<BusStatusRoute['state'], string>> = {
  NO_TAPS: 'border-bad',
  LATE: 'border-dust',
}

/** The time that goes after the state words: the arrival at school or the start time. */
function stateTime(route: BusStatusRoute): string | null {
  if (route.state === 'REACHED_SCHOOL' && route.school.reachedAt) {
    return formatDayClock(route.school.reachedAt)
  }
  if (route.state === 'NOT_STARTED' && route.startsAt) return formatDayClock(route.startsAt)
  return null
}

interface BusRouteRowProps {
  route: BusStatusRoute
  /** Where "View children" goes. It keeps the phase of the page. */
  detailTo: string
}

/** One bus: who and what on the left, the stops in the middle, the state and the count on the right. */
export function BusRouteRow({ route, detailTo }: BusRouteRowProps) {
  const label = routeStateLabel(route.state, route.lateMinutes, stateTime(route))
  const absentText =
    route.state === 'NO_TAPS' && route.lateMinutes > 0
      ? `${route.lateMinutes} minutes behind`
      : `${route.absent} absent`
  return (
    <article
      aria-label={route.name}
      className={`flex flex-wrap items-center gap-x-7 gap-y-4 border bg-panel px-5 py-4 ${borders[route.state] ?? 'border-rule'}`}
    >
      <div className="flex flex-[0_1_190px] flex-col gap-[3px]">
        <h3 className="text-base font-semibold">{route.name}</h3>
        <div className="font-mono text-xs text-ink-soft">
          {vehicleTypeLabels[route.vehicleType]} · {route.seats} seats
        </div>
        <div className="text-[12.5px] text-ink-soft">Attendant: {route.attendant}</div>
      </div>
      <div className="flex min-w-0 flex-[1_1_420px]">
        <StopStrip stops={route.stops} school={route.school} noTaps={route.state === 'NO_TAPS'} />
      </div>
      <div className="flex flex-[0_1_190px] flex-col items-start gap-[5px]">
        <StatusDot tone={label.tone}>{label.text}</StatusDot>
        <div className="font-mono text-xl font-semibold">
          {route.boarded}{' '}
          <span className="text-[13px] font-normal text-ink-soft">of {route.total} boarded</span>
        </div>
        <div className="text-[12.5px] text-ink-soft">
          {absentText} ·{' '}
          <Link to={detailTo} className="text-canal underline">
            View children <span className="sr-only">of {route.name}</span>
          </Link>
        </div>
      </div>
    </article>
  )
}
