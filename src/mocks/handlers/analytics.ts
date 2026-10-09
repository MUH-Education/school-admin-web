import { http, HttpResponse, type JsonBodyType } from 'msw'
import {
  TABLE_PAGE_SIZE,
  type AnalyticsStudentPage,
  type SortColumn,
  type SortDirection,
} from '@/features/analytics/types'
import {
  classesOf,
  csvOf,
  monthsOf,
  occupationsOf,
  readFilters,
  sortedStudents,
  summaryOf,
  villagesOf,
} from '../analyticsLogic'
import { authorize, wait } from '../http'
import { MOCK_TODAY } from '../now'

const sortColumns: SortColumn[] = ['name', 'class', 'pending']

function readSort(url: URL): { sort: SortColumn; dir: SortDirection } {
  const sort = url.searchParams.get('sort') as SortColumn
  const dir = url.searchParams.get('dir')
  return {
    sort: sortColumns.includes(sort) ? sort : 'pending',
    dir: dir === 'asc' || dir === 'desc' ? dir : sort === 'pending' || !sort ? 'desc' : 'asc',
  }
}

/** One small GET handler: the permission check, the wait, and the answer from the filters. */
function answer(path: string, make: (url: URL) => JsonBodyType) {
  return http.get(`/api/v1/analytics/${path}`, async ({ request }) => {
    await wait()
    const me = authorize(request, 'ANALYTICS_VIEW')
    if (me instanceof Response) return me
    return HttpResponse.json(make(new URL(request.url)))
  })
}

export const analyticsHandlers = [
  answer('summary', (url) => summaryOf(readFilters(url))),
  answer('fee-collection-by-month', (url) => monthsOf(readFilters(url))),
  answer('payment-by-occupation', (url) => occupationsOf(readFilters(url))),
  answer('students-by-class', (url) => classesOf(readFilters(url))),
  answer('students-by-village', (url) => villagesOf(readFilters(url))),
  answer('students', (url): AnalyticsStudentPage => {
    const { sort, dir } = readSort(url)
    const all = sortedStudents(readFilters(url), sort, dir)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const start = (page - 1) * TABLE_PAGE_SIZE
    return {
      items: all.slice(start, start + TABLE_PAGE_SIZE),
      page,
      pageSize: TABLE_PAGE_SIZE,
      total: all.length,
    }
  }),

  // The whole filtered list, not one page, in the order of the screen. The file name carries the
  // day of the mock clock (7 Oct 2026); the real server names its own file.
  http.get('/api/v1/analytics/students.csv', async ({ request }) => {
    await wait()
    const me = authorize(request, 'ANALYTICS_VIEW')
    if (me instanceof Response) return me
    const url = new URL(request.url)
    const { sort, dir } = readSort(url)
    return new HttpResponse(csvOf(sortedStudents(readFilters(url), sort, dir)), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="students-${MOCK_TODAY}.csv"`,
      },
    })
  }),
]
