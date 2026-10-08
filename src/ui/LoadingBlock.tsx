export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="border border-rule bg-panel p-8 text-center text-ink-soft"
    >
      {label}
    </div>
  )
}
