export type StatusTone = 'canal' | 'good' | 'dust' | 'bad' | 'muted'

const tones: Record<StatusTone, { text: string; box: string }> = {
  canal: { text: 'text-canal', box: 'border-canal bg-canal' },
  good: { text: 'text-good', box: 'border-good bg-good' },
  dust: { text: 'text-dust-text', box: 'border-dust bg-dust' },
  bad: { text: 'text-bad', box: 'border-bad bg-bad' },
  muted: { text: 'text-ink-soft', box: 'border-ink-soft bg-panel' },
}

/** A status is always a small square plus words, never colour alone. */
export function StatusDot({
  tone,
  children,
  large = false,
}: {
  tone: StatusTone
  children: string
  /** 15px words and a 10px square, for the title of a page. */
  large?: boolean
}) {
  const style = tones[tone]
  return (
    <span
      className={`inline-flex items-center font-semibold ${large ? 'gap-2 text-[15px]' : 'gap-[7px] text-[13px]'} ${style.text}`}
    >
      <span
        aria-hidden="true"
        className={`flex-none border-2 ${large ? 'size-2.5' : 'size-2'} ${style.box}`}
      />
      {children}
    </span>
  )
}
