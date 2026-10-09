import type { ReactNode } from 'react'

export interface HistoryItem {
  key: string | number
  /** Small grey word on the left, for example "Driver". */
  label: string
  /** The name. */
  title: string
  /** For example "1 Apr 2026 to now". */
  when: ReactNode
  /** Bold name for the person who is on the job now. */
  current?: boolean
}

/** Old names stay on the list, newest first. */
export function HistoryList({ items }: { items: HistoryItem[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li
          key={item.key}
          className="grid grid-cols-[88px_minmax(0,1fr)_minmax(150px,1.2fr)] gap-x-3.5 border-t border-rule py-[9px] text-sm"
        >
          <span className="text-ink-soft">{item.label}</span>
          <span className={item.current ? 'font-semibold' : ''}>{item.title}</span>
          <span className="font-mono text-[12.5px] text-ink-soft">{item.when}</span>
        </li>
      ))}
    </ul>
  )
}
