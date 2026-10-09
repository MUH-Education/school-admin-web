import type { UseQueryResult } from '@tanstack/react-query'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { Tile, TileRow } from '@/ui/Tile'
import type { AnalyticsSummary } from '../types'

const small = 'text-[13px] font-normal text-ink-soft'

const percent = (value: number | null) => (value === null ? '–' : `${value}%`)

/** The five tiles. The red number is the students with money still to pay. */
export function SummaryTiles({ query }: { query: UseQueryResult<AnalyticsSummary> }) {
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  }
  const summary = query.data
  if (!summary) return <LoadingBlock label="Loading the numbers…" />

  const stale = query.isPlaceholderData
  const busShare =
    summary.students === 0 ? '–' : `${Math.round((summary.usesBus / summary.students) * 100)}%`
  return (
    <div
      aria-busy={stale || undefined}
      className={`transition-opacity ${stale ? 'opacity-60' : ''}`}
    >
      <TileRow label="Summary">
        <Tile valueClass="leading-[1.4]" label="Students" value={summary.students} />
        <Tile
          valueClass="leading-[1.4]"
          label="Using the bus"
          value={
            <>
              {summary.usesBus} <span className={small}>· {busShare}</span>
            </>
          }
        />
        <Tile
          valueClass="leading-[1.4]"
          label="School fee collected"
          value={
            <>
              {percent(summary.schoolFeePercent)} <span className={small}>of due</span>
            </>
          }
        />
        <Tile
          valueClass="leading-[1.4]"
          label="Bus fee collected"
          value={
            <>
              {percent(summary.busFeePercent)} <span className={small}>of due</span>
            </>
          }
        />
        <Tile
          valueClass="leading-[1.4]"
          label="Fee pending"
          tone="bad"
          value={
            <>
              {summary.feePending}{' '}
              <span className={small}>{summary.feePending === 1 ? 'student' : 'students'}</span>
            </>
          }
        />
      </TileRow>
    </div>
  )
}
