import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type {
  ClassFee,
  CorrectionBody,
  FeePayment,
  FeePlanBody,
  PaymentBody,
  Session,
  StudentFees,
} from './types'

/** The school years. Any logged-in person may ask. */
export function useSessions() {
  return useQuery({
    queryKey: ['fees', 'sessions'],
    queryFn: () => api<Session[]>('GET', '/sessions'),
  })
}

/** The school fee of the 15 classes in one session. `sessionId` null: no call is made. */
export function useClassFees(sessionId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['fees', 'class-fees', sessionId],
    queryFn: () => api<ClassFee[]>('GET', `/sessions/${sessionId}/class-fees`),
    enabled: enabled && sessionId !== null,
  })
}

/** Saves the whole list. New admissions then start from these amounts. */
export function useSaveClassFees(sessionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fees: ClassFee[]) =>
      api<ClassFee[]>('PUT', `/sessions/${sessionId}/class-fees`, fees),
    onSuccess: (saved) => queryClient.setQueryData(['fees', 'class-fees', sessionId], saved),
  })
}

/** "Fees this year" of one child. `enabled` is false for a person without FEES_VIEW: no call is made. */
export function useStudentFees(studentId: number, enabled = true) {
  return useQuery({
    queryKey: ['fees', 'student', studentId],
    queryFn: () => api<StudentFees>('GET', `/students/${studentId}/fees`),
    enabled,
  })
}

/** A fee change moves the box of the child and the "Fee" column of the list. */
export function useRefreshFees() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fees', 'student'] }),
      queryClient.invalidateQueries({ queryKey: ['students', 'list'] }),
    ])
}

export function useSaveFeePlan(studentId: number) {
  const refresh = useRefreshFees()
  return useMutation({
    mutationFn: (body: FeePlanBody) =>
      api<StudentFees>('PUT', `/students/${studentId}/fee-plan`, body),
    onSuccess: refresh,
  })
}

/** The answer is the new payment, with its receipt number. */
export function useRecordPayment(studentId: number) {
  const refresh = useRefreshFees()
  return useMutation({
    mutationFn: (body: PaymentBody) =>
      api<FeePayment>('POST', `/students/${studentId}/payments`, body),
    onSuccess: refresh,
  })
}

/** Owner only. The wrong payment stays in the list; a line with negative amounts takes it back. */
export function useCorrectPayment(studentId: number) {
  const refresh = useRefreshFees()
  return useMutation({
    mutationFn: (body: CorrectionBody) =>
      api<FeePayment>('POST', `/students/${studentId}/payment-corrections`, body),
    onSuccess: refresh,
  })
}
