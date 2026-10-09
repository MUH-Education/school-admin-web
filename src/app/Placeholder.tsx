import { PageHeader } from '@/ui/PageHeader'

/** A page that is built in a later phase. */
export function Placeholder({ title, phase }: { title: string; phase: number }) {
  return (
    <>
      <PageHeader title={title} />
      <p className="text-ink-soft">Coming in phase {phase}.</p>
    </>
  )
}

/** The attendant's phone pages. Built in phase 5. */
export function TripPlaceholder() {
  return (
    <main className="p-6">
      <h1 className="text-[30px] leading-[1.1] font-bold">Trip</h1>
      <p className="mt-2 text-ink-soft">Coming in phase 5.</p>
    </main>
  )
}
