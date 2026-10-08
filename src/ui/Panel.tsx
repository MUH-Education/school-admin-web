import type { ComponentProps } from 'react'

type Tone = 'dust' | 'bad' | 'ink'

const tones: Record<Tone, string> = {
  dust: 'border-t-[3px] border-t-dust',
  bad: 'border-t-[3px] border-t-bad',
  ink: 'border-t-[3px] border-t-ink',
}

interface PanelProps extends ComponentProps<'section'> {
  /** A 3px top border for callout boxes. */
  tone?: Tone
}

export function Panel({ tone, className = '', ...rest }: PanelProps) {
  return (
    <section
      className={`border border-rule bg-panel p-5 ${tone ? tones[tone] : ''} ${className}`}
      {...rest}
    />
  )
}
