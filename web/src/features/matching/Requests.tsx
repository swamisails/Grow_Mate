import { useEffect, useId, useRef, useState } from 'react'
import { acceptRequest, listRequests } from '../../api/matching'
import type { IncomingRequest } from '../../api/types/matching'
import { copy } from '../../app/copy'
import { PageHeader } from '../../app/PageHeader'
import { Loading } from '../../app/PageStates'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; requests: IncomingRequest[] }

/**
 * Requests addressed to the signed-in Employee. One Accept at a time: every button stays disabled
 * until that Accept and its list refresh finish, and a list that started earlier is ignored.
 */
export function Requests() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState(false)
  const headingId = useId()
  const listToken = useRef(0)
  const acceptingRef = useRef(false)

  useEffect(() => {
    const token = ++listToken.current
    let active = true
    listRequests().then(
      (requests) => {
        if (active && token === listToken.current) {
          setState({ status: 'ready', requests })
        }
      },
      () => {
        if (active && token === listToken.current) {
          setState({ status: 'error' })
        }
      },
    )
    return () => {
      active = false
    }
  }, [])

  async function accept(id: number) {
    if (acceptingRef.current || state.status !== 'ready') {
      return
    }
    acceptingRef.current = true
    setAccepting(true)
    setAcceptError(false)

    let accepted = false
    try {
      await acceptRequest(id)
      accepted = true
    } catch {
      setAcceptError(true)
    }

    const token = ++listToken.current
    try {
      const requests = await listRequests()
      if (token === listToken.current) {
        setState({ status: 'ready', requests })
      }
    } catch {
      if (token === listToken.current && accepted) {
        setState((current) =>
          current.status === 'ready' ? { status: 'ready', requests: current.requests.filter((row) => row.id !== id) } : current,
        )
      }
    }

    acceptingRef.current = false
    setAccepting(false)
  }

  return (
    <>
      <PageHeader title={copy.requests.title} icon="inbox" />
      <section className="card" aria-labelledby={headingId}>
        <h2 className="card__header" id={headingId}>
          {copy.requests.title}
        </h2>
        {state.status === 'loading' && (
          <div className="card__body">
            <Loading />
          </div>
        )}
        {state.status === 'error' && (
          <p className="card__body field-error" role="alert">
            {copy.errors.generic}
          </p>
        )}
        {state.status === 'ready' && state.requests.length === 0 && <p className="card__empty">{copy.requests.empty}</p>}
        {state.status === 'ready' && state.requests.length > 0 && (
          <>
            {acceptError && (
              <p className="card__body field-error" role="alert">
                {copy.errors.generic}
              </p>
            )}
            <ul className="list">
              {state.requests.map((request) => (
                <li className="list-row" key={request.id}>
                  <span>{copy.requests.sentence(request.learner_name, request.course_title)}</span>
                  <button type="button" className="button button--primary" disabled={accepting} onClick={() => accept(request.id)}>
                    {copy.requests.accept}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  )
}
