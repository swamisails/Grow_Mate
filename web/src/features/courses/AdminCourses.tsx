import { copy } from '../../app/copy'
import { PageHeader } from '../../app/PageHeader'

/** Admin Courses. Static until the Course list arrives with the next story; no API call yet. */
export function AdminCourses() {
  return (
    <>
      <PageHeader title={copy.adminCourses.title} icon="menu_book" />
      <section className="card" aria-label={copy.adminCourses.title}>
        <p className="card__empty">{copy.adminCourses.empty}</p>
      </section>
    </>
  )
}
