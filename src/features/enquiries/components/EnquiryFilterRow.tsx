import { useId, type ReactNode } from 'react'
import { FieldContext } from '@/ui/fieldContext'
import { Select } from '@/ui/Select'
import { TextInput } from '@/ui/TextInput'
import { sourceLabels, enquirySources } from '../types'
import type { EnquiryFilterControls } from '../pages/useEnquiryFilters'

function FilterBox({
  label,
  className,
  children,
}: {
  label: string
  className: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <FieldContext value={{ id, describedBy: undefined, invalid: false }}>
      <div className={`flex flex-col gap-1 ${className}`}>
        <label
          htmlFor={id}
          className="font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase"
        >
          {label}
        </label>
        {children}
      </div>
    </FieldContext>
  )
}

// The "!" makes these win over the bigger form-input sizes of TextInput and Select.
const inputClass = 'min-h-11! px-3! py-2! text-[14px]!'

/** Search, village and source in one wrapping row, open on the page (no white box), as designed. */
export function EnquiryFilterRow({
  controls,
  villages,
}: {
  controls: EnquiryFilterControls
  villages: string[]
}) {
  const { filters } = controls
  const shown = [...new Set([...villages, ...(filters.village ? [filters.village] : [])])].sort(
    (a, b) => a.localeCompare(b),
  )
  return (
    <div
      role="search"
      aria-label="Find an enquiry"
      className="flex flex-wrap items-end gap-x-4 gap-y-3"
    >
      <FilterBox label="Search name or phone" className="max-w-[420px] flex-[2_1_260px]">
        <TextInput
          type="search"
          className={inputClass}
          placeholder="e.g. Rajesh or 98120"
          value={controls.searchText}
          onChange={(event) => controls.typeSearch(event.target.value)}
        />
      </FilterBox>
      <FilterBox label="Village" className="max-w-[240px] flex-[1_1_170px]">
        <Select
          className={inputClass}
          value={filters.village}
          onChange={(event) => controls.setVillage(event.target.value)}
        >
          <option value="">All villages</option>
          {shown.map((village) => (
            <option key={village} value={village}>
              {village}
            </option>
          ))}
        </Select>
      </FilterBox>
      <FilterBox label="Source" className="max-w-[240px] flex-[1_1_170px]">
        <Select
          className={inputClass}
          value={filters.source}
          onChange={(event) => controls.setSource(event.target.value)}
        >
          <option value="">All sources</option>
          {enquirySources.map((source) => (
            <option key={source} value={source}>
              {sourceLabels[source]}
            </option>
          ))}
        </Select>
      </FilterBox>
    </div>
  )
}
