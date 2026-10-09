import { formatDayClock } from '@/lib/format'

export interface StripStop {
  name: string
  /** "07:25" */
  due: string
  /** "07:26"; null until the stop is tapped. */
  tappedAt: string | null
  state: 'DONE' | 'NEXT' | 'LATER'
  late?: boolean
}

interface StopStripProps {
  stops: StripStop[]
  /** The last square. `reachedAt` is null while the bus is not there yet. */
  school: { due: string; reachedAt: string | null }
  /** The bus has no taps at all: the next stop is drawn in red. */
  noTaps?: boolean
}

const squareBase = 'size-3 flex-none box-border'

function Square({
  kind,
  noTaps,
}: {
  kind: 'done' | 'next' | 'later' | 'school'
  noTaps?: boolean
}) {
  const style = {
    done: 'bg-canal',
    school: 'bg-good',
    next: `border-2 bg-panel ${noTaps ? 'border-bad' : 'border-canal'}`,
    later: 'border-2 border-rule-mid bg-panel',
  }[kind]
  return <span aria-hidden="true" data-square={kind} className={`${squareBase} ${style}`} />
}

/**
 * Stops as squares on a line, then the School square.
 * The line after a stop is blue only when the bus has also reached the next square.
 */
export function StopStrip({ stops, school, noTaps = false }: StopStripProps) {
  return (
    <ol aria-label="Stops" className="m-0 flex min-w-0 flex-1 list-none items-start p-0">
      {stops.map((stop, index) => {
        const following = stops[index + 1]
        const lineIsBlue =
          stop.state === 'DONE' &&
          (following ? following.state === 'DONE' : school.reachedAt !== null)
        const kind = stop.state === 'DONE' ? 'done' : stop.state === 'NEXT' ? 'next' : 'later'
        const redDue = stop.state === 'NEXT' && noTaps
        return (
          <li
            key={`${index}-${stop.name}`}
            className="flex min-w-0 flex-[1_1_0] flex-col gap-[7px]"
          >
            <div className="flex items-center">
              <Square kind={kind} noTaps={noTaps} />
              <span
                aria-hidden="true"
                className={`h-0.5 flex-1 ${lineIsBlue ? 'bg-canal' : 'bg-rule'}`}
              />
            </div>
            <div
              className={`pr-2 text-[12.5px] leading-[1.2] [overflow-wrap:anywhere] ${stop.state === 'LATER' ? 'text-ink-soft' : 'font-semibold'}`}
            >
              {stop.name}
              <span className="sr-only">
                {stop.state === 'DONE'
                  ? ', done'
                  : stop.state === 'NEXT'
                    ? ', next stop'
                    : ', later'}
              </span>
            </div>
            <div
              className={`font-mono text-[11px] ${redDue ? 'text-bad' : stop.late ? 'text-dust-text' : 'text-ink-soft'}`}
            >
              {stop.state === 'DONE' && stop.tappedAt
                ? `${formatDayClock(stop.tappedAt)}${stop.late ? ', late' : ''}`
                : `due ${formatDayClock(stop.due)}`}
            </div>
          </li>
        )
      })}
      <li className="flex w-16 flex-none flex-col gap-[7px]">
        <div className="flex items-center">
          <Square kind={school.reachedAt ? 'school' : 'later'} />
        </div>
        <div
          className={`text-[12.5px] leading-[1.2] ${school.reachedAt ? 'font-semibold' : 'text-ink-soft'}`}
        >
          School
          <span className="sr-only">{school.reachedAt ? ', reached' : ', not reached yet'}</span>
        </div>
        <div className="font-mono text-[11px] text-ink-soft">
          {school.reachedAt
            ? formatDayClock(school.reachedAt)
            : `due ${formatDayClock(school.due)}`}
        </div>
      </li>
    </ol>
  )
}
