import type { ReactNode } from 'react'

interface FormSectionProps {
  /** For example "1. Student". */
  title: string
  description: string
  /** Names the box for screen readers. Default: the title. */
  label?: string
  /** The roomy forms: the description is 14px on the page's own line height. */
  roomy?: boolean
  /** Extra classes on the box, for example `text-[15px] leading-[1.45]` (the Admission design). */
  className?: string
  children: ReactNode
}

/** One numbered part of a long form, in a white box with roomy padding. */
export function FormSection({
  title,
  description,
  label,
  roomy = false,
  className = '',
  children,
}: FormSectionProps) {
  return (
    <section
      aria-label={label ?? title}
      className={`flex flex-col gap-6 border border-rule bg-panel px-8 pt-7 pb-8 ${className}`}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-[19px] font-semibold">{title}</h2>
        <p className={`text-ink-soft ${roomy ? 'text-[14px]' : 'text-sm'}`}>{description}</p>
      </div>
      {children}
    </section>
  )
}

/**
 * The grid of inputs inside a FormSection: 1 to 3 columns, wrapping.
 * `roomy` is the Add an enquiry look: two inputs to a row, 300px at least, more air between.
 */
export function FormGrid({ children, roomy = false }: { children: ReactNode; roomy?: boolean }) {
  return (
    <div
      className={`grid ${
        roomy
          ? 'grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-x-8 gap-y-6'
          : 'grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-x-7 gap-y-[22px]'
      }`}
    >
      {children}
    </div>
  )
}
