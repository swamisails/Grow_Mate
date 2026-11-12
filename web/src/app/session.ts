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

/**
 * The page to go back to after Sign in, from `?return=` (set when a 401 sent the user to Sign in).
 * Same-origin paths only: it must start with `/`, not `//` (or `/\`, which browsers read as `//`).
 * Anything else gives null, and the caller falls back to `homePath`.
 */
export function returnPath(search: string = window.location.search): string | null {
  const value = new URLSearchParams(search).get('return')
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null
  }
  try {
    if (new URL(value, window.location.origin).origin !== window.location.origin) {
      return null
    }
  } catch {
    return null
  }
  return value
}

/** Sign in, carrying the page to come back to after signing in. */
export function signInPath(returnTo: string): string {
  return `/sign-in?return=${encodeURIComponent(returnTo)}`
}
