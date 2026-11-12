// A small History-API router. Features declare their routes in their own folder (features/<module>/routes.ts).

import { createContext, useContext, type ComponentType } from 'react'

/** Who may open a route: `guest` (signed out) or `admin`. */
export type Access = 'guest' | 'admin'

export type RouteDef = {
  path: string
  access: Access
  layout: 'bare' | 'admin'
  Component: ComponentType
}

export type RouterValue = {
  path: string
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
