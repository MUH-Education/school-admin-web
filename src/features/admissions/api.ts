import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { AdmissionRequest, AdmissionResult } from './types'

/** One call saves the student, the parents and the bus. The lists and the route counts change. */
export function useAdmit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AdmissionRequest) => api<AdmissionResult>('POST', '/admissions', body),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['students'] }),
        queryClient.invalidateQueries({ queryKey: ['routes'] }),
      ]),
  })
}
