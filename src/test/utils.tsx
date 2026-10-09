import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Providers } from '@/app/providers'
import { routes } from '@/app/router'
import { setToken } from '@/api/client'

export const sampleUserIds = {
  owner: 1,
  officeAdmin: 2,
  transport: 3,
  admissions: 4,
  attendant: 5,
  turnedOff: 8,
} as const

/** Pretend the person already logged in before (a saved token). */
export function saveLogin(userId: number): void {
  setToken(`mock-token-${userId}`)
}

/** Renders the whole app at a path, with a fresh query cache. */
export function renderApp(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const view = render(
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { ...view, router }
}
