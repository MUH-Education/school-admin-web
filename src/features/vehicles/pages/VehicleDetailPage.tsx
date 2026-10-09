import { Link, useParams } from 'react-router'
import { ApiError } from '@/api/errors'
import { Breadcrumb } from '@/ui/Breadcrumb'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LinkButton } from '@/ui/LinkButton'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { PageHeader } from '@/ui/PageHeader'
import { usePermissions } from '@/auth/usePermissions'
import { useVehicle } from '../api'
import { HistoryBox } from '../components/HistoryBox'
import { PeopleBox } from '../components/PeopleBox'
import { PapersCell } from '../components/PapersCell'
import { VehicleForm } from '../components/VehicleForm'
import { vehicleTypeLabels } from '../labels'
import { worstPaper } from '../papers'

/** /vehicles/new has no id in the address. */
export function VehicleDetailPage() {
  const { id } = useParams()
  if (id === undefined) return <NewVehicle />
  return <ExistingVehicle id={Number(id)} />
}

function NewVehicle() {
  return (
    <>
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[{ label: 'Vehicles and staff', to: '/vehicles' }, { label: 'New vehicle' }]}
          />
        }
        title="Add a vehicle"
        description="Fill in the details and the four paper dates. The people box appears after the first save."
      />
      <VehicleForm />
    </>
  )
}

function ExistingVehicle({ id }: { id: number }) {
  const { can } = usePermissions()
  const vehicle = useVehicle(id)
  const crumb = (name: string) => (
    <Breadcrumb items={[{ label: 'Vehicles and staff', to: '/vehicles' }, { label: name }]} />
  )

  if (vehicle.isPending) {
    return (
      <>
        <PageHeader breadcrumb={crumb('…')} title="Vehicle" />
        <LoadingBlock />
      </>
    )
  }
  if (vehicle.isError) {
    if (vehicle.error instanceof ApiError && vehicle.error.status === 404) {
      return (
        <>
          <PageHeader breadcrumb={crumb('Not found')} title="Vehicle" />
          <EmptyState
            title="This vehicle does not exist"
            hint="It may have been removed."
            action={<LinkButton to="/vehicles">Back to vehicles</LinkButton>}
          />
        </>
      )
    }
    return (
      <>
        <PageHeader breadcrumb={crumb('…')} title="Vehicle" />
        <ErrorState error={vehicle.error} onRetry={() => void vehicle.refetch()} />
      </>
    )
  }

  const v = vehicle.data
  const papers = worstPaper(v.documents)
  return (
    <>
      <PageHeader
        breadcrumb={crumb(v.name)}
        title={v.name}
        description={
          <>
            {vehicleTypeLabels[v.vehicleType]} ·{' '}
            <span className="font-mono">{v.registrationNo}</span>
            {v.routeId && (
              <>
                {' '}
                · runs{' '}
                <Link to={`/routes?route=${v.routeId}`} className="text-canal underline">
                  {v.route}
                </Link>
              </>
            )}
          </>
        }
        action={
          <div className="text-[15px] font-semibold">
            <PapersCell level={papers.level}>
              {papers.level === 'ok' ? 'All papers valid' : papers.text}
            </PapersCell>
          </div>
        }
      />
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
          <VehicleForm key={v.id} vehicle={v} />
        </div>
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
          <PeopleBox vehicle={v} canEdit={can('VEHICLES_EDIT')} />
          <HistoryBox vehicleId={v.id} />
        </div>
      </div>
    </>
  )
}
