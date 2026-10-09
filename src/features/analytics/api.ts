import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { api, apiFile } from '@/api/client'
import { todayIso } from '@/lib/format'
import { saveFile } from '@/lib/saveFile'
import type {
  AnalyticsFilters,
  AnalyticsStudentPage,
  AnalyticsSummary,
  ClassCount,
  MonthCollection,
  OccupationPayment,
  TableState,
  VillageCount,
} from './types'

/**
 * The six filters as the query part of a call, with the names of docs/backend/api.md:
 * ?sessionId=1&className=UKG&village=Jakhal&routeId=4&occupation=FARMER_SMALL&feeStatus=DELAYED.
 * `bus` is YES or NO for "with or without a bus"; a number is a route (the same words as Students).
 * `extra` adds the sort and the page for the table.
 */
export function analyticsQuery(
  filters: AnalyticsFilters,
  extra: Record<string, string> = {},
): string {
  const params = new URLSearchParams()
  if (filters.session) params.set('sessionId', filters.session)
  if (filters.className) params.set('className', filters.className)
  if (filters.village) params.set('village', filters.village)
  if (/^\d+$/.test(filters.bus)) params.set('routeId', filters.bus)
  else if (filters.bus) params.set('bus', filters.bus)
  if (filters.occupation) params.set('occupation', filters.occupation)
  if (filters.feeStatus) params.set('feeStatus', filters.feeStatus)
  for (const [name, value] of Object.entries(extra)) params.set(name, value)
  const text = params.toString()
  return text ? `?${text}` : ''
}

/** The sort and the page of the table, as the table call and the file take them. */
export function tableQuery(table: TableState): Record<string, string> {
  return {
    sort: table.sort,
    dir: table.dir,
    ...(table.page > 1 ? { page: String(table.page) } : {}),
  }
}

/**
 * One call of the page. All of them get the same filter object, and the key carries it, so a
 * change of filter fetches again. The old answer stays on the screen until the new one arrives
 * (`isPlaceholderData` is true meanwhile), so the page fades a little and does not jump.
 */
function useAnalytics<T>(name: string, filters: AnalyticsFilters, extra?: Record<string, string>) {
  return useQuery({
    queryKey: ['analytics', name, filters, extra ?? null],
    queryFn: () => api<T>('GET', `/analytics/${name}${analyticsQuery(filters, extra)}`),
    placeholderData: keepPreviousData,
  })
}

export const useAnalyticsSummary = (filters: AnalyticsFilters) =>
  useAnalytics<AnalyticsSummary>('summary', filters)

export const useFeeCollectionByMonth = (filters: AnalyticsFilters) =>
  useAnalytics<MonthCollection[]>('fee-collection-by-month', filters)

export const usePaymentByOccupation = (filters: AnalyticsFilters) =>
  useAnalytics<OccupationPayment[]>('payment-by-occupation', filters)

export const useStudentsByClass = (filters: AnalyticsFilters) =>
  useAnalytics<ClassCount[]>('students-by-class', filters)

export const useStudentsByVillage = (filters: AnalyticsFilters) =>
  useAnalytics<VillageCount[]>('students-by-village', filters)

/** One page of the table, in the order asked for. */
export const useAnalyticsStudents = (filters: AnalyticsFilters, table: TableState) =>
  useAnalytics<AnalyticsStudentPage>('students', filters, tableQuery(table))

/**
 * "Download as Excel": the whole filtered list (not one page) in the order of the screen. The file
 * is fetched with the token in the header, then saved under the name the server suggests, or
 * students-<today>.csv.
 */
export function useDownloadStudents() {
  return useMutation({
    mutationFn: async ({ filters, table }: { filters: AnalyticsFilters; table: TableState }) => {
      const { blob, filename } = await apiFile(
        `/analytics/students.csv${analyticsQuery(filters, { sort: table.sort, dir: table.dir })}`,
      )
      saveFile(blob, filename ?? `students-${todayIso()}.csv`)
    },
  })
}
