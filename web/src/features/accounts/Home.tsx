import { useEffect, useId, useState } from 'react'
import { getHome } from '../../api/matching'
import type { HomeScreen, LearningRow } from '../../api/types/matching'
import { copy } from '../../app/copy'
import { PageHeader } from '../../app/PageHeader'
import { Loading } from '../../app/PageStates'
import { Link } from '../../app/Router'
import { MentorCheckCard } from '../mentors/MentorCheckCard'
import { ProgressBar } from '../progress/ProgressBar'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; home: HomeScreen }

/** In progress opens the Match. Not yet started opens the Course, and has no Match id. */
function learningHref(row: LearningRow): string {
  if (row.status === 'in_progress' && row.match_id !== null) {
    return `/matches/${row.match_id}`
  }
  return `/courses/${row.course_id}`
}

/**
 * The Employee home: a two-column card grid. Learning lists each Course with a Progress status, and
 * keeps its empty sentence when there is none. Mentoring lists live Matches and is absent when
 * there are none. The Mentor check card sits with them when the Employee named Courses.
 */
export function Home() {
  const learningId = useId()
  const mentoringId = useId()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let current = true
    getHome().then(
      (home) => current && setState({ status: 'ready', home }),
      () => current && setState({ status: 'error' }),
    )
    return () => {
      current = false
    }
  }, [])

  const home = state.status === 'ready' ? state.home : null

  return (
    <>
      <PageHeader title={copy.home.title} icon="home" />
      <div className="card-grid">
        <section className="card" aria-labelledby={learningId}>
          <h2 className="card__header" id={learningId}>
            {copy.home.learning}
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
          {home && home.learning.length === 0 && (
            <p className="card__empty">
              {copy.home.learningEmpty} <Link to="/courses">{copy.nav.courses}</Link>
            </p>
          )}
          {home && home.learning.length > 0 && (
            <ul className="list">
              {home.learning.map((row) => (
                <li className="list-row" key={row.course_id}>
                  <Link to={learningHref(row)}>{row.course_title}</Link>
                  <ProgressBar status={row.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        {home && home.mentoring.length > 0 && (
          <section className="card" aria-labelledby={mentoringId}>
            <h2 className="card__header" id={mentoringId}>
              {copy.home.mentoring}
            </h2>
            <ul className="list">
              {home.mentoring.map((row) => (
                <li className="list-row" key={row.id}>
                  <Link to={`/matches/${row.id}`}>{copy.home.mentoringRow(row.person_name, row.course_title)}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <MentorCheckCard />
      </div>
    </>
  )
}
