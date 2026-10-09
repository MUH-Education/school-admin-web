import { Panel } from '@/ui/Panel'
import { useVehicleAttention } from '../api'
import { attentionLine } from '../papers'

/** "3 papers need attention". Not shown when nothing needs attention (or the call failed). */
export function AttentionBox() {
  const attention = useVehicleAttention()
  if (!attention.data || attention.data.length === 0) return null
  const count = attention.data.length

  return (
    <Panel
      tone="bad"
      aria-label="Papers that need attention"
      className="flex flex-col gap-2.5 px-5 pt-4 pb-[18px]"
    >
      <h2 className="text-[15px] font-semibold">
        {count} {count === 1 ? 'paper needs' : 'papers need'} attention
      </h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
        {attention.data.map((item) => {
          const line = attentionLine(item)
          return (
            <li key={`${item.subject}-${item.item}`}>
              <strong className={line.level === 'ended' ? 'text-bad' : 'text-dust-text'}>
                {line.subject}:
              </strong>{' '}
              {line.text}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
