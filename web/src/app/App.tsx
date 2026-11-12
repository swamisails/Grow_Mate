import { AdminLayout, BareLayout } from './layout'
import { Loading, NotFound } from './PageStates'
import { Navigate, RouterProvider } from './Router'
import { useRouter } from './router'
import { routes } from './routes'
import { homePath, returnPath, signInPath, useSession } from './session'
import { SessionProvider } from './SessionProvider'

function CurrentPage() {
  const { path } = useRouter()
  const { loading, user } = useSession()

  if (loading) {
    return (
      <BareLayout>
        <Loading />
      </BareLayout>
    )
  }

  // Signed-in pages use the layout of the user's role; anyone else gets the bare bar.
  const UserLayout = user?.is_admin ? AdminLayout : BareLayout

  if (path === '/') {
    return <Navigate to={homePath(user)} />
  }

  const route = routes.find((candidate) => candidate.path === path)

  // Unknown for everyone, and forbidden (signed in without the role), look the same.
  if (!route || (route.access === 'admin' && user && !user.is_admin)) {
    return (
      <UserLayout>
        <NotFound />
      </UserLayout>
    )
  }
  // Signed out (or the session expired, 401): Sign in, then back to this page.
  if (route.access === 'admin' && !user) {
    return <Navigate to={signInPath(path + window.location.search)} />
  }
  if (route.access === 'guest' && user?.is_admin) {
    // A return path to this same page (e.g. `?return=/sign-in`) would redirect to itself; go home instead.
    const back = returnPath()
    const leavesPage = back !== null && new URL(back, window.location.origin).pathname !== path
    return <Navigate to={leavesPage ? back : homePath(user)} />
  }

  const Layout = route.layout === 'admin' ? AdminLayout : BareLayout
  return (
    <Layout>
      <route.Component />
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
