import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type {
  Enquiry,
  EnquiryFilters,
  EnquiryPage,
  EnquiryPrefill,
  EnquiryRequest,
  EnquirySummary,
  FollowUpRequest,
  StatusRequest,
} from './types'

/** The filters become the query part of the address: ?status=VISITED&overdue=true&page=2 */
export function enquiriesQuery(filters: EnquiryFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.overdue) params.set('overdue', 'true')
  if (filters.q) params.set('q', filters.q)
  if (filters.village) params.set('village', filters.village)
  if (filters.source) params.set('source', filters.source)
  if (filters.page > 1) params.set('page', String(filters.page))
  const text = params.toString()
  return text ? `?${text}` : ''
}

/** One page of enquiries, newest first. The old page stays on the screen while the new one loads. */
export function useEnquiries(filters: EnquiryFilters) {
  return useQuery({
    queryKey: ['enquiries', 'list', filters],
    queryFn: () => api<EnquiryPage>('GET', `/enquiries${enquiriesQuery(filters)}`),
    placeholderData: keepPreviousData,
  })
}

/** The seven tile numbers and the overdue count. They do not depend on the filters. */
export function useEnquirySummary() {
  return useQuery({
    queryKey: ['enquiries', 'summary'],
    queryFn: () => api<EnquirySummary>('GET', '/enquiries/summary'),
  })
}

export function useEnquiry(id: number) {
  return useQuery({
    queryKey: ['enquiries', 'detail', id],
    queryFn: () => api<Enquiry>('GET', `/enquiries/${id}`),
  })
}

/** What New admission copies from an enquiry. `id` null means there is no enquiry: no call is made. */
export function useEnquiryPrefill(id: number | null) {
  return useQuery({
    queryKey: ['enquiries', 'prefill', id],
    queryFn: () => api<EnquiryPrefill>('GET', `/enquiries/${id}/prefill`),
    enabled: id !== null,
    // The clerk may have edited the form; a refetch must not bring the old values back.
    staleTime: Infinity,
    retry: false,
  })
}

/** After any change the list and the tile numbers are old. One enquiry's page is set from the answer. */
function useAfterChange() {
  const queryClient = useQueryClient()
  return (saved: Enquiry) => {
    queryClient.setQueryData(['enquiries', 'detail', saved.id], saved)
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['enquiries', 'list'] }),
      queryClient.invalidateQueries({ queryKey: ['enquiries', 'summary'] }),
    ])
  }
}

export function useCreateEnquiry() {
  const afterChange = useAfterChange()
  return useMutation({
    mutationFn: (body: EnquiryRequest) => api<Enquiry>('POST', '/enquiries', body),
    onSuccess: afterChange,
  })
}

export function useUpdateEnquiry(id: number) {
  const afterChange = useAfterChange()
  return useMutation({
    mutationFn: (body: EnquiryRequest) => api<Enquiry>('PUT', `/enquiries/${id}`, body),
    onSuccess: afterChange,
  })
}

/** A call or visit note, with an optional new date. */
export function useAddFollowUp(id: number) {
  const afterChange = useAfterChange()
  return useMutation({
    mutationFn: (body: FollowUpRequest) =>
      api<Enquiry>('POST', `/enquiries/${id}/follow-ups`, body),
    onSuccess: afterChange,
  })
}

export function useChangeStatus(id: number) {
  const afterChange = useAfterChange()
  return useMutation({
    mutationFn: (body: StatusRequest) => api<Enquiry>('POST', `/enquiries/${id}/status`, body),
    onSuccess: afterChange,
  })
}
