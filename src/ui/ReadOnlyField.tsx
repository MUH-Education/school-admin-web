import type { ReactNode } from 'react'

/** The plain-text version of a Field, for people who may look but not change. */
export function ReadOnlyField({
  label,
  children,
  mono = false,
}: {
  label: string
  children: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-[15px] font-semibold">{label}</dt>
      <dd className={mono ? 'font-mono text-base' : 'text-base'}>{children}</dd>
    </div>
  )
}
