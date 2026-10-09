import { enquiryStatuses, statusLabels, type EnquirySummary, type EnquiryStatus } from '../types'

interface StageTilesProps {
  /** Missing while the numbers load: the tiles show a dash. */
  summary: EnquirySummary | undefined
  /** Empty means "All". */
  active: EnquiryStatus | ''
  onPick: (status: EnquiryStatus | '') => void
}

/** Seven buttons in a row: All and the six stages. The chosen one is dark. */
export function StageTiles({ summary, active, onPick }: StageTilesProps) {
  const tiles: { value: EnquiryStatus | ''; label: string; count: number | undefined }[] = [
    { value: '', label: 'All', count: summary?.total },
    ...enquiryStatuses.map((status) => ({
      value: status,
      label: statusLabels[status],
      count: summary?.byStatus[status],
    })),
  ]
  return (
    <section
      aria-label="Filter by stage"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(130px,100%),1fr))] gap-px border border-rule bg-rule"
    >
      {tiles.map((tile) => {
        const pressed = tile.value === active
        return (
          <button
            key={tile.label}
            type="button"
            aria-pressed={pressed}
            onClick={() => onPick(tile.value)}
            className={`flex cursor-pointer flex-col gap-1 px-4 py-3.5 text-left ${
              pressed ? 'bg-ink text-white' : 'bg-panel text-ink'
            }`}
          >
            <span
              className={`font-mono text-[11px] tracking-[0.08em] uppercase ${
                pressed ? 'text-side-text' : 'text-ink-soft'
              }`}
            >
              {tile.label}
            </span>
            <span
              className={`font-mono text-2xl leading-[1.4] font-semibold ${
                tile.value === 'ADMITTED' && !pressed ? 'text-good' : ''
              }`}
            >
              {tile.count ?? '—'}
            </span>
          </button>
        )
      })}
    </section>
  )
}
