import { useEffect, useState } from 'react'
import { listCourses } from '../../api/courses'
import type { CourseListItem } from '../../api/types/courses'
import { copy } from '../../app/copy'
import { Icon } from '../../app/icons'
import { PageHeader } from '../../app/PageHeader'
import { Loading } from '../../app/PageStates'
import { Link } from '../../app/Router'

type ListState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; courses: CourseListItem[] }

/** Admin Courses: every Course, newest first, each with its Draft or Published tag. */
export function AdminCourses() {
  const [state, setState] = useState<ListState>({ status: 'loading' })

  useEffect(() => {
    let current = true
    listCourses().then(
      (courses) => current && setState({ status: 'ready', courses }),
      () => current && setState({ status: 'error' }),
    )
    return () => {
      current = false
    }
  }, [])

  return (
    <>
      <PageHeader
        title={copy.adminCourses.title}
        icon="menu_book"
        action={
          <Link to="/admin/courses/new" className="button button--primary button--with-icon">
            <Icon name="add" className="button__icon" />
            {copy.adminCourses.newCourse}
          </Link>
        }
      />
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <p className="field-error" role="alert">
          {copy.errors.generic}
        </p>
      )}
      {state.status === 'ready' && (
        <section className="card" aria-label={copy.adminCourses.title}>
          {state.courses.length === 0 ? (
            <p className="card__empty">{copy.adminCourses.empty}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{copy.adminCourses.columnTitle}</th>
                  <th scope="col">{copy.adminCourses.columnStatus}</th>
                </tr>
              </thead>
              <tbody>
                {state.courses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <Link to={`/admin/courses/${course.id}`}>{course.title}</Link>
                    </td>
                    <td>
                      <span className="tag">{copy.courseStatus[course.status]}</span>
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
