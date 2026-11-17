import { useEffect, useId, useState } from 'react'
import { ApiError } from '../../api/client'
import { getMatch } from '../../api/matching'
import type { MatchScreen } from '../../api/types/matching'
import { copy } from '../../app/copy'
import { PageHeader } from '../../app/PageHeader'
import { Loading, NotFound } from '../../app/PageStates'
import { useRouter } from '../../app/router'
import { ProgressBar } from '../progress/ProgressBar'

type LoadState = { status: 'loading' } | { status: 'notFound' } | { status: 'error' } | { status: 'ready'; match: MatchScreen }

/**
 * The Match, for either party: the Course as the page title, the other person's name, and that
 * Learner's bar. No actions. A missing Match and anyone else look like Not found.
 */
export function Match() {
  const { params } = useRouter()
  const id = /^\d+$/.test(params.id ?? '') ? Number(params.id) : NaN
  const valid = Number.isSafeInteger(id)
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const nameId = useId()

  useEffect(() => {
    if (!valid) {
      return
    }
    let current = true
    getMatch(id).then(
      (match) => current && setState({ status: 'ready', match }),
      (caught: unknown) => {
        if (!current) {
          return
        }
        const hidden = caught instanceof ApiError && (caught.status === 403 || caught.status === 404)
        setState({ status: hidden ? 'notFound' : 'error' })
      },
    )
    return () => {
      current = false
    }
  }, [id, valid])

  if (!valid || state.status === 'notFound') {
    return <NotFound />
  }

  const match = state.status === 'ready' ? state.match : null

  return (
    <>
      <PageHeader title={match ? match.course_title : copy.match.pageName} icon="menu_book" />
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <p className="field-error" role="alert">
          {copy.errors.generic}
        </p>
      )}
      {match && (
        <section className="card" aria-labelledby={nameId}>
          <h2 className="card__header" id={nameId}>
            {match.person_name}
          </h2>
          <div className="card__body">
            <p>{match.course_title}</p>
            {match.status && <ProgressBar status={match.status} />}
          </div>
        </section>
      )}
    </>
  )
}
