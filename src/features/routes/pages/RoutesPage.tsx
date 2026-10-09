import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { usePermissions } from '@/auth/usePermissions'
import { useVehicles } from '@/features/vehicles/api'
import { sessionLabel } from '@/lib/format'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { PageHeader } from '@/ui/PageHeader'
import { useLoadBoard, useRoute, useSettings } from '../api'
import { AddRouteDialog } from '../components/AddRouteDialog'
import { DeleteRoute } from '../components/DeleteRoute'
import { FleetTiles } from '../components/FleetTiles'
import { InsightsBox } from '../components/InsightsBox'
import { RouteList } from '../components/RouteList'
import { RoutePanel } from '../components/RoutePanel'
import { SettingsRow } from '../components/SettingsRow'
import type { LoadBoardRow } from '../types'

/** The selected route is in the address: /routes?route=4 */
function useSelectedRoute(): [number | null, (id: number | null) => void] {
  const [params, setParams] = useSearchParams()
  const raw = Number(params.get('route'))
  const selected = Number.isInteger(raw) && raw > 0 ? raw : null
  return [selected, (id) => setParams(id === null ? {} : { route: String(id) })]
}

export function RoutesPage() {
  const { can } = usePermissions()
  const board = useLoadBoard()
  const settings = useSettings()
  const [selectedId, select] = useSelectedRoute()
  const [adding, setAdding] = useState(false)
  const canEditRoutes = can('ROUTES_EDIT')

  const header = (
    <PageHeader
      label={`Transport · Session ${sessionLabel()}`}
      title="Routes and load"
      description="Which routes carry more children than seats, which have empty seats, and what each route costs per child."
      action={canEditRoutes && <Button onClick={() => setAdding(true)}>Add route</Button>}
    />
  )
  const addDialog = (
    <AddRouteDialog open={adding} onClose={() => setAdding(false)} onCreated={select} />
  )

  if (board.isPending) {
    return (
      <>
        {header}
        <LoadingBlock />
      </>
    )
  }
  if (board.isError) {
    return (
      <>
        {header}
        <ErrorState error={board.error} onRetry={() => void board.refetch()} />
      </>
    )
  }
  if (board.data.length === 0) {
    return (
      <>
        {header}
        <EmptyState title="No routes yet" hint="Add the first route to see the load here." />
        {addDialog}
      </>
    )
  }

  return (
    <>
      {header}
      <FleetTiles rows={board.data} />
      {settings.isPending ? (
        <LoadingBlock label="Loading numbers…" />
      ) : settings.isError ? (
        <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />
      ) : (
        <SettingsRow
          // A new key makes the boxes show the saved numbers again.
          key={`${settings.data.busMonths}-${settings.data.busFeePerChild}-${settings.data.feeCollectedPercent}`}
          settings={settings.data}
          canEdit={can('SETTINGS_EDIT')}
        />
      )}
      <div className="flex flex-wrap items-start gap-6">
        <RouteList rows={board.data} selectedId={selectedId} onSelect={select} />
        <SelectedRoute
          routeId={board.data.some((r) => r.routeId === selectedId) ? selectedId : null}
          rows={board.data}
          canEdit={canEditRoutes}
          onDeleted={() => select(null)}
        />
      </div>
      <InsightsBox rows={board.data} />
      {addDialog}
    </>
  )
}

/** The right side. It loads the selected route with its stops. */
function SelectedRoute({
  routeId,
  rows,
  canEdit,
  onDeleted,
}: {
  routeId: number | null
  rows: LoadBoardRow[]
  canEdit: boolean
  onDeleted: () => void
}) {
  const route = useRoute(routeId)
  const vehicles = useVehicles()
  if (routeId === null) {
    return (
      <section aria-label="Route details" className="min-w-0 flex-[1.3_1_460px]">
        <EmptyState title="Pick a route" hint="Press a route on the left to see its stops." />
      </section>
    )
  }
  if (route.isPending || vehicles.isPending) {
    return (
      <section aria-label="Route details" className="min-w-0 flex-[1.3_1_460px]">
        <LoadingBlock label="Loading route…" />
      </section>
    )
  }
  if (route.isError || vehicles.isError) {
    return (
      <section aria-label="Route details" className="min-w-0 flex-[1.3_1_460px]">
        <ErrorState
          error={route.error ?? vehicles.error}
          onRetry={() => {
            void route.refetch()
            void vehicles.refetch()
          }}
        />
      </section>
    )
  }
  return (
    <RoutePanel
      key={route.data.id}
      route={route.data}
      vehicles={vehicles.data}
      numbers={rows.find((r) => r.routeId === route.data.id)}
      canEdit={canEdit}
      extraAction={<DeleteRoute id={route.data.id} name={route.data.name} onDeleted={onDeleted} />}
    />
  )
}
