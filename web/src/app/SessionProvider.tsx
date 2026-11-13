import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as accounts from '../api/accounts'
import { ApiError, onUnauthorized } from '../api/client'
import * as mentors from '../api/mentors'
import type { User } from '../api/types/accounts'
import type { MentorCheck } from '../api/types/mentors'
import { SessionContext } from './session'

/**
 * The Mentor check status for a signed-in Employee; null for Admin and when signed out. A failed read
 * (other than 401) is also null, so the app isn't locked behind the step: the API still accepts
 * only one check (AD-15), and the next load asks again.
 */
async function mentorCheckFor(user: User | null): Promise<MentorCheck | null> {
  if (!user || user.is_admin) {
    return null
  }
  try {
    return await mentors.getMentorCheck()
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error
    }
    return null
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [mentorCheck, setMentorCheck] = useState<MentorCheck | null>(null)

  // Any 401 after boot means the session is gone: clear the user, and the router sends them to Sign in.
  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null)
        setMentorCheck(null)
      }),
    [],
  )

  useEffect(() => {
    let cancelled = false
    accounts
      .getMe()
      .then(async (me) => ({ me, check: await mentorCheckFor(me) }))
      .catch(() => ({ me: null, check: null }))
      .then(({ me, check }) => {
        if (!cancelled) {
          setUser(me)
          setMentorCheck(check)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // The user and their Mentor check status are set together, so the router never shows a page the
  // pending step would have replaced.
  const signIn = useCallback(async (email: string, password: string) => {
    const signedIn = await accounts.signIn({ email, password })
    const check = await mentorCheckFor(signedIn)
    setUser(signedIn)
    setMentorCheck(check)
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const signedUp = await accounts.signUp({ name, email, password })
    const check = await mentorCheckFor(signedUp)
    setUser(signedUp)
    setMentorCheck(check)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await accounts.signOut()
    } finally {
      // Clear the local user even when the API refuses (expired session, CSRF), so no stale screen remains.
      setUser(null)
      setMentorCheck(null)
    }
  }, [])

  const refreshMentorCheck = useCallback(async () => {
    try {
      setMentorCheck(await mentors.getMentorCheck())
    } catch {
      // A 401 already cleared the session; any other failure keeps the status as it was.
    }
  }, [])

  const value = useMemo(
    () => ({ loading, user, mentorCheck, signIn, signUp, signOut, setMentorCheck, refreshMentorCheck }),
    [loading, user, mentorCheck, signIn, signUp, signOut, refreshMentorCheck],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
