import { formatWeekdayDate } from '@/lib/format'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { DateInput } from '@/ui/DateInput'
import { FilterBar, FilterField, filterInputClass } from '@/ui/FilterBar'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { PageHeader } from '@/ui/PageHeader'
import { Pagination } from '@/ui/Pagination'
import { Panel } from '@/ui/Panel'
import { Select } from '@/ui/Select'
import { Tile, TileRow } from '@/ui/Tile'
import { TextInput } from '@/ui/TextInput'
import { useMessages, useMessageSummary } from '../api'
import { MessagesTable } from '../components/MessagesTable'
import { statusFilterLabels, TEST_MODE_WORDS } from '../labels'
import { messageStatuses } from '../types'
import { useMessageFilters } from './useMessageFilters'

export function MessagesPage() {
  const controls = useMessageFilters()
  const { filters } = controls
  const messages = useMessages(filters)
  const summary = useMessageSummary(filters.date)

  const page = messages.data
  const day = summary.data
  const shownDate = filters.date || page?.date || day?.date || ''
  const count = (n: number | undefined) => (n === undefined ? '—' : n)

  return (
    <>
      <PageHeader label="Transport" title="Messages" description="Every SMS sent to parents" />

      {day && day.testOnly > 0 && (
        <Panel tone="dust" role="status" aria-label="Test mode" className="px-5 py-4 text-sm">
          <strong className="text-dust-text">{TEST_MODE_WORDS}</strong>
        </Panel>
      )}

      <TileRow label="Messages of the day">
        <Tile label="Sent" value={count(day?.sent)} />
        <Tile label="Waiting" value={count(day?.queued)} />
        <Tile
          label="Failed"
          value={count(day?.failed)}
          tone={day && day.failed > 0 ? 'bad' : 'ink'}
        />
      </TileRow>

      <FilterBar
        label="Find a message"
        summary={
          page && (
            <>
              <strong>
                {page.total} {page.total === 1 ? 'message' : 'messages'}.
              </strong>{' '}
              <span className="text-ink-soft">{formatWeekdayDate(page.date)}</span>
            </>
          )
        }
      >
        <FilterField label="Day">
          <DateInput
            className={filterInputClass}
            value={shownDate}
            onChange={(event) => controls.setDate(event.target.value)}
          />
        </FilterField>
        <FilterField label="Status">
          <Select
            className={filterInputClass}
            value={filters.status}
            onChange={(event) => controls.setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            {messageStatuses.map((status) => (
              <option key={status} value={status}>
                {statusFilterLabels[status]}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Search a child by name" wide>
          <TextInput
            type="search"
            className={filterInputClass}
            placeholder="e.g. Mohit"
            value={controls.searchText}
            onChange={(event) => controls.typeSearch(event.target.value)}
          />
        </FilterField>
      </FilterBar>

      <section aria-label="Message list" className="flex flex-col gap-2.5">
        {messages.isPending ? (
          <LoadingBlock />
        ) : messages.isError ? (
          <ErrorState error={messages.error} onRetry={() => void messages.refetch()} />
        ) : page && page.total === 0 ? (
          <EmptyState
            title={controls.anyFilter ? 'No message matches' : 'No messages on this day'}
            hint={
              controls.anyFilter
                ? 'Try a shorter name, or clear the filters.'
                : 'An SMS is made when the attendant taps a child.'
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
              <MessagesTable rows={page.items} />
              <Pagination
                page={page.page}
                pageSize={page.pageSize}
                total={page.total}
                noun="messages"
                onPage={controls.setPage}
              />
            </>
          )
        )}
      </section>
    </>
  )
}
