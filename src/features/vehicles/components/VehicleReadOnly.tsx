import { formatDate, formatInr } from '@/lib/format'
import { Panel } from '@/ui/Panel'
import { ReadOnlyField } from '@/ui/ReadOnlyField'
import { ownedByLabels, paperLabels, vehicleTypeLabels } from '../labels'
import type { VehicleDetail } from '../types'
import { PapersCell } from './PapersCell'

const words = {
  VALID: { level: 'ok', text: 'Valid' },
  ENDING: { level: 'soon', text: 'Ending soon' },
  ENDED: { level: 'ended', text: 'Ended' },
} as const

/** The same two boxes as the form, as plain text. No inputs, no buttons. */
export function VehicleReadOnly({ vehicle }: { vehicle: VehicleDetail }) {
  return (
    <div className="flex flex-col gap-6">
      <Panel aria-label="Vehicle details" className="flex flex-col gap-[18px] px-6 pt-[22px] pb-6">
        <h2 className="text-[17px] font-semibold">Vehicle details</h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-x-5 gap-y-[18px]">
          <ReadOnlyField label="Name used in school">{vehicle.name}</ReadOnlyField>
          <ReadOnlyField label="Registration number" mono>
            {vehicle.registrationNo}
          </ReadOnlyField>
          <ReadOnlyField label="Type">{vehicleTypeLabels[vehicle.vehicleType]}</ReadOnlyField>
          <ReadOnlyField label="Seats" mono>
            {vehicle.seats}
          </ReadOnlyField>
          <ReadOnlyField label="Cost per month, all-in" mono>
            {formatInr(vehicle.monthlyCost)}
          </ReadOnlyField>
          <ReadOnlyField label="Owned by">{ownedByLabels[vehicle.ownedBy]}</ReadOnlyField>
        </dl>
      </Panel>

      <Panel aria-label="Papers" className="flex flex-col gap-4 px-6 pt-[22px] pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-semibold">Papers</h2>
          <p className="text-[13.5px] text-ink-soft">The last day each paper is valid.</p>
        </div>
        <dl className="flex flex-col">
          {vehicle.documents.map((doc) => {
            const word = words[doc.status]
            return (
              <div
                key={doc.kind}
                className="grid grid-cols-[minmax(130px,1.2fr)_minmax(150px,1fr)_minmax(96px,auto)] items-center gap-x-4 border-t border-rule py-3"
              >
                <dt className="text-[15px] font-semibold">{paperLabels[doc.kind]}</dt>
                <dd className="font-mono text-[15px]">{formatDate(doc.validTill)}</dd>
                <dd>
                  <PapersCell level={word.level}>{word.text}</PapersCell>
                </dd>
              </div>
            )
          })}
        </dl>
      </Panel>
    </div>
  )
}
