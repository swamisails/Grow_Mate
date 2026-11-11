// The signed-in session (AD-9). The session itself is the Sanctum cookie; nothing is kept in localStorage.

import { createContext, useContext } from 'react'
import type { User } from '../api/types/accounts'

export type SessionValue = {
  /** True until the first `/api/v1/me` answer arrives. */
  loading: boolean
  user: User | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) {
    throw new Error('useSession must be used inside <SessionProvider>')
  }
  return value
}

/** Where a user lands when no specific page was asked for. */
export function homePath(user: User | null): string {
  return user?.is_admin ? '/admin/courses' : '/sign-in'
}
