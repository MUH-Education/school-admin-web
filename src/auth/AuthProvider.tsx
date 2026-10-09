import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from '@/api/client'
import { ApiError } from '@/api/errors'
import { AuthContext, type AuthState } from './AuthContext'
import { clearSavedUser, getSavedUser, saveUser } from './savedUser'
import type { AuthUser, LoginResponse } from './types'

const ME_KEY = ['auth', 'me']

/**
 * GET /auth/me. With no network, the last answer is used (the token is still checked by the server
 * on the first call that has network). Any other failure, for example 401, is a real failure.
 */
async function loadMe(): Promise<AuthUser> {
  try {
    const user = await api<AuthUser>('GET', '/auth/me')
    void saveUser(user)
    return user
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NETWORK') {
      const saved = await getSavedUser()
      if (saved) return saved
    }
    throw error
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [signedOut, setSignedOut] = useState(false)
  const [token, setTokenState] = useState<string | null>(() => getToken())

  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: loadMe,
    enabled: token !== null,
    retry: false,
    staleTime: Infinity,
    // The phone app must open with no network, so the question is asked also when offline.
    networkMode: 'always',
  })

  const clearSession = useCallback(() => {
    void clearSavedUser()
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
      void saveUser(response.user)
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
