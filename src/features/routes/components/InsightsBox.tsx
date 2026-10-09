import { Panel } from '@/ui/Panel'
import { loadBoardInsights } from '../insights'
import type { LoadBoardRow } from '../types'

/** Plain sentences that say what the numbers mean. */
export function InsightsBox({ rows }: { rows: LoadBoardRow[] }) {
  const insights = loadBoardInsights(rows)
  if (insights.length === 0) return null
  return (
    <Panel
      tone="dust"
      aria-label="What the board is telling you"
      className="flex flex-col gap-2.5 px-[22px] pt-[18px] pb-5"
    >
      <h2 className="text-[15px] font-semibold">What this page is telling you</h2>
      <ul className="flex max-w-[860px] list-disc flex-col gap-2 pl-5 text-sm leading-[1.55]">
        {insights.map((insight) => (
          <li key={insight.id}>
            {insight.parts.map((part, index) =>
              part.strong ? <strong key={index}>{part.text}</strong> : part.text,
            )}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
