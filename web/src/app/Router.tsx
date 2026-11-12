import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { RouterContext, useRouter } from './router'

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState(null, '', to)
    } else {
      window.history.pushState(null, '', to)
    }
    setPath(window.location.pathname)
  }, [])

  // Params belong to the matched route, so App fills them in around the page it renders.
  const value = useMemo(() => ({ path, params: {}, navigate }), [path, navigate])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

type LinkProps = {
  to: string
  className?: string
  children: ReactNode
}

function isPlainLeftClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

export function Link({ to, className, children }: LinkProps) {
  const { navigate } = useRouter()
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        if (isPlainLeftClick(event)) {
          event.preventDefault()
          navigate(to)
        }
      }}
    >
      {children}
    </a>
  )
}

/** A Link that marks itself `aria-current="page"` when its path is open. */
export function NavLink({ to, className, children }: LinkProps) {
  const { path, navigate } = useRouter()
  return (
    <a
      href={to}
      className={className}
      aria-current={path === to ? 'page' : undefined}
      onClick={(event) => {
        if (isPlainLeftClick(event)) {
          event.preventDefault()
          navigate(to)
        }
      }}
    >
      {children}
    </a>
  )
}

/** Redirects on render (replacing the history entry). */
export function Navigate({ to }: { to: string }) {
  const { path, navigate } = useRouter()
  useEffect(() => {
    // Skip a redirect worked out for a page the browser has already left (e.g. Sign out navigating
    // to Sign in while the cleared session re-renders the old page).
    if (window.location.pathname === path) {
      navigate(to, { replace: true })
    }
  }, [navigate, path, to])
  return null
}
