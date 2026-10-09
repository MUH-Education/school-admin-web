import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiBlob, apiUpload } from '@/api/client'
import type {
  Guardian,
  GuardianCreateBody,
  GuardianUpdateBody,
  HistoryEntry,
  ImportResult,
  Student,
  StudentFilters,
  StudentPage,
  StudentUpdateBody,
  TransportBody,
  TransportEnrolment,
  TransportSaved,
} from './types'

/** The filters become the query part of the address: ?q=ishaan&bus=YES&page=2 */
export function studentsQuery(filters: StudentFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.className) params.set('className', filters.className)
  if (filters.village) params.set('village', filters.village)
  // 'YES' and 'NO' are words for the server; a number is a route.
  if (/^\d+$/.test(filters.bus)) params.set('routeId', filters.bus)
  else if (filters.bus) params.set('bus', filters.bus)
  if (filters.page > 1) params.set('page', String(filters.page))
  const text = params.toString()
  return text ? `?${text}` : ''
}

/** One page of the list. The old page stays on the screen while the new one loads. */
export function useStudents(filters: StudentFilters) {
  return useQuery({
    queryKey: ['students', 'list', filters],
    queryFn: () => api<StudentPage>('GET', `/students${studentsQuery(filters)}`),
    placeholderData: keepPreviousData,
  })
}

/** A short list for the brother-or-sister search. Not asked until there are 2 letters. */
export function useStudentSearch(q: string) {
  const text = q.trim()
  return useQuery({
    queryKey: ['students', 'search', text],
    queryFn: () => api<StudentPage>('GET', `/students?q=${encodeURIComponent(text)}`),
    enabled: text.length >= 2,
  })
}

export function useStudent(id: number) {
  return useQuery({
    queryKey: ['students', id],
    queryFn: () => api<Student>('GET', `/students/${id}`),
  })
}

export function useStudentHistory(id: number) {
  return useQuery({
    queryKey: ['students', id, 'history'],
    queryFn: () => api<HistoryEntry[]>('GET', `/students/${id}/history`),
  })
}

export function useTransportHistory(id: number) {
  return useQuery({
    queryKey: ['students', id, 'transport'],
    queryFn: () => api<TransportEnrolment[]>('GET', `/students/${id}/transport`),
  })
}

/**
 * The photo as an address for `<img src>`. An image tag cannot send the token, so the bytes are
 * fetched here and turned into a `blob:` address. It lives outside the ['students'] key, so an
 * edit of the name does not download the picture again.
 */
export function useStudentPhoto(id: number, hasPhoto: boolean) {
  return useQuery({
    queryKey: ['student-photo', id],
    queryFn: async () => URL.createObjectURL(await apiBlob(`/students/${id}/photo`)),
    enabled: hasPhoto,
    staleTime: Infinity,
  })
}

/** Gives the old `blob:` address back and forgets it, so the next look fetches the new picture. */
function useForgetPhoto(id: number) {
  const queryClient = useQueryClient()
  return () => {
    const old = queryClient.getQueryData<string>(['student-photo', id])
    if (old) URL.revokeObjectURL(old)
    queryClient.removeQueries({ queryKey: ['student-photo', id] })
  }
}

/**
 * A student change moves the lists, the page, the history and the photo.
 * A bus change also moves the child counts on Routes and load.
 */
function useRefreshStudents() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['students'] }),
      queryClient.invalidateQueries({ queryKey: ['routes'] }),
    ])
}

export function useUpdateStudent(id: number) {
  const refresh = useRefreshStudents()
  return useMutation({
    mutationFn: (body: StudentUpdateBody) => api<Student>('PUT', `/students/${id}`, body),
    onSuccess: refresh,
  })
}

export function useAddGuardian(studentId: number) {
  const refresh = useRefreshStudents()
  return useMutation({
    mutationFn: (body: GuardianCreateBody) =>
      api<Guardian>('POST', `/students/${studentId}/guardians`, body),
    onSuccess: refresh,
  })
}

export function useUpdateGuardian(studentId: number) {
  const refresh = useRefreshStudents()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: GuardianUpdateBody }) =>
      api<Guardian>('PUT', `/students/${studentId}/guardians/${id}`, body),
    onSuccess: refresh,
  })
}

export function useRemoveGuardian(studentId: number) {
  const refresh = useRefreshStudents()
  return useMutation({
    mutationFn: (id: number) => api<void>('DELETE', `/students/${studentId}/guardians/${id}`),
    onSuccess: refresh,
  })
}

export function useChangeTransport(studentId: number) {
  const refresh = useRefreshStudents()
  return useMutation({
    mutationFn: (body: TransportBody) =>
      api<TransportSaved>('PUT', `/students/${studentId}/transport`, body),
    onSuccess: refresh,
  })
}

export function useUploadPhoto(studentId: number) {
  const refresh = useRefreshStudents()
  const forget = useForgetPhoto(studentId)
  return useMutation({
    mutationFn: (file: File) => apiUpload<void>(`/students/${studentId}/photo`, file),
    onSuccess: () => {
      forget()
      return refresh()
    },
  })
}

export function useRemovePhoto(studentId: number) {
  const refresh = useRefreshStudents()
  const forget = useForgetPhoto(studentId)
  return useMutation({
    mutationFn: () => api<void>('DELETE', `/students/${studentId}/photo`),
    onSuccess: () => {
      forget()
      return refresh()
    },
  })
}

/** `dryRun: true` only checks the file. */
export function useImportStudents() {
  const refresh = useRefreshStudents()
  return useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun: boolean }) =>
      apiUpload<ImportResult>(`/students/import${dryRun ? '?dryRun=true' : ''}`, file),
    onSuccess: (_result, { dryRun }) => (dryRun ? undefined : refresh()),
  })
}
