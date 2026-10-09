/** A stop that is done: one grey line, like "✓ स्टॉप 1 · साधनवास  |  5 चढ़े · 7:26". */
export function DoneStopLine({
  left,
  right,
  onOpen,
}: {
  left: string
  right: string
  /** Opens the stop again, for a child that was missed. */
  onOpen?: () => void
}) {
  const className =
    'flex min-h-[46px] w-full flex-none items-center justify-between gap-3 border-b border-rule bg-panel px-4 py-2 text-left text-base text-ink-soft'
  const content = (
    <>
      <span>{left}</span>
      <span>{right}</span>
    </>
  )
  return onOpen ? (
    <button type="button" onClick={onOpen} className={`${className} cursor-pointer`}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  )
}

/** The blue bar of the stop that is open: its name and a summary of the answers. */
export function StopHeader({ title, summary }: { title: string; summary: string }) {
  return (
    <div className="flex min-h-[58px] flex-none items-center justify-between gap-3 bg-canal px-4 py-2 text-white">
      <h2 className="text-[21px] font-bold">{title}</h2>
      <span className="text-right text-[14.5px] leading-tight">{summary}</span>
    </div>
  )
}
