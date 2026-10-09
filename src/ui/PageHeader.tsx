import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** A breadcrumb above the title. When it is given, the small label is not needed. */
  breadcrumb?: ReactNode /** Small capital label above the title. */
  label?: string
  title: string
  description?: ReactNode
  /** Widest the description may be, in pixels. Most designs use 600; Bus status uses 560. */
  descriptionWidth?: number
  /** Buttons on the right. */
  action?: ReactNode
  /** Extra classes for the description, for example `leading-[1.4]` (the Analytics design keeps the page line height). */
  descriptionClass?: string
  /** The roomy forms: 8px between the lines, a 15px description (Add an enquiry design). */
  roomy?: boolean
}

export function PageHeader({
  breadcrumb,
  label,
  title,
  description,
  descriptionWidth = 600,
  descriptionClass = '',
  action,
  roomy = false,
}: PageHeaderProps) {
  return (
    <header
      className={`flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b-2 border-ink ${roomy ? 'pb-[18px]' : 'pb-4'}`}
    >
      <div className={`flex min-w-0 flex-col ${roomy ? 'gap-2' : 'gap-1.5'}`}>
        {breadcrumb}
        {label && (
          <div className="font-mono text-[11px] tracking-[0.08em] text-dust-text uppercase">
            {label}
          </div>
        )}
        <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.02em]">{title}</h1>
        {description && (
          <p
            className={`text-ink-soft ${roomy ? 'text-[15px]' : 'text-sm'} ${descriptionClass}`}
            style={{ maxWidth: descriptionWidth }}
          >
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  )
}
