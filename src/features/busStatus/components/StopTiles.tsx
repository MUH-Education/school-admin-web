import { formatDayClock } from '@/lib/format'
import { countAtStop } from '../detail'
import type { BusChildRow, BusPhase, BusStatusRoute } from '../types'

const labelClass = 'font-mono text-[11px] tracking-[0.08em] uppercase'

interface StopTilesProps {
  route: BusStatusRoute
  rows: BusChildRow[]
  phase: BusPhase
}

/** "Stops, in order": one tile per stop, then School. */
export function StopTiles({ route, rows, phase }: StopTilesProps) {
  const reached = route.school.reachedAt
  return (
    <section aria-label="Stops" className="flex flex-col gap-2.5">
      <h2 className="text-[15px] font-semibold">Stops, in order</h2>
      <ol
        className="m-0 grid list-none gap-px border border-rule bg-rule p-0"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))' }}
      >
        {route.stops.map((stop, index) => {
          const counts = countAtStop(rows, stop.name, phase)
          const done = stop.state === 'DONE'
          const next = stop.state === 'NEXT'
          const waiting = `${counts.waiting} ${counts.waiting === 1 ? 'child' : 'children'} waiting`
          return (
            <li
              key={`${index}-${stop.name}`}
              className={`flex flex-col gap-1.5 border-t-4 px-4 py-3.5 ${next ? 'bg-canal-soft' : 'bg-panel'} ${stop.state === 'LATER' ? 'border-t-rule-mid' : 'border-t-canal'}`}
            >
              <div className={`${labelClass} ${next ? 'text-ink' : 'text-ink-soft'}`}>
                Stop {index + 1} · {done ? 'done' : next ? 'next' : 'later'}
              </div>
              <div className="text-base font-semibold">{stop.name}</div>
              <div className="font-mono text-[12.5px]">
                {done && stop.tappedAt ? (
                  <>
                    Tapped {formatDayClock(stop.tappedAt)}{' '}
                    <span className="text-ink-soft">· due {formatDayClock(stop.due)}</span>
                  </>
                ) : (
                  <>Due {formatDayClock(stop.due)}</>
                )}
              </div>
              <div className={`text-[13px] ${next ? 'text-ink' : 'text-ink-soft'}`}>
                {done ? `${counts.boarded} boarded, ${counts.absent} absent` : waiting}
              </div>
            </li>
          )
        })}
        <li
          className={`flex flex-col gap-1.5 border-t-4 bg-panel px-4 py-3.5 ${reached ? 'border-t-good' : 'border-t-rule-mid'}`}
        >
          <div className={`${labelClass} text-ink-soft`}>End</div>
          <div className="text-base font-semibold">School</div>
          <div className="font-mono text-[12.5px]">
            {reached
              ? `Reached ${formatDayClock(reached)}`
              : `Due ${formatDayClock(route.school.due)}`}
          </div>
          <div className="text-[13px] text-ink-soft">All children get off</div>
        </li>
      </ol>
    </section>
  )
}
