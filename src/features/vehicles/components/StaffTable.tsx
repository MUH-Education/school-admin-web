import { Button } from '@/ui/Button'
import { DataTable, type Column } from '@/ui/DataTable'
import { EmptyState } from '@/ui/EmptyState'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { useStaff } from '../api'
import { dutyLabels } from '../labels'
import { licenceSummary } from '../papers'
import type { Staff } from '../types'

const licenceClass = {
  ok: '',
  soon: 'font-semibold text-dust-text',
  ended: 'font-semibold text-bad',
}

interface StaffTableProps {
  canEdit: boolean
  onAdd: () => void
  onEdit: (person: Staff) => void
}

export function StaffTable({ canEdit, onAdd, onEdit }: StaffTableProps) {
  const staff = useStaff()

  const columns: Column<Staff>[] = [
    { header: 'Name', cell: (p) => <span className="font-semibold">{p.name}</span> },
    { header: 'Work', cell: (p) => dutyLabels[p.type] },
    { header: 'Phone', cell: (p) => p.phone, mono: true },
    { header: 'Licence number', cell: (p) => p.licenceNo ?? '—', mono: true },
    {
      header: 'Licence valid till',
      cell: (p) => {
        const licence = licenceSummary(p)
        return <span className={licenceClass[licence.level]}>{licence.text}</span>
      },
    },
    {
      header: 'Works on',
      cell: (p) =>
        p.vehicle ? (
          `${p.vehicle}${p.route ? ` · ${p.route}` : ''}`
        ) : (
          <span className="text-dust-text">Free, not on any vehicle</span>
        ),
    },
    {
      header: 'Phone app login',
      cell: (p) => <span className="text-ink-soft">{p.hasLogin ? 'Yes' : 'No login'}</span>,
    },
    ...(canEdit
      ? [
          {
            header: 'Edit',
            headerHidden: true,
            cell: (p: Staff) => (
              <button
                type="button"
                onClick={() => onEdit(p)}
                aria-label={`Edit ${p.name}`}
                className="cursor-pointer font-semibold text-canal underline"
              >
                Edit
              </button>
            ),
          },
        ]
      : []),
  ]

  return (
    <section aria-label="Drivers and attendants" className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-[15px] font-semibold">Drivers, attendants and helpers</h2>
        {staff.data && (
          <div className="text-[12.5px] text-ink-soft">Showing all {staff.data.length} people</div>
        )}
      </div>
      {staff.isPending ? (
        <LoadingBlock label="Loading people…" />
      ) : staff.isError ? (
        <ErrorState error={staff.error} onRetry={() => void staff.refetch()} />
      ) : staff.data.length === 0 ? (
        <EmptyState
          title="No drivers or attendants yet"
          hint="Add the first person to put them on a vehicle."
          action={canEdit && <Button onClick={onAdd}>Add a person</Button>}
        />
      ) : (
        <DataTable
          caption="Drivers, attendants and helpers"
          columns={columns}
          rows={staff.data}
          getRowKey={(p) => p.id}
        />
      )}
      <p className="text-[12.5px] text-ink-soft">
        Only attendants get a phone app login, because they tap the children. Drivers do not need
        one.
      </p>
    </section>
  )
}
