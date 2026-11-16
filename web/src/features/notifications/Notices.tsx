import { useEffect, useState } from 'react'
import { listNotices } from '../../api/notifications'
import type { Notice } from '../../api/types/notifications'
import { copy } from '../../app/copy'
import { PageHeader } from '../../app/PageHeader'
import { Loading } from '../../app/PageStates'

type ListState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; notices: Notice[] }

/** The notice's sentence; the Course title is user text, rendered as text (AD-9). */
function sentence(notice: Notice): string {
  switch (notice.type) {
    case 'registration_decision':
      return copy.notices.registrationDecision[notice.outcome](notice.course_title)
  }
}

/**
 * The Employee's notices (AD-11): one list in the API's order, newest first, each a sentence and its
 * UTC date. Every notice has the same weight: no read state, count, action, link or icon.
 */
export function Notices() {
  const [state, setState] = useState<ListState>({ status: 'loading' })

  useEffect(() => {
    let current = true
    listNotices().then(
      (notices) => current && setState({ status: 'ready', notices }),
      () => current && setState({ status: 'error' }),
    )
    return () => {
      current = false
    }
  }, [])

  return (
    <>
      <PageHeader title={copy.notices.title} icon="notifications" />
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <p className="field-error" role="alert">
          {copy.errors.generic}
        </p>
      )}
      {state.status === 'ready' && (
        <section className="card" aria-label={copy.notices.title}>
          {state.notices.length === 0 ? (
            <p className="card__empty">{copy.notices.empty}</p>
          ) : (
            <ul className="list">
              {state.notices.map((notice) => (
                <li className="list-row notice-row" key={notice.id}>
                  <p className="notice-row__sentence">{sentence(notice)}</p>
                  <p className="meta">
                    <time dateTime={notice.occurred_at}>{copy.date(notice.occurred_at)}</time>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  )
}
