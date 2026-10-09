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
