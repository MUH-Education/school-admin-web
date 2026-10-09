import { useState } from 'react'
import { usePermissions } from '@/auth/usePermissions'
import { Button } from '@/ui/Button'
import { LinkButton } from '@/ui/LinkButton'
import { PageHeader } from '@/ui/PageHeader'
import { useStaff, useVehicles } from '../api'
import { AttentionBox } from '../components/AttentionBox'
import { PersonDialog } from '../components/PersonDialog'
import { StaffTable } from '../components/StaffTable'
import { VehiclesTable } from '../components/VehiclesTable'
import type { Staff } from '../types'

export type PersonDialogState =
  { kind: 'closed' } | { kind: 'add' } | { kind: 'edit'; person: Staff }

export function VehiclesPage() {
  const { can } = usePermissions()
  const canEdit = can('VEHICLES_EDIT')
  const vehicles = useVehicles()
  const staff = useStaff()
  const [dialog, setDialog] = useState<PersonDialogState>({ kind: 'closed' })

  const counts =
    vehicles.data && staff.data
      ? ` · ${vehicles.data.length} vehicles, ${staff.data.length} people`
      : ''

  return (
    <>
      <PageHeader
        label={`Transport${counts}`}
        title="Vehicles and staff"
        description="Every vehicle, who drives it, who rides with the children, and when its papers end. Open a vehicle to change its driver or attendant."
        action={
          canEdit && (
            <div className="flex flex-wrap gap-2.5">
              <Button variant="secondary" onClick={() => setDialog({ kind: 'add' })}>
                Add a person
              </Button>
              <LinkButton to="/vehicles/new">Add a vehicle</LinkButton>
            </div>
          )
        }
      />
      <AttentionBox />
      <VehiclesTable canEdit={canEdit} />
      <StaffTable
        canEdit={canEdit}
        onAdd={() => setDialog({ kind: 'add' })}
        onEdit={(person) => setDialog({ kind: 'edit', person })}
      />
      <PersonDialog
        open={dialog.kind !== 'closed'}
        person={dialog.kind === 'edit' ? dialog.person : undefined}
        onClose={() => setDialog({ kind: 'closed' })}
      />
    </>
  )
}
