export type StatusTone = 'canal' | 'good' | 'dust' | 'bad' | 'muted'

const tones: Record<StatusTone, { text: string; box: string }> = {
  canal: { text: 'text-canal', box: 'border-canal bg-canal' },
  good: { text: 'text-good', box: 'border-good bg-good' },
  dust: { text: 'text-dust-text', box: 'border-dust bg-dust' },
  bad: { text: 'text-bad', box: 'border-bad bg-bad' },
  muted: { text: 'text-ink-soft', box: 'border-ink-soft bg-panel' },
}

/** A status is always a small square plus words, never colour alone. */
export function StatusDot({ tone, children }: { tone: StatusTone; children: string }) {
  const style = tones[tone]
  return (
    <span className={`inline-flex items-center gap-[7px] text-[13px] font-semibold ${style.text}`}>
      <span aria-hidden="true" className={`size-2 flex-none border-2 ${style.box}`} />
      {children}
    </span>
  )
}
