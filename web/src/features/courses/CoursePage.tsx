import { useEffect, useId, useState } from 'react'
import { ApiError } from '../../api/client'
import { getPublishedCourse } from '../../api/courses'
import type { PublishedCourse } from '../../api/types/courses'
import { copy } from '../../app/copy'
import { PageHeader } from '../../app/PageHeader'
import { Loading, NotFound } from '../../app/PageStates'
import { useRouter } from '../../app/router'

type LoadState = { status: 'loading' } | { status: 'notFound' } | { status: 'error' } | { status: 'ready'; course: PublishedCourse }

/**
 * The Course page for an Employee: the published Course's description. A draft, a missing Course
 * and a non-numeric id all show Not found. Mentors (R6) and Stages arrive in later entries.
 */
export function CoursePage() {
  const { params } = useRouter()
  const id = /^\d+$/.test(params.id ?? '') ? Number(params.id) : NaN
  const valid = Number.isSafeInteger(id)
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const descriptionId = useId()

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
      {state.status === 'ready' && state.course.description && (
        <section className="card" aria-labelledby={descriptionId}>
          <h2 className="card__header" id={descriptionId}>
            {copy.employeeCourses.description}
          </h2>
          <div className="card__body preserve-lines">{state.course.description}</div>
        </section>
      )}
    </>
  )
}
