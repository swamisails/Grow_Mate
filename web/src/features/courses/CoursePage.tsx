import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { getPublishedCourse } from '../../api/courses'
import type { PublishedCourse } from '../../api/types/courses'
import type { CourseProgress } from '../../api/types/progress'
import { getCourseProgress } from '../../api/progress'
import { copy } from '../../app/copy'
import { PageHeader } from '../../app/PageHeader'
import { Loading, NotFound } from '../../app/PageStates'
import { useRouter } from '../../app/router'
import { StagesCard } from '../assessments/StagesCard'
import { CourseMentors } from '../mentors/CourseMentors'
import { ProgressBar } from '../progress/ProgressBar'

type LoadState = { status: 'loading' } | { status: 'notFound' } | { status: 'error' } | { status: 'ready'; course: PublishedCourse }

/**
 * The Course page for an Employee: the published Course's description, the Stages the Learner has
 * reached, and its Mentors (R6), in the two-column card grid. A draft, a missing Course and a
 * non-numeric id all show Not found.
 */
export function CoursePage() {
  const { params } = useRouter()
  const id = /^\d+$/.test(params.id ?? '') ? Number(params.id) : NaN
  const valid = Number.isSafeInteger(id)
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [progress, setProgress] = useState<CourseProgress['status']>(null)
  const descriptionId = useId()
  // Only the latest progress read is applied, so an earlier null cannot clear the bar.
  const progressRead = useRef(0)

  const readProgress = useCallback(() => {
    const read = ++progressRead.current
    getCourseProgress(id).then(
      (next) => {
        if (read === progressRead.current) {
          setProgress(next.status)
        }
      },
      () => {
        // A failed refresh keeps the page, the bar it already has, and any 409 message.
      },
    )
  }, [id])

  useEffect(() => {
    if (!valid) {
      return
    }
    let current = true
    getPublishedCourse(id).then(
      (course) => current && setState({ status: 'ready', course }),
      (caught: unknown) => {
        if (!current) {
          return
        }
        // A hidden Course and a forbidden one look the same.
        const hidden = caught instanceof ApiError && (caught.status === 403 || caught.status === 404)
        setState({ status: hidden ? 'notFound' : 'error' })
      },
    )
    return () => {
      current = false
    }
  }, [id, valid])

  useEffect(() => {
    if (!valid || state.status !== 'ready') {
      return
    }
    const read = ++progressRead.current
    getCourseProgress(id).then(
      (next) => {
        if (read === progressRead.current) {
          setProgress(next.status)
        }
      },
      () => {
        // A failed read keeps the page and the bar it already has.
      },
    )
  }, [id, state.status, valid])

  if (!valid || state.status === 'notFound') {
    return <NotFound />
  }

  return (
    <>
      <PageHeader title={state.status === 'ready' ? state.course.title : copy.employeeCourses.pageName} icon="menu_book" />
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <p className="field-error" role="alert">
          {copy.errors.generic}
        </p>
      )}
      {state.status === 'ready' && (
        <div className="card-grid">
          {state.course.description && (
            <section className="card" aria-labelledby={descriptionId}>
              <h2 className="card__header" id={descriptionId}>
                {copy.employeeCourses.description}
              </h2>
              <div className="card__body">
                <div className="preserve-lines">{state.course.description}</div>
                {progress && <ProgressBar status={progress} />}
              </div>
            </section>
          )}
          {!state.course.description && progress && <ProgressBar status={progress} />}
          <StagesCard key={`stages-${state.course.id}`} courseId={state.course.id} />
          <CourseMentors key={state.course.id} courseId={state.course.id} onRequested={readProgress} />
        </div>
      )}
    </>
  )
}
