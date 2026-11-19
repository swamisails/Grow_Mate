import { useEffect, useState } from 'react'
import { listUpskilling } from '../../api/progress'
import type { UpskillingRow } from '../../api/types/progress'
import { copy } from '../../app/copy'
import { PageHeader } from '../../app/PageHeader'
import { Loading } from '../../app/PageStates'
import { ProgressBar } from './ProgressBar'

type ListState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; rows: UpskillingRow[] }

/**
 * The Upskilling list: every Employee In progress on a Course, in the API's order. Read-only for
 * every signed-in user: no counts, sorting controls, filters, links or actions (C9).
 */
export function Upskilling() {
  const [state, setState] = useState<ListState>({ status: 'loading' })

  useEffect(() => {
    let current = true
    listUpskilling().then(
      (rows) => current && setState({ status: 'ready', rows }),
      () => current && setState({ status: 'error' }),
    )
    return () => {
      current = false
    }
  }, [])

  return (
    <>
      <PageHeader title={copy.upskilling.title} icon="trending_up" />
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <p className="field-error" role="alert">
          {copy.errors.generic}
        </p>
      )}
      {state.status === 'ready' && (
        <section className="card" aria-label={copy.upskilling.title}>
          {state.rows.length === 0 ? (
            <p className="card__empty">{copy.upskilling.empty}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{copy.upskilling.columnName}</th>
                  <th scope="col">{copy.upskilling.columnCourse}</th>
                  <th scope="col">{copy.upskilling.columnStatus}</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((row, index) => (
                  <tr key={index}>
                    <td>{row.person_name}</td>
                    <td>{row.course_title}</td>
                    <td>
                      <ProgressBar status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </>
  )
}
