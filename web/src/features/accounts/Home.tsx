import { useId } from 'react'
import { copy } from '../../app/copy'
import { PageHeader } from '../../app/PageHeader'

/**
 * The Employee home. Learning is always empty until Courses and Progress statuses arrive (entries 4
 * and later); its link to Courses comes with the Courses page, since only built pages are linked.
 */
export function Home() {
  const learningId = useId()

  return (
    <>
      <PageHeader title={copy.home.title} icon="home" />
      <section className="card" aria-labelledby={learningId}>
        <h2 className="card__header" id={learningId}>
          {copy.home.learning}
        </h2>
        <p className="card__empty">{copy.home.learningEmpty}</p>
      </section>
    </>
  )
}
