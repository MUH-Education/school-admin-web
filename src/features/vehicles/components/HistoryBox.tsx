import { formatDate } from '@/lib/format'
import { ErrorState } from '@/ui/ErrorState'
import { HistoryList } from '@/ui/HistoryList'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { Panel } from '@/ui/Panel'
import { useAssignments } from '../api'
import { dutyLabels } from '../labels'

/** "Who worked on this vehicle". Old names stay. */
export function HistoryBox({ vehicleId }: { vehicleId: number }) {
  const history = useAssignments(vehicleId)
  return (
    <Panel
      aria-label="Who worked on this vehicle"
      className="flex flex-col gap-3 px-6 pt-[22px] pb-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-[17px] font-semibold">Who worked on this vehicle</h2>
        <p className="text-[13.5px] text-ink-soft">
          Old names stay here. So you can always answer &ldquo;who was driving on that day?&rdquo;
        </p>
      </div>
      {history.isPending ? (
        <LoadingBlock />
      ) : history.isError ? (
        <ErrorState error={history.error} onRetry={() => void history.refetch()} />
      ) : (
        <HistoryList
          items={history.data.map((a) => ({
            key: a.id,
            label: dutyLabels[a.duty],
            title: a.staffName,
            when: `${formatDate(a.fromDate)} to ${a.toDate ? formatDate(a.toDate) : 'now'}`,
            current: a.toDate === null,
          }))}
        />
      )}
    </Panel>
  )
}
