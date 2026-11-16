import { useId } from 'react'
import { copy } from '../../app/copy'
import { PageHeader } from '../../app/PageHeader'
import { Link } from '../../app/Router'
import { MentorCheckCard } from '../mentors/MentorCheckCard'

/**
 * The Employee home: a two-column card grid. Learning is always empty until Progress statuses arrive
 * (epic 2), and its empty state links to Courses (EXPERIENCE.md, State Patterns). The Mentor check
 * card sits beside it when the Employee named Courses.
 */
export function Home() {
  const learningId = useId()

  return (
    <>
      <PageHeader title={copy.home.title} icon="home" />
      <div className="card-grid">
        <section className="card" aria-labelledby={learningId}>
          <h2 className="card__header" id={learningId}>
            {copy.home.learning}
          </h2>
          <p className="card__empty">
            {copy.home.learningEmpty} <Link to="/courses">{copy.nav.courses}</Link>
          </p>
        </section>
        <MentorCheckCard />
      </div>
    </>
  )
}
