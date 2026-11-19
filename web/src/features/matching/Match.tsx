import { useEffect, useId, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { completeCourse, getMatch } from '../../api/matching'
import type { MatchScreen } from '../../api/types/matching'
import { Confirmation } from '../../app/Confirmation'
import { copy } from '../../app/copy'
import { PageHeader } from '../../app/PageHeader'
import { Loading, NotFound } from '../../app/PageStates'
import { useRouter } from '../../app/router'
import { ProgressBar } from '../progress/ProgressBar'
import { QuitDialog } from './QuitDialog'

type LoadState = { status: 'loading' } | { status: 'notFound' } | { status: 'error' } | { status: 'ready'; match: MatchScreen }

/**
 * The Match, for either party: the Course as the page title, the other person's name, and that
 * Learner's bar, and Quit Course, which opens the Quit dialog. A missing or ended Match and anyone
 * else look like Not found.
 */
export function Match() {
  const { params, navigate } = useRouter()
  const id = /^\d+$/.test(params.id ?? '') ? Number(params.id) : NaN
  const valid = Number.isSafeInteger(id)
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const nameId = useId()
  const [quitting, setQuitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState(false)
  const sending = useRef(false)

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

  async function onComplete() {
    if (sending.current) {
      return
    }
    sending.current = true
    try {
      await completeCourse(id)
      navigate('/home')
    } catch (caught) {
      sending.current = false
      setCompleting(false)
      if (caught instanceof ApiError && caught.status === 404) {
        setState({ status: 'notFound' })
      } else {
        setCompleteError(true)
      }
    }
  }

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
      {completeError && (
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
            {match.can_complete_course && (
              <button type="button" className="button button--primary" onClick={() => setCompleting(true)}>
                {copy.match.courseCompleted}
              </button>
            )}
            <button type="button" className="button button--secondary" onClick={() => setQuitting(true)}>
              {copy.match.quitCourse}
            </button>
          </div>
        </section>
      )}
      {completing && match && (
        <Confirmation
          title={copy.match.courseCompletedConfirm.title}
          message={copy.match.courseCompletedConfirm.message(match.person_name)}
          confirmLabel={copy.match.courseCompleted}
          onCancel={() => setCompleting(false)}
          onConfirm={onComplete}
        />
      )}
      {quitting && (
        <QuitDialog
          matchId={id}
          onCancel={() => setQuitting(false)}
          onQuit={() => navigate('/home')}
          onGone={() => {
            setQuitting(false)
            setState({ status: 'notFound' })
          }}
        />
      )}
    </>
  )
}
