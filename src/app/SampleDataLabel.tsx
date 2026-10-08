/** Shown only in mock mode, so nobody mistakes sample data for real data. */
export function SampleDataLabel() {
  if (import.meta.env.VITE_API_MODE !== 'mock') return null
  return (
    <div className="fixed right-0 bottom-0 border border-rule-strong bg-panel px-3 py-1 font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase">
      Sample data
    </div>
  )
}
