import type { ReactNode } from 'react'

type Tone = 'ink' | 'bad'
type Size = 'large' | 'small'

interface TileProps {
  label: string
  value: ReactNode
  /** `bad` makes the number red, for a loss or an overload. */
  tone?: Tone
  size?: Size
}

/** One number with a small label above it. Numbers use the mono font. */
export function Tile({ label, value, tone = 'ink', size = 'large' }: TileProps) {
  return (
    <div
      className={`flex flex-col gap-1 bg-panel ${size === 'large' ? 'px-4 py-3.5' : 'px-3.5 py-3'}`}
    >
      <div className="font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase">{label}</div>
      <div
        className={`font-mono font-semibold ${size === 'large' ? 'text-2xl' : 'text-[17px]'} ${tone === 'bad' ? 'text-bad' : ''}`}
      >
        {value}
      </div>
    </div>
  )
}

interface TileRowProps {
  label: string
  children: ReactNode
  /** Smallest tile width in pixels. Tiles wrap when the row is narrow. */
  minTile?: number
}

/** A row of tiles with thin lines between them. */
export function TileRow({ label, children, minTile = 170 }: TileRowProps) {
  return (
    <section
      aria-label={label}
      className="grid gap-px border border-rule bg-rule"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(${minTile}px, 100%), 1fr))` }}
    >
      {children}
    </section>
  )
}
