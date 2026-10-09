import { useState } from 'react'
import { formatDate, formatDayMonth } from '@/lib/format'
import { Button } from '@/ui/Button'
import { Panel } from '@/ui/Panel'
import { dutyLabels } from '../labels'
import type { Duty, VehicleDetail, VehiclePerson } from '../types'
import { ChangePersonForm } from './ChangePersonForm'
import { PersonDialog } from './PersonDialog'

const jobs: Duty[] = ['DRIVER', 'ATTENDANT', 'HELPER']

function detailLine(person: VehiclePerson, vehicle: VehicleDetail): string {
  const parts: string[] = [person.phone]
  if (person.licenceValidTill)
    parts.push(`licence valid till ${formatDate(person.licenceValidTill)}`)
  if (person.duty === 'ATTENDANT' && person.hasLogin && vehicle.route) {
    parts.push(`has the phone app login for ${vehicle.route}`)
  }
  parts.push(`${person.upcoming ? 'from' : 'here since'} ${formatDate(person.fromDate)}`)
  if (person.toDate) {
    parts.push(
      person.thenBack
        ? `till ${formatDayMonth(person.toDate)}, then ${person.thenBack} is back`
        : `till ${formatDayMonth(person.toDate)}`,
    )
  }
  return parts.join(' · ')
}

interface Props {
  vehicle: VehicleDetail
  canEdit: boolean
}

export function PeopleBox({ vehicle, canEdit }: Props) {
  const [open, setOpen] = useState<Duty | null>(null)
  const [adding, setAdding] = useState<Duty | null>(null)

  return (
    <Panel aria-label="People on this vehicle" className="flex flex-col gap-4 px-6 pt-[22px] pb-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[17px] font-semibold">People on this vehicle</h2>
        <p className="text-[13.5px] text-ink-soft">Who drives, and who rides with the children.</p>
      </div>

      <div className="border border-rule">
        {jobs.map((duty, index) => {
          const person = vehicle.people.find((p) => p.duty === duty)
          const isOpen = open === duty
          const label = dutyLabels[duty]
          return (
            <div key={duty} className={index > 0 ? 'border-t border-rule' : ''}>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase">
                    {label}
                  </span>
                  {person ? (
                    <>
                      <span className="text-base font-semibold">{person.name}</span>
                      <span className="text-[13.5px] text-ink-soft">
                        {detailLine(person, vehicle)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[15px] text-ink-soft">Nobody yet</span>
                  )}
                </div>
                {canEdit && (
                  <Button
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : duty)}
                    className={isOpen ? 'bg-canal-soft text-ink' : ''}
                  >
                    {person ? `Change ${label.toLowerCase()}` : 'Add a person'}
                  </Button>
                )}
              </div>
              {isOpen && (
                <ChangePersonForm
                  vehicle={vehicle}
                  duty={duty}
                  current={person}
                  onDone={() => setOpen(null)}
                  onAddNew={() => setAdding(duty)}
                />
              )}
            </div>
          )
        })}
      </div>
      {vehicle.route && (
        <p className="text-[13.5px] text-ink-soft">
          When you change the attendant, the phone app login for {vehicle.route} moves to the new
          person on the same date.
        </p>
      )}

      <PersonDialog
        open={adding !== null}
        defaultType={adding ?? undefined}
        onClose={() => setAdding(null)}
      />
    </Panel>
  )
}
