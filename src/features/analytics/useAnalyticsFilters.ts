import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { feeStatusLabels } from '@/features/fees/types'
import { occupationLabels } from '@/features/students/types'
import {
  defaultTable,
  type AnalyticsFilters,
  type SortColumn,
  type SortDirection,
  type TableState,
} from './types'

export type FilterName = Extract<keyof AnalyticsFilters, string>

const filterNames: FilterName[] = [
  'session',
  'className',
  'village',
  'bus',
  'occupation',
  'feeStatus',
]
const sortColumns: SortColumn[] = ['name', 'class', 'pending']

/** A name clicked for the first time sorts the way people expect: A to Z, biggest debt first. */
export function firstDirection(column: SortColumn): SortDirection {
  return column === 'pending' ? 'desc' : 'asc'
}

export interface AnalyticsFilterControls {
  /** The one filter object. Every call of the page gets this same object. */
  filters: AnalyticsFilters
  table: TableState
  setFilter: (name: FilterName, value: string) => void
  /** Click on a column name: the same column turns round, a new one starts in its first direction. */
  sortBy: (column: SortColumn) => void
  setPage: (page: number) => void
  /** Empties the six filters. The sort stays. */
  clear: () => void
  anyFilter: boolean
}

/**
 * The six filters, the sort and the page live in the address (decision B14):
 * /analytics?village=Jakhal&feeStatus=DELAYED&sort=name&dir=asc&page=2.
 * A word the page does not know is read as "not set", so a hand-made link cannot break a call.
 */
export function useAnalyticsFilters(): AnalyticsFilterControls {
  const [params, setParams] = useSearchParams()

  const read = (name: string) => params.get(name) ?? ''
  const session = /^\d+$/.test(read('session')) ? read('session') : ''
  const bus =
    read('bus') === 'YES' || read('bus') === 'NO' || /^\d+$/.test(read('bus')) ? read('bus') : ''
  const occupation = read('occupation') in occupationLabels ? read('occupation') : ''
  const feeStatus = read('feeStatus') in feeStatusLabels ? read('feeStatus') : ''
  const className = read('className')
  const village = read('village')

  const filters = useMemo<AnalyticsFilters>(
    () => ({ session, className, village, bus, occupation, feeStatus }),
    [session, className, village, bus, occupation, feeStatus],
  )

  const sort = sortColumns.find((c) => c === params.get('sort')) ?? defaultTable.sort
  const dirText = params.get('dir')
  const dir: SortDirection =
    dirText === 'asc' || dirText === 'desc'
      ? dirText
      : params.get('sort')
        ? firstDirection(sort)
        : defaultTable.dir
  const pageNumber = Number(params.get('page'))
  const page = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1
  const table = useMemo<TableState>(() => ({ sort, dir, page }), [sort, dir, page])

  /** Writes everything to the address. Values that are the default are left out. */
  function write(nextFilters: AnalyticsFilters, next: TableState) {
    const out = new URLSearchParams()
    for (const name of filterNames) {
      if (nextFilters[name]) out.set(name, nextFilters[name])
    }
    if (next.sort !== defaultTable.sort || next.dir !== defaultTable.dir) {
      out.set('sort', next.sort)
      out.set('dir', next.dir)
    }
    if (next.page > 1) out.set('page', String(next.page))
    setParams(out)
  }

  return {
    filters,
    table,
    setFilter(name, value) {
      // A new filter starts the list on page 1.
      write({ ...filters, [name]: value }, { ...table, page: 1 })
    },
    sortBy(column) {
      const dir =
        column === table.sort ? (table.dir === 'asc' ? 'desc' : 'asc') : firstDirection(column)
      write(filters, { sort: column, dir, page: 1 })
    },
    setPage(next) {
      write(filters, { ...table, page: next })
    },
    clear() {
      write(
        { session: '', className: '', village: '', bus: '', occupation: '', feeStatus: '' },
        { ...table, page: 1 },
      )
    },
    anyFilter: filterNames.some((name) => filters[name] !== ''),
  }
}
