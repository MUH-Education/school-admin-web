import { useSessions } from '@/features/fees/api'
import { feeStatusLabels, type FeeStatus } from '@/features/fees/types'
import { useRoutes } from '@/features/routes/api'
import { useStudents } from '@/features/students/api'
import { classNames, occupationLabels, occupations } from '@/features/students/types'
import { FilterBar, FilterField, filterInputClass } from '@/ui/FilterBar'
import { Select } from '@/ui/Select'
import type { AnalyticsFilters, AnalyticsSummary } from '../types'
import type { FilterName } from '../useAnalyticsFilters'

interface AnalyticsFilterBarProps {
  filters: AnalyticsFilters
  setFilter: (name: FilterName, value: string) => void
  anyFilter: boolean
  clear: () => void
  /** The counts for the line under the filters. Undefined while they load. */
  summary: AnalyticsSummary | undefined
  /** True when the count could not be loaded. The tiles show the error and the Retry button. */
  summaryFailed?: boolean
}

const emptyFilterBox = { students: 0, allStudents: 0 }

/** The six filters of Analytics.dc.html and the line "Showing 37 of 290 students." under them. */
export function AnalyticsFilterBar({
  filters,
  setFilter,
  anyFilter,
  clear,
  summary,
  summaryFailed = false,
}: AnalyticsFilterBarProps) {
  const sessions = useSessions()
  const routes = useRoutes()
  // The village list is the list of every village of the school, not the villages left by the filters.
  const villageSource = useStudents({ q: '', className: '', bus: '', village: '', page: 1 })

  const current = sessions.data?.find((s) => s.current)
  const sessionValue = filters.session || (current ? String(current.id) : '')
  const villages = [
    ...new Set([
      ...(villageSource.data?.villages ?? []),
      ...(filters.village ? [filters.village] : []),
    ]),
  ].sort((a, b) => a.localeCompare(b))
  const { students, allStudents } = summary ?? emptyFilterBox

  return (
    <FilterBar
      label="Filters"
      summary={
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
          {summaryFailed ? (
            <span className="font-semibold">The count could not be loaded.</span>
          ) : !summary ? (
            <span className="font-semibold text-ink-soft">Counting students…</span>
          ) : anyFilter ? (
            <span className="font-semibold">
              Showing {students} of {allStudents} {allStudents === 1 ? 'student' : 'students'}.
            </span>
          ) : (
            <span className="font-semibold">
              Showing all {students} {students === 1 ? 'student' : 'students'}.
            </span>
          )}
          {anyFilter ? (
            <button type="button" onClick={clear} className="font-semibold text-canal underline">
              Clear filters
            </button>
          ) : (
            <span className="text-ink-soft">
              Example: choose &quot;Jakhal&quot; and &quot;Delayed&quot; to see who in Jakhal is
              late with fees.
            </span>
          )}
        </div>
      }
    >
      <FilterField label="Session">
        <Select
          className={filterInputClass}
          value={sessionValue}
          onChange={(event) =>
            // The session in progress is the same as "no choice", so it is left out of the address.
            setFilter(
              'session',
              event.target.value === String(current?.id) ? '' : event.target.value,
            )
          }
        >
          {(sessions.data ?? []).map((session) => (
            <option key={session.id} value={String(session.id)}>
              {session.label}
            </option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Class">
        <Select
          className={filterInputClass}
          value={filters.className}
          onChange={(event) => setFilter('className', event.target.value)}
        >
          <option value="">All classes</option>
          {classNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Village">
        <Select
          className={filterInputClass}
          value={filters.village}
          onChange={(event) => setFilter('village', event.target.value)}
        >
          <option value="">All villages</option>
          {villages.map((village) => (
            <option key={village} value={village}>
              {village}
            </option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Bus route">
        <Select
          className={filterInputClass}
          value={filters.bus}
          onChange={(event) => setFilter('bus', event.target.value)}
        >
          <option value="">All, with and without bus</option>
          <option value="YES">Only bus children</option>
          <option value="NO">No bus</option>
          {(routes.data ?? []).map((route) => (
            <option key={route.id} value={String(route.id)}>
              {route.name}
            </option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Father's occupation">
        <Select
          className={filterInputClass}
          value={filters.occupation}
          onChange={(event) => setFilter('occupation', event.target.value)}
        >
          <option value="">All occupations</option>
          {occupations.map((code) => (
            <option key={code} value={code}>
              {occupationLabels[code]}
            </option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Fee payment">
        <Select
          className={filterInputClass}
          value={filters.feeStatus}
          onChange={(event) => setFilter('feeStatus', event.target.value)}
        >
          <option value="">All</option>
          {(Object.keys(feeStatusLabels) as FeeStatus[]).map((code) => (
            <option key={code} value={code}>
              {feeStatusLabels[code]}
            </option>
          ))}
        </Select>
      </FilterField>
    </FilterBar>
  )
}
