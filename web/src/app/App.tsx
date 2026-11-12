import type { ComponentType, ReactNode } from 'react'
import { AdminLayout, BareLayout, EmployeeLayout } from './layout'
import { Loading, NotFound } from './PageStates'
import { Navigate, RouterProvider } from './Router'
import { matchRoute, RouterContext, useRouter, type RouteDef } from './router'
import { routes } from './routes'
import { homePath, returnPath, signInPath, useSession } from './session'
import { SessionProvider } from './SessionProvider'

const layouts: Record<RouteDef['layout'], ComponentType<{ children: ReactNode }>> = {
  bare: BareLayout,
  admin: AdminLayout,
  employee: EmployeeLayout,
}

function CurrentPage() {
  const router = useRouter()
  const { path } = router
  const { loading, user } = useSession()

  if (loading) {
    return (
      <BareLayout>
        <Loading />
      </BareLayout>
    )
  }

  // Signed-in pages use the layout of the user's role; anyone else gets the bare bar.
  const UserLayout = !user ? BareLayout : user.is_admin ? AdminLayout : EmployeeLayout

  if (path === '/') {
    return <Navigate to={homePath(user)} />
  }

  const match = matchRoute(routes, path)

  // Unknown for everyone, and forbidden (signed in with the other role), look the same.
  const forbidden =
    user !== null &&
    match !== null &&
    ((match.route.access === 'admin' && !user.is_admin) || (match.route.access === 'employee' && user.is_admin))
  if (!match || forbidden) {
    return (
      <UserLayout>
        <NotFound />
      </UserLayout>
    )
  }
  const { route, params } = match

  // Signed out (or the session expired, 401): Sign in, then back to this page.
  if (route.access !== 'guest' && !user) {
    return <Navigate to={signInPath(path + window.location.search)} />
  }
  // Signed in as either role on Sign in or Sign up: the return path, else home.
  if (route.access === 'guest' && user) {
    // A return path to this same page (e.g. `?return=/sign-in`) would redirect to itself; go home instead.
    const back = returnPath()
    const leavesPage = back !== null && new URL(back, window.location.origin).pathname !== path
    return <Navigate to={leavesPage ? back : homePath(user)} />
  }

  const Layout = layouts[route.layout]
  return (
    <Layout>
      <RouterContext.Provider value={{ ...router, params }}>
        {/* A new key per path, so moving between two pages of one route starts the page afresh. */}
        <route.Component key={path} />
      </RouterContext.Provider>
    </Layout>
  )
}

export function App() {
  return (
    <SessionProvider>
      <RouterProvider>
        <CurrentPage />
      </RouterProvider>
    </SessionProvider>
  )
}
