import { useEffect, useState } from 'react'
import { listPublishedCourses } from '../../api/courses'
import type { PublishedCourse } from '../../api/types/courses'
import { copy } from '../../app/copy'
import { PageHeader } from '../../app/PageHeader'
import { Loading } from '../../app/PageStates'
import { Link } from '../../app/Router'

type ListState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; courses: PublishedCourse[] }

/** Employee Courses: every published Course, its title linking to the Course page and one line of description. */
export function EmployeeCourses() {
  const [state, setState] = useState<ListState>({ status: 'loading' })

  useEffect(() => {
    let current = true
    listPublishedCourses().then(
      (courses) => current && setState({ status: 'ready', courses }),
      () => current && setState({ status: 'error' }),
    )
    return () => {
      current = false
    }
  }, [])

  return (
    <>
      <PageHeader title={copy.employeeCourses.title} icon="menu_book" />
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <p className="field-error" role="alert">
          {copy.errors.generic}
        </p>
      )}
      {state.status === 'ready' && (
        <section className="card" aria-label={copy.employeeCourses.title}>
          {state.courses.length === 0 ? (
            <p className="card__empty">{copy.employeeCourses.empty}</p>
          ) : (
            state.courses.map((course) => (
              <div className="course-list-row" key={course.id}>
                <Link to={`/courses/${course.id}`}>{course.title}</Link>
                {course.description && <p className="course-list-row__description">{course.description}</p>}
              </div>
            ))
          )}
        </section>
      )}
    </>
  )
}
