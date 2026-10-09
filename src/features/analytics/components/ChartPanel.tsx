import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingBlock } from '@/ui/LoadingBlock'

interface ChartPanelProps {
  /** Names the box for screen readers and is the title. */
  title: string
  subtitle: string
  /** The key of the chart, on the right of the title. */
  legend?: ReactNode
  children: ReactNode
}

/** A white box of Analytics.dc.html: title, small grey line, and the chart under them. */
export function ChartPanel({ title, subtitle, legend, children }: ChartPanelProps) {
  return (
    <section
      aria-label={title}
      className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 border border-rule bg-panel px-[22px] pt-5 pb-[22px]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <div className="text-[12.5px] text-ink-soft">{subtitle}</div>
        </div>
        {legend}
      </div>
      {children}
    </section>
  )
}

interface PanelBodyProps<T> {
  query: UseQueryResult<T>
  /** The loading and error boxes are at least this high (the chart's height), so the box does not jump. */
  minHeight: number
  children: (data: T) => ReactNode
}

/**
 * The four states of a box: loading, error with Retry, and the data. (An empty answer is drawn by
 * the chart itself, in the place and at the height of the chart.) While a new filter loads, the
 * old numbers stay and fade a little.
 */
export function PanelBody<T>({ query, minHeight, children }: PanelBodyProps<T>) {
  if (query.isError) {
    return (
      <div style={{ minHeight }}>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }
  if (query.data === undefined) {
    return (
      <div style={{ minHeight }} className="flex flex-col [&>*]:flex-1">
        <LoadingBlock />
      </div>
    )
  }
  return <Faded stale={query.isPlaceholderData}>{children(query.data)}</Faded>
}

/** The old numbers of the last filter, a little faded, until the new ones arrive. */
export function Faded({ stale, children }: { stale: boolean; children: ReactNode }) {
  return (
    <div
      aria-busy={stale || undefined}
      className={`flex flex-col gap-4 transition-opacity ${stale ? 'opacity-60' : ''}`}
    >
      {children}
    </div>
  )
}

export const NO_MATCH = 'No students match these filters'
