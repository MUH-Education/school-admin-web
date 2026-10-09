import type { ReactNode } from 'react'

export interface Definition {
  label: string
  value: ReactNode
  /** Mono font, for numbers and codes. */
  mono?: boolean
}

/** A small grey label over a value, in columns that wrap. Used for the student details. */
export function DefinitionGrid({ items }: { items: Definition[] }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-x-6 gap-y-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5">
          <dt className="text-[13px] text-ink-soft">{item.label}</dt>
          <dd className={`text-[15px] ${item.mono ? 'font-mono' : ''}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
