import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { StudentFilters } from '../types'

const SEARCH_WAIT_MS = 300

type FilterName = 'className' | 'bus' | 'village'

export interface StudentFilterControls {
  filters: StudentFilters
  /** What the search box shows now. It runs ahead of the address while the person types. */
  searchText: string
  typeSearch: (text: string) => void
  setFilter: (name: FilterName, value: string) => void
  setPage: (page: number) => void
  clear: () => void
  anyFilter: boolean
}

/**
 * The search, the three filters and the page live in the address (decision B14):
 * /students?village=Jakhal&page=2. The search waits 300 ms after the last key.
 */
export function useStudentFilters(): StudentFilterControls {
  const [params, setParams] = useSearchParams()
  const [draft, setDraft] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const page = Number(params.get('page'))
  const filters: StudentFilters = {
    q: params.get('q') ?? '',
    className: params.get('className') ?? '',
    bus: params.get('bus') ?? '',
    village: params.get('village') ?? '',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }

  // The timer fires later, so it must read the filters of that moment, not of the keystroke.
  const latest = useRef(filters)
  useEffect(() => {
    latest.current = filters
  })

  /** Writes the filters to the address. Empty ones are left out. */
  function write(next: StudentFilters, replace: boolean) {
    const out = new URLSearchParams()
    if (next.q) out.set('q', next.q)
    if (next.className) out.set('className', next.className)
    if (next.bus) out.set('bus', next.bus)
    if (next.village) out.set('village', next.village)
    if (next.page > 1) out.set('page', String(next.page))
    setParams(out, { replace })
  }

  return {
    filters,
    searchText: draft ?? filters.q,
    typeSearch(text) {
      setDraft(text)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        // A new search starts on page 1. Typing does not fill the Back button with every word.
        write({ ...latest.current, q: text.trim(), page: 1 }, true)
        setDraft(null)
      }, SEARCH_WAIT_MS)
    },
    setFilter(name, value) {
      write({ ...filters, [name]: value, page: 1 }, false)
    },
    setPage(next) {
      write({ ...filters, page: next }, false)
    },
    clear() {
      clearTimeout(timer.current)
      setDraft(null)
      setParams(new URLSearchParams(), { replace: false })
    },
    anyFilter: Boolean(filters.q || filters.className || filters.bus || filters.village),
  }
}
