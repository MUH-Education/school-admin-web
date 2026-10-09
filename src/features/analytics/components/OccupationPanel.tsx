import type { UseQueryResult } from '@tanstack/react-query'
import { feeStatusLabels } from '@/features/fees/types'
import { occupationLabels } from '@/features/students/types'
import { plural } from '@/lib/format'
import { ChartLegend } from '@/ui/ChartLegend'
import { stackedMinHeight } from '@/ui/chartMath'
import { StackedBar } from '@/ui/StackedBar'
import type { OccupationPayment } from '../types'
import { ChartPanel, NO_MATCH, PanelBody } from './ChartPanel'

/** Chart 2: one stacked bar per father's occupation: on time, delayed, defaulted. */
export function OccupationPanel({
  query,
  noStudents,
}: {
  query: UseQueryResult<OccupationPayment[]>
  noStudents: boolean
}) {
  return (
    <ChartPanel
      title="Fee payment by father's occupation"
      subtitle="Which kinds of families pay on time"
      legend={
        <ChartLegend
          items={[
            { label: feeStatusLabels.ON_TIME, color: 'chart1' },
            { label: feeStatusLabels.DELAYED, color: 'chart2' },
            { label: feeStatusLabels.DEFAULTED, color: 'chart3' },
          ]}
        />
      }
    >
      <PanelBody query={query} minHeight={stackedMinHeight(8)}>
        {(list) => (
          <StackedBar
            emptyMessage={
              list.length > 0 ? undefined : noStudents ? NO_MATCH : 'No student has a fee plan yet'
            }
            rows={list.map((o) => {
              const name = o.occupation ? occupationLabels[o.occupation] : 'Not told'
              const total = o.onTime + o.delayed + o.defaulted
              const onTimePercent = total === 0 ? 0 : Math.round((o.onTime / total) * 100)
              return {
                name,
                note: `${plural(total, 'student')} · ${onTimePercent}% on time`,
                title: `${name}: ${o.onTime} on time, ${o.delayed} delayed, ${o.defaulted} defaulted`,
                parts: [
                  { value: o.onTime, color: 'chart1', title: `${name}: ${o.onTime} on time` },
                  { value: o.delayed, color: 'chart2', title: `${name}: ${o.delayed} delayed` },
                  {
                    value: o.defaulted,
                    color: 'chart3',
                    title: `${name}: ${o.defaulted} defaulted`,
                  },
                ],
              }
            })}
          />
        )}
      </PanelBody>
    </ChartPanel>
  )
}
