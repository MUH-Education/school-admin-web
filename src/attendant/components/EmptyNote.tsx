import type { ReactNode } from 'react'

/** A short note in the list area, for example "there is nobody on the bus". */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="p-4 text-[18px] text-ink-soft">{children}</p>
}
