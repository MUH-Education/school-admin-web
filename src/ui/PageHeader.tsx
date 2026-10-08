import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Small capital label above the title. */
  label?: string
  title: string
  description?: string
  /** Buttons on the right. */
  action?: ReactNode
}

export function PageHeader({ label, title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b-2 border-ink pb-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        {label && (
          <div className="font-mono text-[11px] tracking-[0.08em] text-dust-text uppercase">
            {label}
          </div>
        )}
        <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.02em]">{title}</h1>
        {description && <p className="max-w-[600px] text-sm text-ink-soft">{description}</p>}
      </div>
      {action}
    </header>
  )
}
