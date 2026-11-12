import type { ReactNode } from 'react'
import { copy } from './copy'
import { Icon } from './icons'
import { Link, NavLink } from './Router'
import { useRouter } from './router'
import { useSession } from './session'
import { ThemeToggle } from './ThemeToggle'

/** Signed-out pages: the bar carries the product name and the theme toggle, so a visitor can switch before signing in. */
export function BareLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="app-header">
        <p className="app-header__name">{copy.appName}</p>
        <div className="app-header__account">
          <ThemeToggle />
        </div>
      </header>
      <main className="page">{children}</main>
    </>
  )
}

/**
 * A signed-in top bar (R11): the product name, links to built pages only, then the theme toggle,
 * the user's name and Sign out.
 */
function SignedInLayout({ name, nav, children }: { name: ReactNode; nav: ReactNode; children: ReactNode }) {
  const { user, signOut } = useSession()
  const { navigate } = useRouter()

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      // The session is already gone or unusable; the local user is cleared either way.
    } finally {
      navigate('/sign-in', { replace: true })
    }
  }

  return (
    <>
      <header className="app-header">
        <p className="app-header__name">{name}</p>
        <nav className="app-header__nav" aria-label={copy.nav.primary}>
          {nav}
        </nav>
        <div className="app-header__account">
          <ThemeToggle />
          <span>{user?.name}</span>
          <button type="button" className="app-header__signout" onClick={handleSignOut}>
            {copy.nav.signOut}
          </button>
        </div>
      </header>
      <main className="page">{children}</main>
    </>
  )
}

/** Admin pages: only Courses is built so far. */
export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SignedInLayout
      name={copy.appName}
      nav={
        <NavLink to="/admin/courses" className="app-header__link">
          <Icon name="menu_book" className="app-header__icon" />
          {copy.nav.courses}
        </NavLink>
      }
    >
      {children}
    </SignedInLayout>
  )
}

/** Employee pages: "GrowMate" links to Home, and Home is the only built page so far. */
export function EmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <SignedInLayout
      name={
        <Link to="/home" className="app-header__home">
          {copy.appName}
        </Link>
      }
      nav={
        <NavLink to="/home" className="app-header__link">
          <Icon name="home" className="app-header__icon" />
          {copy.nav.home}
        </NavLink>
      }
    >
      {children}
    </SignedInLayout>
  )
}
