import type { UseQueryResult } from '@tanstack/react-query'
import { feeStatusTone } from '@/features/fees/labels'
import { feeStatusLabels, type FeeStatus } from '@/features/fees/types'
import { classAndSection } from '@/features/students/labels'
import { occupationLabels } from '@/features/students/types'
import { formatInr } from '@/lib/format'
import { DataTable, type Column, type GridLayout } from '@/ui/DataTable'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { Pagination } from '@/ui/Pagination'
import { StatusDot } from '@/ui/StatusDot'
import { Button } from '@/ui/Button'
import type { AnalyticsStudentPage, AnalyticsStudentRow, SortColumn, TableState } from '../types'
import { NO_MATCH } from './ChartPanel'

/** The columns of Analytics.dc.html. Under 940px the box scrolls sideways. */
const grid: GridLayout = {
  columns:
    'minmax(120px, 1.1fr) 68px minmax(100px, 1fr) minmax(170px, 1.5fr) 84px 116px 116px 96px',
  minWidth: 940,
  padding: { header: '12px 16px', row: '12px 16px' },
  textSize: 'text-[13.5px]',
}

/** A status is a square and words. A dash: the child has no fee plan, or no bus fee. */
function StatusCell({ status, none }: { status: FeeStatus | null; none: string }) {
  if (!status) {
    return (
      <div className="flex items-center gap-[7px]">
        <span aria-hidden="true" className="size-2 flex-none" />
        <span aria-hidden="true">—</span>
        <span className="sr-only">{none}</span>
      </div>
    )
  }
  return (
    <div className="flex">
      <StatusDot tone={feeStatusTone[status]} plain inheritSize>
        {feeStatusLabels[status]}
      </StatusDot>
    </div>
  )
}

interface ColumnsOptions {
  table: TableState
  sortBy: (column: SortColumn) => void
}

function columnsOf({ table, sortBy }: ColumnsOptions): Column<AnalyticsStudentRow>[] {
  const sortOf = (column: SortColumn) => ({
    direction: table.sort === column ? table.dir : null,
    onSort: () => sortBy(column),
  })
  return [
    {
      header: 'Student',
      cell: (r) => <div className="font-semibold">{r.name}</div>,
      sort: sortOf('name'),
    },
    {
      header: 'Class',
      cell: (r) => (
        <div className="font-mono text-[12.5px]">{classAndSection(r.className, r.section)}</div>
      ),
      sort: sortOf('class'),
    },
    { header: 'Village', cell: (r) => r.village },
    {
      header: "Father's occupation",
      cell: (r) => (r.occupation ? occupationLabels[r.occupation] : 'Not told'),
    },
    { header: 'Bus', cell: (r) => r.route ?? 'No bus' },
    {
      header: 'School fee',
      cell: (r) => <StatusCell status={r.schoolStatus} none="No fee plan" />,
    },
    { header: 'Bus fee', cell: (r) => <StatusCell status={r.busStatus} none="No bus fee" /> },
    {
      header: 'Pending',
      align: 'right',
      sort: sortOf('pending'),
      cell: (r) => (
        <span
          className={`font-mono text-[13px] ${r.pending === 0 ? 'font-normal' : 'font-semibold'}`}
        >
          {formatInr(r.pending)}
        </span>
      ),
    },
  ]
}

interface StudentsListSectionProps {
  query: UseQueryResult<AnalyticsStudentPage>
  table: TableState
  sortBy: (column: SortColumn) => void
  setPage: (page: number) => void
  anyFilter: boolean
  clear: () => void
}

/** The list at the bottom: who is in the filters, with the fee status of each, 25 to a page. */
export function StudentsListSection({
  query,
  table,
  sortBy,
  setPage,
  anyFilter,
  clear,
}: StudentsListSectionProps) {
  const page = query.data
  return (
    <section aria-label="Students and families" className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-[15px] font-semibold">Students and families in this filter</h2>
        <div className="text-[12.5px] text-ink-soft">
          {page && `Showing ${page.items.length} of ${page.total}. `}Click a column name to sort.
        </div>
      </div>
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !page ? (
        <LoadingBlock />
      ) : page.total === 0 ? (
        <EmptyState
          title={NO_MATCH}
          hint="Try other filters, or clear them."
          action={
            anyFilter ? (
              <Button variant="plain" onClick={clear}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          aria-busy={query.isPlaceholderData || undefined}
          className={`flex flex-col gap-2.5 transition-opacity ${query.isPlaceholderData ? 'opacity-60' : ''}`}
        >
          <DataTable
            caption="Students and families"
            columns={columnsOf({ table, sortBy })}
            rows={page.items}
            getRowKey={(r) => r.id}
            grid={grid}
          />
          <Pagination
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            noun="students"
            onPage={setPage}
          />
        </div>
      )}
    </section>
  )
}
