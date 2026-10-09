import type { ReactNode } from 'react'

interface FormSectionProps {
  /** For example "1. Student". */
  title: string
  description: string
  /** Names the box for screen readers. Default: the title. */
  label?: string
  children: ReactNode
}

/** One numbered part of a long form, in a white box with roomy padding. */
export function FormSection({ title, description, label, children }: FormSectionProps) {
  return (
    <section
      aria-label={label ?? title}
      className="flex flex-col gap-6 border border-rule bg-panel px-8 pt-7 pb-8"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-[19px] font-semibold">{title}</h2>
        <p className="text-sm text-ink-soft">{description}</p>
      </div>
      {children}
    </section>
  )
}

/** The grid of inputs inside a FormSection: 1 to 3 columns, wrapping. */
export function FormGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-x-7 gap-y-[22px]">
      {children}
    </div>
  )
}
