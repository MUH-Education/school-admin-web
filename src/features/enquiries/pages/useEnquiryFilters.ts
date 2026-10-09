import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  enquirySources,
  enquiryStatuses,
  type EnquiryFilters,
  type EnquirySource,
  type EnquiryStatus,
} from '../types'

const SEARCH_WAIT_MS = 300

export interface EnquiryFilterControls {
  filters: EnquiryFilters
  /** What the search box shows now. It runs ahead of the address while the person types. */
  searchText: string
  typeSearch: (text: string) => void
  setStatus: (status: string) => void
  setOverdue: (overdue: boolean) => void
  setVillage: (village: string) => void
  setSource: (source: string) => void
  setPage: (page: number) => void
  clear: () => void
  anyFilter: boolean
}

/**
 * The stage, the overdue switch, the search, the village, the source and the page live in the
 * address: /enquiries?status=VISITED&overdue=true&page=2. The search waits 300 ms after the last key.
 */
export function useEnquiryFilters(): EnquiryFilterControls {
  const [params, setParams] = useSearchParams()
  const [draft, setDraft] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const page = Number(params.get('page'))
  const status = params.get('status') ?? ''
  const source = params.get('source') ?? ''
  const filters: EnquiryFilters = {
    status: enquiryStatuses.includes(status as EnquiryStatus) ? (status as EnquiryStatus) : '',
    overdue: params.get('overdue') === 'true',
    q: params.get('q') ?? '',
    village: params.get('village') ?? '',
    source: enquirySources.includes(source as EnquirySource) ? (source as EnquirySource) : '',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }

  // The timer fires later, so it must read the filters of that moment, not of the keystroke.
  const latest = useRef(filters)
  useEffect(() => {
    latest.current = filters
  })

  /** Writes the filters to the address. Empty ones are left out. */
  function write(next: EnquiryFilters, replace: boolean) {
    const out = new URLSearchParams()
    if (next.status) out.set('status', next.status)
    if (next.overdue) out.set('overdue', 'true')
    if (next.q) out.set('q', next.q)
    if (next.village) out.set('village', next.village)
    if (next.source) out.set('source', next.source)
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
    setStatus(next) {
      const value = enquiryStatuses.includes(next as EnquiryStatus) ? (next as EnquiryStatus) : ''
      write({ ...filters, status: value, page: 1 }, false)
    },
    setOverdue(overdue) {
      write({ ...filters, overdue, page: 1 }, false)
    },
    setVillage(village) {
      write({ ...filters, village, page: 1 }, false)
    },
    setSource(next) {
      const value = enquirySources.includes(next as EnquirySource) ? (next as EnquirySource) : ''
      write({ ...filters, source: value, page: 1 }, false)
    },
    setPage(next) {
      write({ ...filters, page: next }, false)
    },
    clear() {
      clearTimeout(timer.current)
      setDraft(null)
      setParams(new URLSearchParams(), { replace: false })
    },
    anyFilter: Boolean(
      filters.status || filters.overdue || filters.q || filters.village || filters.source,
    ),
  }
}
