import type { ReactNode } from 'react'
import { copy } from './copy'
import { Icon } from './icons'
import { NavLink } from './Router'
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

/** Admin pages: top bar with links to built Admin pages only, then the theme toggle, the name and Sign out (R11). */
export function AdminLayout({ children }: { children: ReactNode }) {
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
        <p className="app-header__name">{copy.appName}</p>
        <nav className="app-header__nav" aria-label={copy.nav.primary}>
          <NavLink to="/admin/courses" className="app-header__link">
            <Icon name="menu_book" className="app-header__icon" />
            {copy.nav.courses}
          </NavLink>
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
