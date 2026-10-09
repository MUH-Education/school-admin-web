import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { messageStatuses, type MessageFilters, type MessageStatus } from '../types'

const SEARCH_WAIT_MS = 300
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export interface MessageFilterControls {
  filters: MessageFilters
  /** What the search box shows now. It runs ahead of the address while the person types. */
  searchText: string
  typeSearch: (text: string) => void
  setDate: (date: string) => void
  setStatus: (status: string) => void
  setPage: (page: number) => void
  clear: () => void
  /** True when the status or the name is set. The day alone is not a filter to clear. */
  anyFilter: boolean
}

/**
 * The day, the status, the name search and the page live in the address:
 * /messages?date=2026-10-07&status=FAILED&q=mohit. No date means today.
 */
export function useMessageFilters(): MessageFilterControls {
  const [params, setParams] = useSearchParams()
  const [draft, setDraft] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const page = Number(params.get('page'))
  const date = params.get('date') ?? ''
  const status = params.get('status') ?? ''
  const filters: MessageFilters = {
    date: ISO_DATE.test(date) ? date : '',
    status: messageStatuses.includes(status as MessageStatus) ? (status as MessageStatus) : '',
    q: params.get('q') ?? '',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }

  // The timer fires later, so it must read the filters of that moment, not of the keystroke.
  const latest = useRef(filters)
  useEffect(() => {
    latest.current = filters
  })

  function write(next: MessageFilters, replace: boolean) {
    const out = new URLSearchParams()
    if (next.date) out.set('date', next.date)
    if (next.status) out.set('status', next.status)
    if (next.q) out.set('q', next.q)
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
    setDate(next) {
      write({ ...filters, date: ISO_DATE.test(next) ? next : '', page: 1 }, false)
    },
    setStatus(next) {
      const status = messageStatuses.includes(next as MessageStatus) ? (next as MessageStatus) : ''
      write({ ...filters, status, page: 1 }, false)
    },
    setPage(next) {
      write({ ...filters, page: next }, false)
    },
    clear() {
      clearTimeout(timer.current)
      setDraft(null)
      write({ ...filters, status: '', q: '', page: 1 }, false)
    },
    anyFilter: Boolean(filters.status || filters.q),
  }
}
