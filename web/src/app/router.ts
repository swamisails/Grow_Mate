// A small History-API router. Features declare their routes in their own folder (features/<module>/routes.ts).

import { createContext, useContext, type ComponentType } from 'react'

/** Who may open a route: `guest` (signed out), `admin` or `employee` (signed in, with that role). */
export type Access = 'guest' | 'admin' | 'employee'

export type RouteDef = {
  /** An exact path (`/admin/courses`) or a pattern with `:name` segments (`/admin/courses/:id`). */
  path: string
  access: Access
  layout: 'bare' | 'admin' | 'employee'
  Component: ComponentType
}

/** The `:name` segments of the open route, decoded. */
export type RouteParams = Record<string, string>

export type RouterValue = {
  path: string
  /** Filled for the page of a `:param` route; empty elsewhere. */
  params: RouteParams
  navigate: (to: string, options?: { replace?: boolean }) => void
}

export const RouterContext = createContext<RouterValue | null>(null)

export function useRouter(): RouterValue {
  const value = useContext(RouterContext)
  if (!value) {
    throw new Error('useRouter must be used inside <RouterProvider>')
  }
  return value
}

/** The params when `path` fits `pattern` segment for segment, else null. */
export function matchPath(pattern: string, path: string): RouteParams | null {
  const patternSegments = pattern.split('/')
  const pathSegments = path.split('/')
  if (patternSegments.length !== pathSegments.length) {
    return null
  }
  const params: RouteParams = {}
  for (const [index, segment] of patternSegments.entries()) {
    const actual = pathSegments[index]
    if (segment.startsWith(':')) {
      if (actual === '') {
        return null
      }
      try {
        params[segment.slice(1)] = decodeURIComponent(actual)
      } catch {
        return null
      }
    } else if (segment !== actual) {
      return null
    }
  }
  return params
}

/**
 * The route for `path`. An exact path always wins over a pattern (so `/admin/courses/new` is never
 * read as `/admin/courses/:id`); otherwise the first pattern that fits, in list order.
 */
export function matchRoute(routes: RouteDef[], path: string): { route: RouteDef; params: RouteParams } | null {
  const exact = routes.find((candidate) => candidate.path === path)
  if (exact) {
    return { route: exact, params: {} }
  }
  for (const candidate of routes) {
    if (candidate.path.includes('/:')) {
      const params = matchPath(candidate.path, path)
      if (params) {
        return { route: candidate, params }
      }
    }
  }
  return null
}
