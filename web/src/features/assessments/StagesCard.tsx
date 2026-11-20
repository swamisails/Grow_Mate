import { useEffect, useId, useState } from 'react'
import { listStages } from '../../api/assessments'
import type { StageState } from '../../api/types/assessments'
import { copy } from '../../app/copy'
import { Link } from '../../app/Router'

/**
 * The Course page's Stages card: one Stage block per Stage the API reports (available or passed),
 * in its order. A Stage not reached isn't rendered, and with none reached the card isn't either.
 * Available: a "Take [Stage]" button to the Assessment. Passed: "Passed" in plain text.
 */
export function StagesCard({ courseId }: { courseId: number }) {
  const [stages, setStages] = useState<StageState[]>([])
  const headingId = useId()

  useEffect(() => {
    let current = true
    listStages(courseId).then(
      (next) => current && setStages(next),
      () => {
        // Nothing reported, nothing rendered: the rest of the Course page stays.
      },
    )
    return () => {
      current = false
    }
  }, [courseId])

  if (stages.length === 0) {
    return null
  }

  return (
    <section className="card" aria-labelledby={headingId}>
      <h2 className="card__header" id={headingId}>
        {copy.assessments.stages}
      </h2>
      <ul className="list">
        {stages.map((stage) => {
          const name = copy.assessments.level[stage.level]
          return (
            <li className="list-row" key={stage.level}>
              <span className="stage-row__name">{name}</span>
              {stage.state === 'available' ? (
                <Link to={`/courses/${courseId}/stages/${stage.level}`} className="button button--primary">
                  {copy.assessments.take(name)}
                </Link>
              ) : (
                <span className="meta">{copy.assessments.passed}</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
