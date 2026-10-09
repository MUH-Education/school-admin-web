import { useSearchParams } from 'react-router'
import { formatWeekdayDate } from '@/lib/format'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { PageHeader } from '@/ui/PageHeader'
import { useBusAttention, useBusStatus } from '../api'
import { AttentionBox } from '../components/AttentionBox'
import { BusRouteRow } from '../components/BusRouteRow'
import { FleetTiles } from '../components/FleetTiles'
import { Legend } from '../components/Legend'
import { LiveNote } from '../components/LiveNote'
import { PhaseSwitch } from '../components/PhaseSwitch'
import { parsePhase } from '../phase'
import { summarise } from '../summary'
import type { BusPhase } from '../types'

/** The phase is in the address: /bus-status?phase=EVENING (decision B14). */
function usePhaseInUrl(): [BusPhase | null, (phase: BusPhase) => void] {
  const [params, setParams] = useSearchParams()
  const phase = parsePhase(params.get('phase'))
  const choose = (next: BusPhase) =>
    setParams((old) => {
      const copy = new URLSearchParams(old)
      copy.set('phase', next)
      return copy
    })
  return [phase, choose]
}

export function BusStatusPage() {
  const [urlPhase, choosePhase] = usePhaseInUrl()
  const status = useBusStatus(urlPhase)
  const attention = useBusAttention(urlPhase)
  // Without ?phase= the server picks one by the time of day. The switch shows its choice.
  const phase = urlPhase ?? status.data?.phase ?? null
  const search = urlPhase ? `?phase=${urlPhase}` : ''
  const detailTo = (routeId: number) => `/bus-status/routes/${routeId}${search}`

  // One failed update must not take the buses off the screen: the old answer stays in `data`.
  const refreshFailed = status.data !== undefined && (status.isError || attention.isError)

  const header = (
    <PageHeader
      label={status.data ? `Transport · ${formatWeekdayDate(status.data.date)}` : 'Transport'}
      title="Bus status"
      descriptionWidth={560}
      description="Where every bus is right now. The position comes from the attendant's taps at each stop."
      action={
        <div className="flex flex-col items-start gap-2">
          <PhaseSwitch value={phase} onChange={choosePhase} />
          {status.data && <LiveNote asOf={status.data.asOf} failed={refreshFailed} />}
        </div>
      }
    />
  )

  if (status.data === undefined) {
    return (
      <>
        {header}
        {status.isError ? (
          <ErrorState error={status.error} onRetry={() => void status.refetch()} />
        ) : (
          <LoadingBlock />
        )}
      </>
    )
  }

  const routes = status.data.routes
  if (routes.length === 0) {
    return (
      <>
        {header}
        <EmptyState title="No buses yet" hint="Add routes on Routes and load to see them here." />
      </>
    )
  }

  return (
    <>
      {header}
      <FleetTiles summary={summarise(routes)} phase={phase} />
      <AttentionBox items={attention.data ?? []} detailTo={detailTo} />
      <section aria-label="All buses" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="text-[15px] font-semibold">All {routes.length} buses</h2>
          <Legend />
        </div>
        {routes.map((route) => (
          <BusRouteRow key={route.routeId} route={route} detailTo={detailTo(route.routeId)} />
        ))}
      </section>
    </>
  )
}
