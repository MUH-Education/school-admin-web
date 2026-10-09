import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { ErrorState } from '@/ui/ErrorState'
import { LoadingBlock } from '@/ui/LoadingBlock'
import { useAuth } from '@/auth/useAuth'
import { usePermissions } from '@/auth/usePermissions'
import type { Permission } from '@/auth/types'

/** Wraps everything except /login. No user → /login, and the address is remembered. */
export function RequireLogin({ children }: { children: ReactNode }) {
  const { user, isLoading, loadError, retryLoad, signedOut } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="p-10">
        <LoadingBlock />
      </div>
    )
  }
  if (loadError) {
    return (
      <div className="p-10">
        <ErrorState error={loadError} onRetry={retryLoad} />
      </div>
    )
  }
  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={signedOut ? null : { from }} />
  }
  return children
}

export function CannotOpenPage() {
  return (
    <main className="flex flex-col items-start gap-3">
      <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.02em]">
        You cannot open this page
      </h1>
      <p className="text-ink-soft">
        Your login does not include this page. Ask the owner if you need it.
      </p>
      <Link to="/" className="text-canal underline">
        Go to my first page
      </Link>
    </main>
  )
}

/** Without the permission: the plain "You cannot open this page" page. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission
  children: ReactNode
}) {
  const { can } = usePermissions()
  return can(permission) ? children : <CannotOpenPage />
}
