import { formatInr, formatLoad } from '@/lib/format'
import { Tile, TileRow } from '@/ui/Tile'
import { fleetTotals } from '../loadMath'
import type { LoadBoardRow } from '../types'

/** Children, seats, load, cost per child, fee got per child and the yearly loss. */
export function FleetTiles({ rows }: { rows: LoadBoardRow[] }) {
  const t = fleetTotals(rows)
  const loss = t.surplus < 0
  return (
    <TileRow label="Fleet summary">
      <Tile label="Children on buses" value={t.children} />
      <Tile label="Seats" value={t.seats} />
      <Tile label="Fleet load" value={formatLoad(t.load)} tone={t.load > 1 ? 'bad' : 'ink'} />
      <Tile label="Cost per child" value={formatInr(Math.round(t.costPerChild))} />
      <Tile label="Fee got per child" value={formatInr(Math.round(t.feePerChild))} />
      <Tile
        label={loss ? 'Yearly loss' : 'Yearly surplus'}
        value={formatInr(Math.round(t.surplus))}
        tone={loss ? 'bad' : 'ink'}
      />
    </TileRow>
  )
}
