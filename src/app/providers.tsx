import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { AuthProvider } from '@/auth/AuthProvider'
import { ToastProvider } from '@/ui/ToastProvider'
import { makeQueryClient } from './queryClient'

export function Providers({
  children,
  queryClient,
}: {
  children: ReactNode
  queryClient?: QueryClient
}) {
  const [client] = useState(() => queryClient ?? makeQueryClient())
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
