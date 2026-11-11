import { copy } from '../../app/copy'

/** Admin Courses. Static until the Course list arrives with the next story; no API call yet. */
export function AdminCourses() {
  return (
    <section className="card" aria-labelledby="admin-courses-title">
      <h1 className="card__header" id="admin-courses-title">
        {copy.adminCourses.title}
      </h1>
      <p className="card__empty">{copy.adminCourses.empty}</p>
    </section>
  )
}
