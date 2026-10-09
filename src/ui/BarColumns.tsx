import { percentOf } from './chartMath'
import { chartBackground, type ChartColor } from './chartColors'

export interface Bar {
  /** Null: nothing to measure. The bar has no height. */
  value: number | null
  color: ChartColor
  /** The exact value, shown on hover: "School fee, Sep: 79% collected". */
  title: string
}

export interface BarGroup {
  /** The small text under the bars: "Sep", "LKG". */
  label: string
  bars: Bar[]
}

interface BarColumnsProps {
  /** Names the chart for screen readers. */
  label: string
  groups: BarGroup[]
  /** The value at the top line. A bar of this value fills the whole height. Bars start at zero. */
  max: number
  /** The words on the left axis, top to bottom: ["100%", "50%", "0%"]. They sit on the grid lines. */
  ticks: [string, string, string]
  /** `grouped`: a few bars side by side per label (chart 1). `single`: one thin bar per label (chart 3). */
  variant: 'grouped' | 'single'
  /** Height of the drawing area in pixels (the line at the bottom is extra, as in the design). */
  height: number
  /** Width of the axis words in pixels. */
  axisWidth: number
  /** Shown in place of the chart when there is nothing to draw. It keeps the height of the chart. */
  emptyMessage?: string
}

/** The 11px label under the bars: 11 × 1.4 line height. */
const LABEL_ROW = 15.4

/**
 * Columns with a left axis (top, middle, 0) and two thin grid lines. Built with `div`s; no chart
 * library (decision B6). Bars start at zero and never get a number printed on them: the exact value
 * is in the `title` of each bar.
 */
export function BarColumns({
  label,
  groups,
  max,
  ticks,
  variant,
  height,
  axisWidth,
  emptyMessage,
}: BarColumnsProps) {
  const grouped = variant === 'grouped'

  if (emptyMessage) {
    return (
      <div
        role="img"
        aria-label={`${label}: ${emptyMessage}`}
        className="flex items-center justify-center bg-paper px-4 text-center text-ink-soft"
        style={{ height: height + 1 + 8 + LABEL_ROW }}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div role="img" aria-label={label} className="flex gap-2.5">
      <div
        aria-hidden="true"
        className="-my-[5.5px] flex flex-none flex-col items-end justify-between font-mono text-[11px] leading-none text-ink-soft"
        style={{ width: axisWidth, height: height + 11 }}
      >
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="relative box-content border-b border-rule-mid" style={{ height }}>
          <div className="absolute top-0 right-0 left-0 h-px bg-chart-grid" />
          <div className="absolute top-1/2 right-0 left-0 h-px bg-chart-grid" />
          <div
            className={`absolute inset-0 flex items-end ${grouped ? 'justify-around gap-2 px-2' : 'gap-0.5 px-1'}`}
          >
            {groups.map((group) => (
              <div
                key={group.label}
                className={
                  grouped
                    ? 'flex h-full max-w-[72px] flex-[1_1_0] items-end justify-center gap-0.5'
                    : 'flex h-full flex-[1_1_0] items-end justify-center'
                }
              >
                {group.bars.map((bar) => (
                  <div
                    key={bar.title}
                    title={bar.title}
                    className={`${chartBackground[bar.color]} ${grouped ? 'w-5' : 'w-full max-w-6'}`}
                    style={{ height: `${percentOf(bar.value, max)}%` }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className={`flex ${grouped ? 'justify-around gap-2 px-2' : 'gap-0.5 px-1'}`}>
          {groups.map((group) => (
            <div
              key={group.label}
              className={`flex-[1_1_0] text-center font-mono text-[11px] text-ink-soft ${grouped ? 'max-w-[72px]' : ''}`}
            >
              {group.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
