import { useParams, useSearchParams } from 'react-router'
import { ApiError } from '@/api/errors'
import { formatTimeAmPm, formatWeekdayDate } from '@/lib/format'
import { Breadcrumb } from '@/ui/Breadcrumb'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LinkButton } from '@/ui/LinkButton'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { PageHeader } from '@/ui/PageHeader'
import { StatusDot } from '@/ui/StatusDot'
import { vehicleTypeLabels } from '@/features/vehicles/labels'
import { useBusDetail } from '../api'
import { ChildrenTable } from '../components/ChildrenTable'
import { DetailTiles } from '../components/DetailTiles'
import { LiveNote } from '../components/LiveNote'
import { StopTiles } from '../components/StopTiles'
import { lastTapOf, nextStopOf } from '../detail'
import { phaseChoices, routeStateLabel } from '../labels'
import { parsePhase } from '../phase'
import type { BusStatusRoute } from '../types'

/** The note under the table in BusDetail.dc.html. */
const SMS_RULE_NOTE =
  'SMS follows the class rule. Nursery to Class 8: all four messages. Class 9 and 10: only "reached school" and "boarded evening bus". Class 11 and 12: no bus SMS.'

export function BusDetailPage() {
  const { routeId } = useParams()
  return <OneBus routeId={Number(routeId)} />
}

/** "On the way to Kanheri" on this page; the other states use the words of the list. */
function stateWords(route: BusStatusRoute, date: string) {
  const reached = route.school.reachedAt
  const time = (hhmm: string) => formatTimeAmPm(`${date}T${hhmm}:00+05:30`)
  const label = routeStateLabel(
    route.state,
    route.lateMinutes,
    route.state === 'REACHED_SCHOOL' && reached
      ? time(reached)
      : route.state === 'NOT_STARTED' && route.startsAt
        ? time(route.startsAt)
        : null,
  )
  const next = nextStopOf(route)
  if (route.state === 'ON_THE_WAY' && next) return { ...label, text: `On the way to ${next.name}` }
  return label
}

function OneBus({ routeId }: { routeId: number }) {
  const [params] = useSearchParams()
  const urlPhase = parsePhase(params.get('phase'))
  const bus = useBusDetail(routeId, urlPhase)
  const back = `/bus-status${urlPhase ? `?phase=${urlPhase}` : ''}`
  const crumb = (name: string) => (
    <Breadcrumb items={[{ label: 'Bus status', to: back }, { label: name }]} />
  )

  if (bus.data === undefined) {
    if (bus.isError && bus.error instanceof ApiError && bus.error.status === 404) {
      return (
        <>
          <PageHeader breadcrumb={crumb('Not found')} title="One bus" />
          <EmptyState
            title="This route does not exist"
            hint="It may have been deleted on Routes and load."
            action={<LinkButton to={back}>Back to bus status</LinkButton>}
          />
        </>
      )
    }
    return (
      <>
        <PageHeader breadcrumb={crumb('…')} title="One bus" />
        {bus.isError ? (
          <ErrorState error={bus.error} onRetry={() => void bus.refetch()} />
        ) : (
          <LoadingBlock />
        )}
      </>
    )
  }

  const { route, children, date, asOf, fitnessValidTill } = bus.data
  const phaseLabel = phaseChoices.find((p) => p.value === route.phase)?.label ?? ''
  const words = stateWords(route, date)
  const lastTap = lastTapOf(route)

  return (
    <>
      <PageHeader
        breadcrumb={crumb(route.name)}
        title={route.name}
        description={`${vehicleTypeLabels[route.vehicleType]} · Attendant: ${route.attendant} · ${phaseLabel}, ${formatWeekdayDate(date)}`}
        action={
          <div className="flex flex-col items-start gap-1.5">
            <StatusDot tone={words.tone} large>
              {words.text}
            </StatusDot>
            {lastTap?.tappedAt && (
              <div className="font-mono text-xs text-ink-soft">
                Last tap: {lastTap.name}, {formatTimeAmPm(`${date}T${lastTap.tappedAt}:00+05:30`)}
              </div>
            )}
            {/* The design has no "Live" line here. It shows only when an update has failed. */}
            {bus.isError && <LiveNote asOf={asOf} failed />}
          </div>
        }
      />
      <DetailTiles route={route} date={date} fitnessValidTill={fitnessValidTill} />
      <StopTiles route={route} rows={children} phase={route.phase} />
      <section aria-label="Children on this route" className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="text-[15px] font-semibold">
            {children.length} {children.length === 1 ? 'child' : 'children'} on this route
          </h2>
          <div className="text-[12.5px] text-ink-soft">
            Each child has four events in a day. A time means the attendant tapped it.
          </div>
        </div>
        {children.length === 0 ? (
          <EmptyState
            title="No children on this route"
            hint="Add children from the Students page."
          />
        ) : (
          <>
            <ChildrenTable rows={children} />
            <p className="max-w-[760px] text-[12.5px] text-ink-soft">{SMS_RULE_NOTE}</p>
          </>
        )}
      </section>
    </>
  )
}
