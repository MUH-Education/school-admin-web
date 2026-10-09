import type { Level } from '../papers'

const square: Record<Level, string> = {
  ok: 'bg-good',
  soon: 'bg-dust',
  ended: 'bg-bad',
}
const text: Record<Level, string> = {
  ok: '',
  soon: 'font-semibold text-dust-text',
  ended: 'font-semibold text-bad',
}

/** A small square and words. Never colour alone. */
export function PapersCell({ level, children }: { level: Level; children: string }) {
  return (
    <span className={`inline-flex items-center gap-[7px] text-[13px] ${text[level]}`}>
      <span aria-hidden="true" className={`size-2 flex-none ${square[level]}`} />
      {children}
    </span>
  )
}
