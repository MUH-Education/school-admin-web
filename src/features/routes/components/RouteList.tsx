import { formatLoad } from '@/lib/format'
import { vehicleTypeLabels } from '@/features/vehicles/labels'
import { SeatMeter } from '@/ui/SeatMeter'
import { StatusDot, type StatusTone } from '@/ui/StatusDot'
import { perChildText, verdictText } from '../loadMath'
import type { LoadBoardRow, Verdict } from '../types'

const tones: Record<Verdict, StatusTone> = { OVER: 'bad', OK: 'good', LOW: 'dust' }

interface Props {
  rows: LoadBoardRow[]
  selectedId: number | null
  onSelect: (routeId: number) => void
}

/** One button per route. The pressed one fills the panel on the right. */
export function RouteList({ rows, selectedId, onSelect }: Props) {
  return (
    <section aria-label="All routes" className="flex min-w-0 flex-[1_1_400px] flex-col gap-2.5">
      <h2 className="text-[15px] font-semibold">All {rows.length} routes</h2>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const selected = row.routeId === selectedId
          return (
            <li key={row.routeId}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(row.routeId)}
                className={`block w-full cursor-pointer border-2 px-3.5 pt-3 pb-[13px] text-left ${
                  selected ? 'border-canal bg-canal-soft' : 'border-rule bg-panel'
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[14.5px] font-semibold">
                    {row.name}{' '}
                    <span className="text-[12.5px] font-normal text-ink-soft">
                      {row.vehicleType ? vehicleTypeLabels[row.vehicleType] : 'No vehicle'}
                    </span>
                  </span>
                  <span className="font-mono text-[13px]">
                    {row.children} / {row.seats}
                  </span>
                </span>
                <SeatMeter count={row.children} seats={row.seats} />
                <span className="mt-[9px] flex items-baseline justify-between gap-2">
                  <StatusDot tone={tones[row.verdict]}>{verdictText(row)}</StatusDot>
                  <span className="font-mono text-xs text-ink-soft">{perChildText(row)}</span>
                </span>
                <span className="sr-only">Load {formatLoad(row.load)}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[12.5px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 bg-canal" />
          Children with a seat
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3.5 w-0.5 bg-ink" />
          All seats full
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 bg-bad" />
          Children without a seat
        </span>
      </div>
    </section>
  )
}
