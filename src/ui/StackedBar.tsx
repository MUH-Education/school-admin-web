import { chartBackground, type ChartColor } from './chartColors'
import { partWidths, stackedMinHeight } from './chartMath'

export interface StackedPart {
  value: number
  color: ChartColor
  /** The exact value of this part: "Government employee: 41 on time". */
  title: string
}

export interface StackedRow {
  name: string
  /** The words on the right of the name: "82 students · 56% on time". */
  note: string
  parts: StackedPart[]
  /** The words for the whole bar: "Farmer: 46 on time, 27 delayed, 9 defaulted". */
  title: string
}

interface StackedBarProps {
  rows: StackedRow[]
  /** The list keeps the height of this many rows, so a filter does not make the page jump. */
  reserveRows?: number
  /** Shown in place of the bars when there are none. It keeps the height of `reserveRows` rows. */
  emptyMessage?: string
}

/** One bar per row, split in parts with 2px gaps. The width of the whole bar is always the row. */
export function StackedBar({ rows, reserveRows = 8, emptyMessage }: StackedBarProps) {
  const minHeight = stackedMinHeight(reserveRows)
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
  return (
    <div className="flex flex-col gap-[11px]" style={{ minHeight }}>
      {rows.map((row) => {
        const widths = partWidths(row.parts)
        return (
          <div key={row.name} className="flex flex-col gap-[5px]">
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
              <span className="text-[13px] font-medium">{row.name}</span>
              <span className="font-mono text-[12px] text-ink-soft">{row.note}</span>
            </div>
            <div title={row.title} className="flex h-3 gap-0.5 bg-paper">
              {row.parts.map((part, k) => (
                <div
                  key={part.title}
                  title={part.title}
                  className={chartBackground[part.color]}
                  style={{ width: `${Math.round((widths[k] ?? 0) * 100) / 100}%` }}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
