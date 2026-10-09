import { Tile, TileRow } from '@/ui/Tile'
import type { FleetSummary } from '../summary'
import type { BusPhase } from '../types'

function Unit({ children }: { children: string }) {
  return <span className="text-[13px] font-normal text-ink-soft">{children}</span>
}

/** The five numbers at the top of Bus status. */
export function FleetTiles({ summary, phase }: { summary: FleetSummary; phase: BusPhase | null }) {
  return (
    <TileRow label="Summary">
      <Tile
        label="On the way"
        value={
          <>
            {summary.onTheWay} <Unit>{`of ${summary.buses} buses`}</Unit>
          </>
        }
      />
      <Tile
        label={phase === 'EVENING' ? 'All children home' : 'Reached school'}
        value={
          <>
            {summary.reached} <Unit>{summary.reached === 1 ? 'bus' : 'buses'}</Unit>
          </>
        }
      />
      <Tile
        label="Children boarded"
        value={
          <>
            {summary.boarded} <Unit>{`of ${summary.total}`}</Unit>
          </>
        }
      />
      <Tile label="Marked absent" value={summary.absent} />
      <Tile
        label="Needs attention"
        tone={summary.needAttention > 0 ? 'bad' : 'ink'}
        value={
          <>
            {summary.needAttention} <Unit>{summary.needAttention === 1 ? 'bus' : 'buses'}</Unit>
          </>
        }
      />
    </TileRow>
  )
}
