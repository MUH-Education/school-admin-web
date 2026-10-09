export type StatusTone =
  'canal' | 'good' | 'dust' | 'bad' | 'muted' | 'ink' | 'grey' | 'chart1' | 'chart2' | 'chart3'

const tones: Record<StatusTone, { text: string; box: string }> = {
  canal: { text: 'text-canal', box: 'border-canal bg-canal' },
  good: { text: 'text-good', box: 'border-good bg-good' },
  dust: { text: 'text-dust-text', box: 'border-dust bg-dust' },
  bad: { text: 'text-bad', box: 'border-bad bg-bad' },
  muted: { text: 'text-ink-soft', box: 'border-ink-soft bg-panel' },
  // The Enquiry list design: a dark square for Applied, a grey one for Contacted.
  ink: { text: 'text-ink', box: 'border-ink bg-ink' },
  grey: { text: 'text-ink-soft', box: 'border-rule-strong bg-rule-strong' },
  // The fee colours of the Students design: blue, amber, red (the chart tokens).
  chart1: { text: 'text-ink', box: 'border-chart-1 bg-chart-1' },
  chart2: { text: 'text-ink', box: 'border-chart-2 bg-chart-2' },
  chart3: { text: 'text-ink', box: 'border-chart-3 bg-chart-3' },
}

/** A status is always a small square plus words, never colour alone. */
export function StatusDot({
  tone,
  children,
  large = false,
  inkText = false,
  plain = false,
  inheritSize = false,
}: {
  tone: StatusTone
  children: string
  /** 15px words and a 10px square, for the title of a page. */
  large?: boolean
  /** The words stay dark whatever the colour of the square (the Enquiry list design). */
  inkText?: boolean
  /** Normal weight words, as in the Fee column of the Students design. */
  plain?: boolean
  /** The words take the size of the row around them (the Analytics list is 13.5px). */
  inheritSize?: boolean
}) {
  const style = tones[tone]
  return (
    <span
      className={`inline-flex items-center ${plain ? '' : 'font-semibold'} ${large ? 'gap-2 text-[15px]' : inheritSize ? 'gap-[7px]' : 'gap-[7px] text-[13px]'} ${inkText ? 'text-ink' : style.text}`}
    >
      <span
        aria-hidden="true"
        className={`flex-none border-2 ${large ? 'size-2.5' : 'size-2'} ${style.box}`}
      />
      {children}
    </span>
  )
}
