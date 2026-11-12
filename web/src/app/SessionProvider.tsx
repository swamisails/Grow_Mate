import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as accounts from '../api/accounts'
import { onUnauthorized } from '../api/client'
import type { User } from '../api/types/accounts'
import { SessionContext } from './session'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  // Any 401 after boot means the session is gone: clear the user, and the router sends them to Sign in.
  useEffect(() => onUnauthorized(() => setUser(null)), [])

  useEffect(() => {
    let cancelled = false
    accounts
      .getMe()
      .catch(() => null)
      .then((me) => {
        if (!cancelled) {
          setUser(me)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await accounts.signIn({ email, password }))
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setUser(await accounts.signUp({ name, email, password }))
  }, [])

  const signOut = useCallback(async () => {
    try {
      await accounts.signOut()
    } finally {
      // Clear the local user even when the API refuses (expired session, CSRF), so no stale screen remains.
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ loading, user, signIn, signUp, signOut }),
    [loading, user, signIn, signUp, signOut],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
