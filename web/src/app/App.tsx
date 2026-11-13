import type { ComponentType, ReactNode } from 'react'
import { AdminLayout, BareLayout, EmployeeLayout, EmployeeStepLayout } from './layout'
import { Loading, NotFound } from './PageStates'
import { Navigate, RouterProvider } from './Router'
import { matchRoute, RouterContext, useRouter, type RouteDef } from './router'
import { routes } from './routes'
import { homePath, mentorCheckPath, mentorCheckPending, returnPath, signInPath, useSession } from './session'
import { SessionProvider } from './SessionProvider'

const layouts: Record<RouteDef['layout'], ComponentType<{ children: ReactNode }>> = {
  bare: BareLayout,
  admin: AdminLayout,
  employee: EmployeeLayout,
  'employee-step': EmployeeStepLayout,
}

function CurrentPage() {
  const router = useRouter()
  const { path } = router
  const { loading, user, mentorCheck } = useSession()

  if (loading) {
    return (
      <BareLayout>
        <Loading />
      </BareLayout>
    )
  }

  // While the Mentor check is pending, an Employee's every page is sign-up step 2 (AD-15).
  const pending = user !== null && !user.is_admin && mentorCheckPending(mentorCheck)

  // Signed-in pages use the layout of the user's role (no links while the step is pending); anyone else gets the bare bar.
  const UserLayout = !user ? BareLayout : user.is_admin ? AdminLayout : pending ? EmployeeStepLayout : EmployeeLayout

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
  // Signed in as either role on Sign in or Sign up: the pending Mentor check, else the return path, else home.
  if (route.access === 'guest' && user) {
    if (pending) {
      return <Navigate to={mentorCheckPath} />
    }
    // A return path to this same page (e.g. `?return=/sign-in`) would redirect to itself; go home instead.
    const back = returnPath()
    const leavesPage = back !== null && new URL(back, window.location.origin).pathname !== path
    return <Navigate to={leavesPage ? back : homePath(user)} />
  }

  // Pending: every Employee page goes to the step. Done: the step goes Home, never to be shown again.
  if (route.access === 'employee' && pending !== (path === mentorCheckPath)) {
    return <Navigate to={pending ? mentorCheckPath : homePath(user)} />
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
