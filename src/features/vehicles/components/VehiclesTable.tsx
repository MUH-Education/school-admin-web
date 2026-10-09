import { Link } from 'react-router'
import { DataTable, type Column } from '@/ui/DataTable'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LinkButton } from '@/ui/LinkButton'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { useVehicles } from '../api'
import { vehicleTypeLabels } from '../labels'
import { worstPaper } from '../papers'
import type { Vehicle } from '../types'
import { PapersCell } from './PapersCell'

const columns: Column<Vehicle>[] = [
  { header: 'Vehicle', cell: (v) => <span className="font-semibold">{v.name}</span> },
  { header: 'Number', cell: (v) => v.registrationNo, mono: true },
  { header: 'Type', cell: (v) => vehicleTypeLabels[v.vehicleType] },
  { header: 'Seats', cell: (v) => <span className="font-mono">{v.seats}</span> },
  { header: 'Route', cell: (v) => v.route ?? '—' },
  { header: 'Driver', cell: (v) => v.driver ?? '—' },
  { header: 'Attendant', cell: (v) => v.attendant ?? '—' },
  {
    header: 'Papers',
    cell: (v) => {
      const papers = worstPaper(v.documents)
      return <PapersCell level={papers.level}>{papers.text}</PapersCell>
    },
  },
  {
    header: 'Open',
    headerHidden: true,
    cell: (v) => (
      <Link
        to={`/vehicles/${v.id}`}
        aria-label={`Open ${v.name}`}
        className="font-semibold text-canal underline"
      >
        Open
      </Link>
    ),
  },
]

export function VehiclesTable({ canEdit }: { canEdit: boolean }) {
  const vehicles = useVehicles()

  return (
    <section aria-label="Vehicles" className="flex flex-col gap-2.5">
      <h2 className="text-[15px] font-semibold">Vehicles</h2>
      {vehicles.isPending ? (
        <LoadingBlock label="Loading vehicles…" />
      ) : vehicles.isError ? (
        <ErrorState error={vehicles.error} onRetry={() => void vehicles.refetch()} />
      ) : vehicles.data.length === 0 ? (
        <EmptyState
          title="No vehicles yet"
          hint="Add the first vehicle to see its papers and people here."
          action={canEdit && <LinkButton to="/vehicles/new">Add a vehicle</LinkButton>}
        />
      ) : (
        <DataTable
          caption="Vehicles"
          columns={columns}
          rows={vehicles.data}
          getRowKey={(v) => v.id}
        />
      )}
    </section>
  )
}
