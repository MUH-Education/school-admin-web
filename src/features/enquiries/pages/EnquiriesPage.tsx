import { usePermissions } from '@/auth/usePermissions'
import { nextSessionLabel } from '@/lib/format'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LinkButton } from '@/ui/LinkButton'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { PageHeader } from '@/ui/PageHeader'
import { Pagination } from '@/ui/Pagination'
import { useEnquiries, useEnquirySummary } from '../api'
import { EnquiriesTable } from '../components/EnquiriesTable'
import { EnquiryFilterRow } from '../components/EnquiryFilterRow'
import { OverdueBox } from '../components/OverdueBox'
import { StageTiles } from '../components/StageTiles'
import { useEnquiryFilters } from './useEnquiryFilters'

export function EnquiriesPage() {
  const { can } = usePermissions()
  const controls = useEnquiryFilters()
  const { filters } = controls
  const enquiries = useEnquiries(filters)
  const summary = useEnquirySummary()

  const page = enquiries.data
  const tiles = summary.data

  return (
    <>
      <PageHeader
        label={`Admissions · Session ${nextSessionLabel()}`}
        title="Enquiries"
        description="Every parent who asked about admission, and what to do next for each one."
        descriptionWidth={560}
        action={
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {tiles && (
              <div className="font-mono text-[13px]">
                {tiles.byStatus.ADMITTED} of {tiles.total} admitted so far · {tiles.admittedPercent}
                %
              </div>
            )}
            {can('ENQUIRIES_EDIT') && (
              <LinkButton to="/enquiries/new" className="border-0! px-5! text-[15px]">
                Add enquiry
              </LinkButton>
            )}
          </div>
        }
      />

      <StageTiles summary={tiles} active={filters.status} onPick={controls.setStatus} />

      {tiles && (
        <OverdueBox
          count={tiles.overdue}
          active={filters.overdue}
          onToggle={() => controls.setOverdue(!filters.overdue)}
        />
      )}

      <section aria-label="Enquiry table" className="flex flex-col gap-3">
        <EnquiryFilterRow controls={controls} villages={page?.villages ?? []} />
        {enquiries.isPending ? (
          <LoadingBlock />
        ) : enquiries.isError ? (
          <ErrorState error={enquiries.error} onRetry={() => void enquiries.refetch()} />
        ) : page && page.total === 0 ? (
          <EmptyState
            title={controls.anyFilter ? 'No enquiry matches' : 'No enquiries yet'}
            hint={
              controls.anyFilter
                ? 'Try a shorter search, or clear the filters.'
                : 'Add the first one when a parent visits or calls.'
            }
            action={
              controls.anyFilter ? (
                <Button variant="plain" onClick={controls.clear}>
                  Clear the filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          page && (
            <>
              <EnquiriesTable rows={page.items} />
              <Pagination
                page={page.page}
                pageSize={page.pageSize}
                total={page.total}
                noun="enquiries"
                onPage={controls.setPage}
              />
            </>
          )
        )}
      </section>
    </>
  )
}
