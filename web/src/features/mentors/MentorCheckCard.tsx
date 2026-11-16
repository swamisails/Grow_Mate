import { useEffect, useId, useState } from 'react'
import { getEmployeeRegistrationDecisions } from '../../api/mentors'
import type { DecidedCourse, EmployeeRegistrationDecisions } from '../../api/types/mentors'
import { copy } from '../../app/copy'

/** One of the card's two lists under its heading; an empty list shows "None.". */
function DecidedList({ heading, courses }: { heading: string; courses: DecidedCourse[] }) {
  const headingId = useId()

  return (
    <section className="decided-list" aria-labelledby={headingId}>
      <h3 className="decided-list__heading" id={headingId}>
        {heading}
      </h3>
      {courses.length === 0 ? (
        <p className="meta decided-list__none">{copy.home.none}</p>
      ) : (
        <ul className="list">
          {courses.map((course) => (
            <li className="list-row" key={course.id}>
              {course.title}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Home's Mentor check card (R3): the Employee's own approved and refused Courses, as two separate
 * lists in the API's order. Shown only when their Mentor check named a Course; while loading or
 * after a failed read it renders nothing, since it may not apply. No route, date or comment.
 */
export function MentorCheckCard() {
  const [decisions, setDecisions] = useState<EmployeeRegistrationDecisions | null>(null)
  const headingId = useId()

  useEffect(() => {
    let current = true
    getEmployeeRegistrationDecisions().then(
      (result) => current && setDecisions(result),
      () => undefined,
    )
    return () => {
      current = false
    }
  }, [])

  if (!decisions?.named) {
    return null
  }

  return (
    <section className="card" aria-labelledby={headingId}>
      <h2 className="card__header" id={headingId}>
        {copy.home.mentorCheck}
      </h2>
      <DecidedList heading={copy.home.approved} courses={decisions.approved} />
      <DecidedList heading={copy.home.refused} courses={decisions.refused} />
    </section>
  )
}
