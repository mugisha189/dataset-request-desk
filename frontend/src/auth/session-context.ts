import { createContext, useContext } from 'react'
import type { AuthUser, Role } from '../api/types'

export interface SessionValue {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthUser>
  signOut: () => Promise<void>
  hasRole: (...roles: Role[]) => boolean
}

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used within a SessionProvider')
  return value
}
