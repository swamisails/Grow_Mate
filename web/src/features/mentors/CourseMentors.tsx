import { useEffect, useId, useState } from 'react'
import { ApiError } from '../../api/client'
import { getRequestEligibility, sendRequest } from '../../api/matching'
import { listCourseMentors } from '../../api/mentors'
import type { CourseMentor } from '../../api/types/mentors'
import { copy } from '../../app/copy'
import { Loading } from '../../app/PageStates'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; mentors: CourseMentor[] }

/**
 * The Course page's Mentors card (R6): each Mentor's name, in the API's order, without the viewer.
 * A Request button shows only when the eligibility read says the viewer may ask. A 409 keeps the
 * API message under that row even when the refresh that follows fails.
 */
export function CourseMentors({ courseId, onRequested }: { courseId: number; onRequested?: () => Promise<void> | void }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [canRequest, setCanRequest] = useState(false)
  const [sending, setSending] = useState(false)
  const [conflict, setConflict] = useState<{ mentorId: number; message: string } | null>(null)
  const headingId = useId()

  useEffect(() => {
    let current = true
    listCourseMentors(courseId).then(
      (mentors) => current && setState({ status: 'ready', mentors }),
      () => current && setState({ status: 'error' }),
    )
    getRequestEligibility(courseId).then(
      (eligibility) => current && setCanRequest(eligibility.can_request),
      () => {
        // The button shows only when the read says the viewer may ask.
      },
    )
    return () => {
      current = false
    }
  }, [courseId])

  async function requestMentor(mentorId: number) {
    setSending(true)
    try {
      await sendRequest(courseId, mentorId)
      setConflict(null)
    } catch (caught: unknown) {
      const message = caught instanceof ApiError && caught.status === 409 ? caught.message : copy.errors.generic
      setConflict({ mentorId, message })
    }

    try {
      const eligibility = await getRequestEligibility(courseId)
      setCanRequest(eligibility.can_request)
    } catch {
      // A failed refresh keeps the page and the message under the row.
    }

    try {
      await onRequested?.()
    } catch {
      // The Course page stays up, and so does a 409 message.
    }

    setSending(false)
  }

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
              <li key={mentor.id}>
                <div className="list-row">
                  <span>{mentor.name}</span>
                  {canRequest && (
                    <button
                      type="button"
                      className="button button--primary"
                      disabled={sending}
                      onClick={() => requestMentor(mentor.id)}
                    >
                      {copy.mentors.request}
                    </button>
                  )}
                </div>
                {conflict?.mentorId === mentor.id && (
                  <p className="list-row__error field-error" role="alert">
                    {conflict.message}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ))}
    </section>
  )
}
