import type { UseQueryResult } from '@tanstack/react-query'
import { plural } from '@/lib/format'
import { BarList } from '@/ui/BarList'
import { barListMinHeight } from '@/ui/chartMath'
import type { VillageCount } from '../types'
import { ChartPanel, NO_MATCH, PanelBody } from './ChartPanel'

const TOP = 8

/** Chart 4: the biggest villages, with the number at the end of each bar. */
export function VillagePanel({
  query,
  noStudents,
}: {
  query: UseQueryResult<VillageCount[]>
  noStudents: boolean
}) {
  const villages = query.data
    ? [...query.data].sort((a, b) => b.count - a.count || a.village.localeCompare(b.village))
    : null
  const subtitle = !villages
    ? 'Where to advertise and where a bus pays.'
    : villages.length > TOP
      ? `Top ${TOP} of ${villages.length} villages. Shows where to advertise and where a bus pays.`
      : `${plural(villages.length, 'village')}. Shows where to advertise and where a bus pays.`

  return (
    <ChartPanel title="Students by village" subtitle={subtitle}>
      <PanelBody query={query} minHeight={barListMinHeight(TOP)}>
        {() => {
          const list = villages ?? []
          const rest = list.slice(TOP)
          const restStudents = rest.reduce((sum, v) => sum + v.count, 0)
          return (
            <>
              <BarList
                reserveRows={TOP}
                emptyMessage={
                  list.length === 0 ? (noStudents ? NO_MATCH : 'No villages yet') : undefined
                }
                rows={list.slice(0, TOP).map((v) => ({
                  name: v.village,
                  value: v.count,
                  title: `${v.village}: ${plural(v.count, 'student')}`,
                }))}
              />
              <p className="min-h-[18.2px] text-[13px] text-ink-soft">
                {rest.length > 0 &&
                  `The other ${rest.length === 1 ? 'village has' : `${rest.length} villages have`} ${plural(restStudents, 'student')} together.`}
              </p>
            </>
          )
        }}
      </PanelBody>
    </ChartPanel>
  )
}
