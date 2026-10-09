import {
  useAnalyticsStudents,
  useAnalyticsSummary,
  useFeeCollectionByMonth,
  usePaymentByOccupation,
  useStudentsByClass,
  useStudentsByVillage,
} from '../api'
import { AnalyticsFilterBar } from '../components/AnalyticsFilterBar'
import { ClassPanel } from '../components/ClassPanel'
import { FeeCollectionPanel } from '../components/FeeCollectionPanel'
import { OccupationPanel } from '../components/OccupationPanel'
import { StudentsListSection } from '../components/StudentsListSection'
import { SummaryTiles } from '../components/SummaryTiles'
import { VillagePanel } from '../components/VillagePanel'
import { useAnalyticsFilters } from '../useAnalyticsFilters'
import { PageHeader } from '@/ui/PageHeader'

/**
 * Analytics: six filters, five tiles, four charts and a list of students. Every call gets the same
 * filter object from `useAnalyticsFilters()`, so the page can never show two different sets.
 */
export function AnalyticsPage() {
  const controls = useAnalyticsFilters()
  const { filters } = controls

  const summary = useAnalyticsSummary(filters)
  const months = useFeeCollectionByMonth(filters)
  const occupations = usePaymentByOccupation(filters)
  const classes = useStudentsByClass(filters)
  const villages = useStudentsByVillage(filters)
  const students = useAnalyticsStudents(filters, controls.table)

  const noStudents = summary.data?.students === 0

  return (
    <>
      <PageHeader
        label="Reports · Students, families and fees"
        title="Analytics"
        description="Choose filters. Every graph and the list at the bottom follow the same filters. Nothing is typed here. The data comes from the admission form and fee payments."
        descriptionWidth={620}
      />
      <AnalyticsFilterBar
        filters={filters}
        setFilter={controls.setFilter}
        anyFilter={controls.anyFilter}
        clear={controls.clear}
        summary={summary.data}
        summaryFailed={summary.isError}
      />
      <SummaryTiles query={summary} />
      <div className="flex flex-wrap items-stretch gap-6">
        <FeeCollectionPanel query={months} noStudents={noStudents} />
        <OccupationPanel query={occupations} noStudents={noStudents} />
      </div>
      <div className="flex flex-wrap items-stretch gap-6">
        <ClassPanel query={classes} noStudents={noStudents} />
        <VillagePanel query={villages} noStudents={noStudents} />
      </div>
      <StudentsListSection
        query={students}
        table={controls.table}
        sortBy={controls.sortBy}
        setPage={controls.setPage}
        anyFilter={controls.anyFilter}
        clear={controls.clear}
      />
    </>
  )
}
