import { formatDate } from '@/lib/format'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { Panel } from '@/ui/Panel'
import { useStudentHistory } from '../api'

/** Date, what changed, who. Newest first (the server sorts). */
export function HistoryBox({ studentId }: { studentId: number }) {
  const history = useStudentHistory(studentId)
  return (
    <Panel aria-label="Change history" className="flex flex-col gap-3 px-6 pt-[22px] pb-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[17px] font-semibold">Change history</h2>
        <p className="text-[13.5px] text-ink-soft">
          Every change is kept, with who made it. Nothing is lost when you edit.
        </p>
      </div>
      {history.isPending ? (
        <LoadingBlock />
      ) : history.isError ? (
        <ErrorState error={history.error} onRetry={() => void history.refetch()} />
      ) : history.data.length === 0 ? (
        <p className="text-ink-soft">No changes yet.</p>
      ) : (
        <ul aria-label="Changes" className="flex flex-col">
          {history.data.map((entry) => (
            <li
              key={entry.id}
              className="grid grid-cols-[104px_minmax(0,1fr)_84px] gap-x-3.5 border-t border-rule py-[9px] text-sm"
            >
              <span className="font-mono text-[12.5px] text-ink-soft">{formatDate(entry.at)}</span>
              <span>{entry.text}</span>
              <span className="text-ink-soft">{entry.by}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
