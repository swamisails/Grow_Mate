import { useId, useState, type FormEvent } from 'react'
import { submitMentorCheck } from '../../api/mentors'
import type { SubmitMentorCheckRequest } from '../../api/types/mentors'
import { copy } from '../../app/copy'
import { ConflictMessage, useConflict } from '../../app/forms'
import { PageHeader } from '../../app/PageHeader'
import { useRouter } from '../../app/router'
import { useSession } from '../../app/session'

/**
 * Sign-up step 2, the Mentor check (R2, AD-15): a checkbox per Course published before the account
 * was created, then Submit (at least one ticked) or Skip. Either is final, with no confirmation, and
 * goes Home. With no Courses to name, only Skip is shown. The Courses come from the session's status.
 */
export function MentorCheck() {
  const { mentorCheck, setMentorCheck, refreshMentorCheck } = useSession()
  const { navigate } = useRouter()
  const [ticked, setTicked] = useState<ReadonlySet<number>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  // A 409 re-reads the status: a check already done elsewhere then goes Home, through the router.
  const conflict = useConflict(refreshMentorCheck)
  const headingId = useId()

  const courses = mentorCheck?.courses ?? []
  // Only Courses still offered count, should a refetch drop one.
  const chosen = courses.filter((course) => ticked.has(course.id)).map((course) => course.id)

  function toggle(courseId: number, checked: boolean) {
    setTicked((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(courseId)
      } else {
        next.delete(courseId)
      }
      return next
    })
  }

  async function send(submission: SubmitMentorCheckRequest) {
    setSubmitting(true)
    setFailure(null)
    conflict.clear()
    try {
      setMentorCheck(await submitMentorCheck(submission))
      navigate('/home', { replace: true })
    } catch (caught) {
      // The form can't send a bad shape, so anything but a 409 is a failure to retry.
      if (!conflict.handle(caught)) {
        setFailure(copy.errors.generic)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (chosen.length > 0) {
      void send({ course_ids: chosen })
    }
  }

  return (
    <>
      <PageHeader title={copy.mentorCheck.title} icon="person_add" />
      <form className="mentor-check" onSubmit={handleSubmit} noValidate>
        {courses.length > 0 && (
          <div className="card">
            <h2 className="card__header" id={headingId}>
              {copy.mentorCheck.courses}
            </h2>
            <fieldset className="mentor-check__courses" aria-labelledby={headingId}>
              <ul className="list">
                {courses.map((course) => (
                  <li className="list-row" key={course.id}>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={ticked.has(course.id)}
                        onChange={(event) => toggle(course.id, event.target.checked)}
                      />
                      {course.title}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          </div>
        )}
        <div className="mentor-check__actions">
          {courses.length > 0 && (
            <button type="submit" className="button button--primary" disabled={submitting || chosen.length === 0}>
              {copy.mentorCheck.submit}
            </button>
          )}
          <button type="button" className="button button--secondary" disabled={submitting} onClick={() => void send({ skip: true })}>
            {copy.mentorCheck.skip}
          </button>
        </div>
        <ConflictMessage message={conflict.message ?? failure} />
      </form>
    </>
  )
}
