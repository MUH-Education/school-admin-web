import { LinkButton } from '@/ui/LinkButton'
import { Panel } from '@/ui/Panel'
import type { AttentionItem } from '../types'

interface AttentionBoxProps {
  items: AttentionItem[]
  /** Where "View children" goes for a route. */
  detailTo: (routeId: number) => string
}

/** "Needs attention now". Hidden when nothing is wrong. The text is the server's. */
export function AttentionBox({ items, detailTo }: AttentionBoxProps) {
  if (items.length === 0) return null
  return (
    <Panel tone="bad" aria-label="Needs attention" className="flex flex-col gap-3 px-5 py-4">
      <h2 className="text-[15px] font-semibold">Needs attention now</h2>
      {items.map((item, index) => (
        <div key={`${item.routeId}-${item.kind}`} className="contents">
          {index > 0 && <div className="h-px bg-rule" />}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-0.5">
              <div
                className={`text-sm font-semibold ${item.kind === 'LATE' ? 'text-dust-text' : 'text-bad'}`}
              >
                {item.title}
              </div>
              <div className="text-[13.5px]">{item.message}</div>
            </div>
            <LinkButton
              to={detailTo(item.routeId)}
              variant={item.kind === 'LATE' ? 'plain' : 'danger'}
            >
              View children <span className="sr-only">of route {item.routeId}</span>
            </LinkButton>
          </div>
        </div>
      ))}
    </Panel>
  )
}
