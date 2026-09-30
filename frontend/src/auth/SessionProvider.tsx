import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api/client'
import type { AuthUser, Role } from '../api/types'
import { SessionContext, type SessionValue } from './session-context'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // The session is an httpOnly cookie, so the app cannot read it directly -- it asks the API
  // who it's talking to instead. A 401 here just means "not signed in", not an error.
  useEffect(() => {
    const controller = new AbortController()
    authApi
      .me(controller.signal)
      .then(setUser)
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setUser(null)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const signedIn = await authApi.login(email, password)
    setUser(signedIn)
    return signedIn
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // The cookie may already be gone. Either way, local state clears.
    }
    setUser(null)
  }, [])

  const hasRole = useCallback((...roles: Role[]) => (user ? roles.includes(user.role) : false), [user])

  const value = useMemo<SessionValue>(
    () => ({ user, loading, signIn, signOut, hasRole }),
    [user, loading, signIn, signOut, hasRole],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
