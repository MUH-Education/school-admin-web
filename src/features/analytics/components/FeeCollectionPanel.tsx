import type { UseQueryResult } from '@tanstack/react-query'
import { formatMonth } from '@/lib/format'
import { BarColumns } from '@/ui/BarColumns'
import { ChartLegend } from '@/ui/ChartLegend'
import type { MonthCollection } from '../types'
import { ChartPanel, NO_MATCH, PanelBody } from './ChartPanel'

const percent = (value: number | null) => (value === null ? '–' : `${value}%`)

/** Chart 1: two bars per month, the share of that month's fee that has been paid so far. */
export function FeeCollectionPanel({
  query,
  noStudents,
}: {
  query: UseQueryResult<MonthCollection[]>
  /** The filters match nobody. */
  noStudents: boolean
}) {
  return (
    <ChartPanel
      title="Fee collected each month"
      subtitle="Share of that month's fee that has been paid so far"
      legend={
        <ChartLegend
          items={[
            { label: 'School fee', color: 'chart1' },
            { label: 'Bus fee', color: 'chart2' },
          ]}
        />
      }
    >
      <PanelBody query={query} minHeight={224}>
        {(months) => {
          const hasNumbers = months.some((m) => m.schoolPercent !== null || m.busPercent !== null)
          const newest = months.at(-1)
          return (
            <>
              <BarColumns
                label="Fee collected each month"
                variant="grouped"
                height={200}
                axisWidth={36}
                max={100}
                ticks={['100%', '50%', '0%']}
                emptyMessage={
                  noStudents ? NO_MATCH : hasNumbers ? undefined : 'No fee has fallen due yet'
                }
                groups={months.map((m) => {
                  const name = formatMonth(m.month)
                  return {
                    label: name,
                    bars: [
                      {
                        value: m.schoolPercent,
                        color: 'chart1',
                        title:
                          m.schoolPercent === null
                            ? `School fee, ${name}: no fee was due`
                            : `School fee, ${name}: ${m.schoolPercent}% collected`,
                      },
                      {
                        value: m.busPercent,
                        color: 'chart2',
                        title:
                          m.busPercent === null
                            ? `Bus fee, ${name}: no fee was due`
                            : `Bus fee, ${name}: ${m.busPercent}% collected`,
                      },
                    ],
                  }
                })}
              />
              <p className="min-h-[18.2px] text-[13px] text-ink">
                {newest && hasNumbers && !noStudents && (
                  <>
                    {formatMonth(newest.month, 'long')} so far: school fee{' '}
                    <strong>{percent(newest.schoolPercent)}</strong>, bus fee{' '}
                    <strong>{percent(newest.busPercent)}</strong>.
                  </>
                )}
              </p>
            </>
          )
        }}
      </PanelBody>
    </ChartPanel>
  )
}
