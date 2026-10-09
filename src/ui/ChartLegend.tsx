import { chartBackground, type ChartColor } from './chartColors'

/** The key of a chart: a 12px square and the words in ink, never in the colour of the bar. */
export function ChartLegend({ items }: { items: { label: string; color: ChartColor }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`size-3 ${chartBackground[item.color]}`} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
