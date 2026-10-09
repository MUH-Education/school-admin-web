import { formatDate } from '@/lib/format'
import { Tile, TileRow } from '@/ui/Tile'
import type { BusStatusRoute } from '../types'

interface DetailTilesProps {
  route: BusStatusRoute
  /** The day shown, "2026-10-07". A certificate that ended before it is shown in red. */
  date: string
  fitnessValidTill: string | null
}

/** The five tiles on One bus. */
export function DetailTiles({ route, date, fitnessValidTill }: DetailTilesProps) {
  const toBoard = route.total - route.boarded - route.absent
  const over = route.total - route.seats
  const ended = fitnessValidTill !== null && fitnessValidTill < date
  return (
    <TileRow label="Summary">
      <Tile
        label="Boarded"
        value={
          <>
            {route.boarded}{' '}
            <span className="text-[13px] font-normal text-ink-soft">of {route.total}</span>
          </>
        }
      />
      <Tile label="Absent" value={route.absent} />
      <Tile label="Still to board" value={toBoard} />
      <Tile
        label="Seats in this van"
        value={
          <>
            {route.seats}{' '}
            {over > 0 ? (
              <span className="text-[13px] font-semibold text-bad">over by {over}</span>
            ) : (
              <span className="text-[13px] font-normal text-ink-soft">{-over} free</span>
            )}
          </>
        }
      />
      <Tile
        label="Fitness certificate"
        value={
          <span className={`block pt-2 text-[15px] ${ended ? 'text-bad' : ''}`}>
            {fitnessValidTill === null
              ? 'Not recorded'
              : `${ended ? 'Ended' : 'Valid till'} ${formatDate(fitnessValidTill)}`}
          </span>
        }
      />
    </TileRow>
  )
}
