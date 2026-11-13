// The signed-in session (AD-9). The session itself is the Sanctum cookie; nothing is kept in localStorage.

import { createContext, useContext } from 'react'
import type { User } from '../api/types/accounts'
import type { MentorCheck } from '../api/types/mentors'

export type SessionValue = {
  /** True until the first `/api/v1/me` answer arrives. */
  loading: boolean
  user: User | null
  /**
   * The signed-in Employee's Mentor check (AD-15), read on load, sign-in and sign-up. Null for Admin,
   * when signed out, or when it couldn't be read.
   */
  mentorCheck: MentorCheck | null
  signIn: (email: string, password: string) => Promise<void>
  /** Creates an Employee account and signs it in. */
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /** Keeps the status the API answered a submission with. */
  setMentorCheck: (status: MentorCheck) => void
  /** Reads the Mentor check status again, e.g. after a 409. */
  refreshMentorCheck: () => Promise<void>
}

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) {
    throw new Error('useSession must be used inside <SessionProvider>')
  }
  return value
}

/** Sign-up step 2. While the Mentor check is pending, every Employee page goes here. */
export const mentorCheckPath = '/mentor-check'

/** Whether the signed-in Employee still has to submit or skip the Mentor check. */
export function mentorCheckPending(mentorCheck: MentorCheck | null): boolean {
  return mentorCheck?.pending === true
}

/** Where a user lands when no specific page was asked for. */
export function homePath(user: User | null): string {
  if (!user) {
    return '/sign-in'
  }
  return user.is_admin ? '/admin/courses' : '/home'
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
