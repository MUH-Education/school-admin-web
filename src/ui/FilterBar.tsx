import { useId, type ReactNode } from 'react'
import { FieldContext } from './fieldContext'

interface FilterBarProps {
  /** Names the box for screen readers, for example "Find a student". */
  label: string
  children: ReactNode
  /** The line under the inputs, for example "290 students. 255 use the bus." */
  summary?: ReactNode
}

/** A white box with the search and the filters in one wrapping row. */
export function FilterBar({ label, children, summary }: FilterBarProps) {
  return (
    <section
      aria-label={label}
      className="flex flex-col gap-3 border border-rule bg-panel px-5 pt-4 pb-[18px]"
    >
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3.5">{children}</div>
      {summary && <div className="text-[13.5px]">{summary}</div>}
    </section>
  )
}

interface FilterFieldProps {
  label: string
  /** How much of the row it takes. `wide` is the search box. */
  wide?: boolean
  children: ReactNode
}

/** One labelled input of the filter bar. The input inside gets its id from here. */
export function FilterField({ label, wide = false, children }: FilterFieldProps) {
  const id = useId()
  return (
    <FieldContext value={{ id, describedBy: undefined, invalid: false }}>
      <div className={`flex flex-col gap-1.5 ${wide ? 'flex-[3_1_280px]' : 'flex-[1_1_150px]'}`}>
        <label htmlFor={id} className="text-[13px] font-semibold">
          {label}
        </label>
        {children}
      </div>
    </FieldContext>
  )
}

/** The inputs of a filter bar are 44px high and a little smaller than the form inputs. */
export const filterInputClass = 'min-h-11 px-3 py-2 text-[15px]'
