import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from '@/api/client'
import { AuthContext, type AuthState } from './AuthContext'
import type { AuthUser, LoginResponse } from './types'

const ME_KEY = ['auth', 'me']

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [signedOut, setSignedOut] = useState(false)
  const [token, setTokenState] = useState<string | null>(() => getToken())

  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: () => api<AuthUser>('GET', '/auth/me'),
    enabled: token !== null,
    retry: false,
    staleTime: Infinity,
  })

  const clearSession = useCallback(() => {
    setToken(null)
    setTokenState(null)
    queryClient.clear()
  }, [queryClient])

  // A 401 on any call logs the user out. RequireLogin then sends them to /login
  // and remembers the address they were on.
  useEffect(() => {
    setUnauthorizedHandler(clearSession)
  }, [clearSession])

  const login = useCallback(
    (response: LoginResponse) => {
      setSignedOut(false)
      setToken(response.token)
      setTokenState(response.token)
      queryClient.setQueryData(ME_KEY, response.user)
    },
    [queryClient],
  )

  const logout = useCallback(() => {
    // Send the call first: it reads the token before we clear it.
    void api('POST', '/auth/logout').catch(() => {})
    setSignedOut(true)
    clearSession()
  }, [clearSession])

  const value = useMemo<AuthState>(
    () => ({
      user: token !== null ? (me.data ?? null) : null,
      signedOut,
      isLoading: token !== null && me.isPending,
      loadError: token !== null && me.isError ? me.error : null,
      retryLoad: () => void me.refetch(),
      login,
      logout,
    }),
    [token, me, signedOut, login, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
