import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { decideRegistration, listRegistrationDecisions } from '../../api/mentors'
import type { RegistrationDecisionRow } from '../../api/types/mentors'
import { Confirmation } from '../../app/Confirmation'
import { copy } from '../../app/copy'
import { ConflictMessage } from '../../app/forms'
import { PageHeader } from '../../app/PageHeader'
import { Loading } from '../../app/PageStates'

type ListState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; rows: RegistrationDecisionRow[] }

type Decision = 'approve' | 'refuse'

/**
 * Admin Registration decisions (R3): every Course named in a Mentor check, in the API's order. An
 * undecided row offers Approve and Refuse, each confirmed as final; a decided row shows only its tag.
 */
export function RegistrationDecisions() {
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [confirming, setConfirming] = useState<{ id: number; decision: Decision } | null>(null)
  // Rows whose decision is in flight; each row's buttons stay disabled until its own call settles.
  const [pending, setPending] = useState<ReadonlySet<number>>(new Set())
  // Each row's 409 or failure message, keyed by row id.
  const [messages, setMessages] = useState<Readonly<Record<number, string>>>({})
  // Once a confirmed decision settles, focus moves to that row's Decision cell (its buttons are gone or were disabled).
  const cells = useRef(new Map<number, HTMLTableCellElement>())
  const focusRow = useRef<number | null>(null)

  useEffect(() => {
    if (focusRow.current !== null && confirming === null) {
      cells.current.get(focusRow.current)?.focus()
      focusRow.current = null
    }
  })

  // After a 409 the list is re-read; if that read fails, the rows already shown stay.
  const refetch = useCallback(
    () => listRegistrationDecisions().then((rows) => setState({ status: 'ready', rows }), () => undefined),
    [],
  )

  useEffect(() => {
    let current = true
    listRegistrationDecisions().then(
      (rows) => current && setState({ status: 'ready', rows }),
      () => current && setState({ status: 'error' }),
    )
    return () => {
      current = false
    }
  }, [])

  function setMessage(id: number, message: string | null) {
    setMessages((current) => {
      const next = { ...current }
      if (message === null) {
        delete next[id]
      } else {
        next[id] = message
      }
      return next
    })
  }

  async function decide(id: number, decision: Decision) {
    setConfirming(null)
    setPending((current) => new Set(current).add(id))
    setMessage(id, null)
    try {
      const decided = await decideRegistration(id, decision)
      // AD-2: the row shows the outcome the API stored.
      setState((current) =>
        current.status === 'ready'
          ? { ...current, rows: current.rows.map((row) => (row.id === decided.id ? { ...row, outcome: decided.outcome } : row)) }
          : current,
      )
    } catch (caught) {
      // A 409 (already decided) shows the API message next to its row and re-fetches (useConflict's rule,
      // kept per row here because several rows can be in flight at once).
      if (caught instanceof ApiError && caught.status === 409) {
        setMessage(id, caught.message)
        void refetch()
      } else {
        setMessage(id, caught instanceof ApiError ? caught.message : copy.errors.generic)
      }
    } finally {
      setPending((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
      focusRow.current = id
    }
  }

  const label = { approve: copy.registrationDecisions.approve, refuse: copy.registrationDecisions.refuse }

  return (
    <>
      <PageHeader title={copy.registrationDecisions.title} icon="how_to_reg" />
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <p className="field-error" role="alert">
          {copy.errors.generic}
        </p>
      )}
      {state.status === 'ready' && (
        <section className="card" aria-label={copy.registrationDecisions.title}>
          {state.rows.length === 0 ? (
            <p className="card__empty">{copy.registrationDecisions.empty}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{copy.registrationDecisions.columnEmployee}</th>
                  <th scope="col">{copy.registrationDecisions.columnCourse}</th>
                  <th scope="col">{copy.registrationDecisions.columnDecision}</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.employee_name}</td>
                    <td>{row.course_title}</td>
                    <td
                      className="decision"
                      tabIndex={-1}
                      ref={(cell) => {
                        if (cell) {
                          cells.current.set(row.id, cell)
                        } else {
                          cells.current.delete(row.id)
                        }
                      }}
                    >
                      {row.outcome ? (
                        <span className="tag">{copy.registrationOutcome[row.outcome]}</span>
                      ) : (
                        <div className="decision__actions">
                          {(['approve', 'refuse'] as const).map((decision) => (
                            <button
                              key={decision}
                              type="button"
                              className="button button--secondary"
                              disabled={pending.has(row.id)}
                              onClick={() => setConfirming({ id: row.id, decision })}
                            >
                              {label[decision]}
                            </button>
                          ))}
                        </div>
                      )}
                      <ConflictMessage message={messages[row.id] ?? null} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
      {confirming && (
        <Confirmation
          title={label[confirming.decision]}
          message={copy.registrationDecisions.final}
          confirmLabel={label[confirming.decision]}
          onCancel={() => setConfirming(null)}
          onConfirm={() => decide(confirming.id, confirming.decision)}
        />
      )}
    </>
  )
}
