import { useEffect, useId, useState } from 'react'
import { listCourseMentors } from '../../api/mentors'
import type { CourseMentor } from '../../api/types/mentors'
import { copy } from '../../app/copy'
import { Loading } from '../../app/PageStates'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; mentors: CourseMentor[] }

/**
 * The Course page's Mentors card (R6): each Mentor's name, in the API's order, without the viewer.
 * Names only: no route, avatar or Request button.
 */
export function CourseMentors({ courseId }: { courseId: number }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const headingId = useId()

  useEffect(() => {
    let current = true
    listCourseMentors(courseId).then(
      (mentors) => current && setState({ status: 'ready', mentors }),
      () => current && setState({ status: 'error' }),
    )
    return () => {
      current = false
    }
  }, [courseId])

  return (
    <section className="card" aria-labelledby={headingId}>
      <h2 className="card__header" id={headingId}>
        {copy.mentors.title}
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
      {state.status === 'ready' &&
        (state.mentors.length === 0 ? (
          <p className="card__empty">{copy.mentors.empty}</p>
        ) : (
          <ul className="list">
            {state.mentors.map((mentor) => (
              <li className="list-row" key={mentor.id}>
                {mentor.name}
              </li>
            ))}
          </ul>
        ))}
    </section>
  )
}
