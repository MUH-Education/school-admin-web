import { useSearchParams } from 'react-router'
import { usePermissions } from '@/auth/usePermissions'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { PageHeader } from '@/ui/PageHeader'
import { useLoadBoard, useSettings } from '../api'
import { FleetTiles } from '../components/FleetTiles'
import { RouteList } from '../components/RouteList'
import { SettingsRow } from '../components/SettingsRow'
import { sessionLabel } from '../loadMath'

/** The selected route is in the address: /routes?route=4 */
function useSelectedRoute(): [number | null, (id: number) => void] {
  const [params, setParams] = useSearchParams()
  const raw = Number(params.get('route'))
  const selected = Number.isInteger(raw) && raw > 0 ? raw : null
  return [selected, (id) => setParams({ route: String(id) })]
}

export function RoutesPage() {
  const { can } = usePermissions()
  const board = useLoadBoard()
  const settings = useSettings()
  const [selectedId, select] = useSelectedRoute()

  const header = (
    <PageHeader
      label={`Transport · Session ${sessionLabel()}`}
      title="Routes and load"
      description="Which routes carry more children than seats, which have empty seats, and what each route costs per child."
    />
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
      </div>
    </>
  )
}
