import { AdminLayout, BareLayout } from './layout'
import { Navigate, RouterProvider } from './Router'
import { useRouter } from './router'
import { routes } from './routes'
import { homePath, useSession } from './session'
import { SessionProvider } from './SessionProvider'

function CurrentPage() {
  const { path } = useRouter()
  const { loading, user } = useSession()

  if (loading) {
    return null
  }

  const route = routes.find((candidate) => candidate.path === path)

  if (!route) {
    return <Navigate to={homePath(user)} />
  }
  if (route.access === 'admin' && !user?.is_admin) {
    return <Navigate to="/sign-in" />
  }
  if (route.access === 'guest' && user?.is_admin) {
    return <Navigate to={homePath(user)} />
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
