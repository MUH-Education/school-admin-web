import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  hint?: string
  action?: ReactNode
}

export function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-2 border border-rule bg-panel p-8">
      <p className="text-[17px] font-semibold">{title}</p>
      {hint && <p className="text-ink-soft">{hint}</p>}
      {action}
    </div>
  )
}
