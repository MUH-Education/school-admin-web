import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { MessageFilters, MessagePage, MessageSummary } from './types'

/** The filters become the query part of the address: ?date=2026-10-07&status=FAILED&q=mohit */
export function messagesQuery(filters: MessageFilters): string {
  const params = new URLSearchParams()
  if (filters.date) params.set('date', filters.date)
  if (filters.status) params.set('status', filters.status)
  if (filters.q) params.set('q', filters.q)
  if (filters.page > 1) params.set('page', String(filters.page))
  const text = params.toString()
  return text ? `?${text}` : ''
}

/** One page of the day's SMS. The old page stays on the screen while the new one loads. */
export function useMessages(filters: MessageFilters) {
  return useQuery({
    queryKey: ['messages', 'list', filters],
    queryFn: () => api<MessagePage>('GET', `/messages${messagesQuery(filters)}`),
    placeholderData: keepPreviousData,
  })
}

/** The three numbers of one day. Without a date the server uses today. */
export function useMessageSummary(date: string) {
  return useQuery({
    queryKey: ['messages', 'summary', date],
    queryFn: () =>
      api<MessageSummary>(
        'GET',
        `/messages/summary${date ? `?date=${encodeURIComponent(date)}` : ''}`,
      ),
    placeholderData: keepPreviousData,
  })
}
