import type { UseQueryResult } from '@tanstack/react-query'
import { classNames, type ClassName } from '@/features/students/types'
import { plural } from '@/lib/format'
import { BarColumns } from '@/ui/BarColumns'
import { classAxisTop } from '../axis'
import type { ClassCount } from '../types'
import { ChartPanel, NO_MATCH, PanelBody } from './ChartPanel'

/** The words under a bar: Nursery → "Nur", Class 5 → "5". */
function shortClass(className: ClassName): string {
  return className === 'Nursery' ? 'Nur' : className.replace(/^Class /, '')
}

/** Every class in teaching order, also those the server leaves out (nobody there). */
function inClassOrder(list: ClassCount[]): ClassCount[] {
  return classNames.map((className) => ({
    className,
    count: list.find((c) => c.className === className)?.count ?? 0,
  }))
}

const BELOW = classNames.indexOf('Class 9')

/** Chart 3: one bar per class, one colour, bars start at zero. */
export function ClassPanel({
  query,
  noStudents,
}: {
  query: UseQueryResult<ClassCount[]>
  noStudents: boolean
}) {
  const classes = query.data ? inClassOrder(query.data) : null
  const total = classes?.reduce((sum, c) => sum + c.count, 0) ?? 0
  const below = classes?.slice(0, BELOW).reduce((sum, c) => sum + c.count, 0) ?? 0
  const subtitle =
    classes && total > 0
      ? `${below} of ${total} ${total === 1 ? 'child is' : 'children are'} below Class 9`
      : 'Children in each class'

  return (
    <ChartPanel title="Students in each class" subtitle={subtitle}>
      <PanelBody query={query} minHeight={204}>
        {() => {
          const rows = classes ?? []
          const top = classAxisTop(Math.max(0, ...rows.map((c) => c.count)))
          const filled = rows.filter((c) => c.count > 0)
          const biggest = filled.reduce<ClassCount | null>(
            (best, c) => (best === null || c.count > best.count ? c : best),
            null,
          )
          const smallest = filled.reduce<ClassCount | null>(
            (best, c) => (best === null || c.count < best.count ? c : best),
            null,
          )
          return (
            <>
              <BarColumns
                label="Students in each class"
                variant="single"
                height={180}
                axisWidth={24}
                max={top}
                ticks={[String(top), String(top / 2), '0']}
                emptyMessage={total === 0 ? NO_MATCH : undefined}
                groups={rows.map((c) => ({
                  label: shortClass(c.className),
                  bars: [
                    {
                      value: c.count,
                      color: 'chart1',
                      title: `${c.className}: ${plural(c.count, 'student')}`,
                    },
                  ],
                }))}
              />
              <p className="min-h-[18.2px] text-[13px] text-ink">
                {biggest && smallest && !noStudents && filled.length === 1 && (
                  <>
                    Only {biggest.className} has students: <strong>{biggest.count}</strong>.
                  </>
                )}
                {biggest && smallest && !noStudents && filled.length > 1 && (
                  <>
                    Largest class: {biggest.className} with <strong>{biggest.count}</strong>.
                    Smallest: {smallest.className} with <strong>{smallest.count}</strong>.
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
