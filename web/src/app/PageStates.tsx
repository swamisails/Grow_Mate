// Shared page states (EXPERIENCE.md, State Patterns). No skeletons or spinners.

import { copy } from './copy'
import { useDocumentTitle } from './documentTitle'
import { Link } from './Router'
import { homePath, useSession } from './session'

/** "Loading…" in `meta`, where the content will go. */
export function Loading() {
  return (
    <p className="meta" role="status">
      {copy.states.loading}
    </p>
  )
}

/** Unknown and forbidden pages look the same (403 = 404), so nothing hidden can be inferred. */
export function NotFound() {
  const { user } = useSession()
  useDocumentTitle(copy.states.notFoundTitle)

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">{copy.states.notFound}</h1>
      </div>
      <p>
        <Link to={homePath(user)}>{user ? copy.states.home : copy.signIn.title}</Link>
      </p>
    </>
  )
}
