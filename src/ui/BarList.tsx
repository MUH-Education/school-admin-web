import { barListMinHeight, percentOf } from './chartMath'

export interface BarListRow {
  name: string
  value: number
  /** The exact value, shown on hover: "Jakhal: 31 students". */
  title: string
}

interface BarListProps {
  rows: BarListRow[]
  /** The list keeps the height of this many rows, so a filter does not make the page jump. */
  reserveRows?: number
  emptyMessage?: string
}

/**
 * Horizontal bars, the biggest first. The biggest bar fills the whole track and the others are
 * measured against it. The number is printed at the end of each bar. Bars start at zero.
 */
export function BarList({ rows, reserveRows = 8, emptyMessage }: BarListProps) {
  const minHeight = barListMinHeight(reserveRows)
  if (emptyMessage || rows.length === 0) {
    return (
      <div
        role="img"
        aria-label={emptyMessage}
        className="flex items-center justify-center bg-paper px-4 text-center text-ink-soft"
        style={{ height: minHeight }}
      >
        {emptyMessage}
      </div>
    )
  }
  const sorted = [...rows].sort((a, b) => b.value - a.value)
  const max = sorted[0]?.value ?? 0
  return (
    <div className="flex flex-col gap-[9px]" style={{ minHeight }}>
      {sorted.map((row) => (
        <div key={row.name} className="flex items-center gap-3 text-[13px]">
          <div className="w-[100px] flex-none">{row.name}</div>
          <div className="h-3 min-w-0 flex-1 bg-paper">
            <div
              title={row.title}
              className="h-full bg-chart-1"
              style={{ width: `${percentOf(row.value, max)}%` }}
            />
          </div>
          <div className="w-7 flex-none text-right font-mono text-[12.5px]">{row.value}</div>
        </div>
      ))}
    </div>
  )
}
