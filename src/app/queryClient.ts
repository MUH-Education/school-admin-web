import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/errors'

/** Defaults from docs/02-architecture.md: fresh for 30 s, one retry, never for 4xx. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
          return failureCount < 1
        },
      },
    },
  })
}
