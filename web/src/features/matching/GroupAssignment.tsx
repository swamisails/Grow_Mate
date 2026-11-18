import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { listEmployees } from '../../api/accounts'
import { listCourses } from '../../api/courses'
import { assignGroup } from '../../api/matching'
import type { Employee } from '../../api/types/accounts'
import type { CourseListItem } from '../../api/types/courses'
import type { GroupAssignment as CreatedAssignment } from '../../api/types/matching'
import { copy } from '../../app/copy'
import { ConflictMessage, fieldErrors, focusFirstInvalid, useConflict, type FieldErrors } from '../../app/forms'
import { PageHeader } from '../../app/PageHeader'
import { Loading } from '../../app/PageStates'

type Choices = { courses: CourseListItem[]; employees: Employee[] }

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; choices: Choices }

/** Published Courses and every Employee, the two things the form picks from. */
async function loadChoices(): Promise<Choices> {
  const [courses, employees] = await Promise.all([listCourses(), listEmployees()])
  return { courses: courses.filter((course) => course.status === 'published'), employees }
}

/** One message per form field: `learner_ids.N` keys fold into the Learners fieldset's `learner_ids`. */
function formErrors(errors: FieldErrors): FieldErrors {
  const folded: FieldErrors = {}
  for (const [key, message] of Object.entries(errors)) {
    const field = key.startsWith('learner_ids.') ? 'learner_ids' : key
    folded[field] ??= message
  }
  return folded
}

type SelectFieldProps = {
  label: string
  /** The API field name: the select's `name`, which `focusFirstInvalid` looks up. */
  name: string
  value: string
  options: { id: number; label: string }[]
  onChange: (value: string) => void
  error?: string
}

/** An outlined select with its label in the top border and its field error below. */
function SelectField({ label, name, value, options, onChange, error }: SelectFieldProps) {
  const selectId = useId()
  const errorId = useId()

  return (
    <div className="field field--select">
      <select
        className="field__input field__select"
        id={selectId}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
      >
        <option value="" />
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <label className="field__label" htmlFor={selectId}>
        {label}
      </label>
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Admin's Group assignment (UJ-4): a published Course, the chosen Employee, and the Learners (every
 * Employee but the chosen one). Assign is final, with no confirmation. The page then shows only the
 * assignment just created, never whether it was accepted, and the form starts again. No history.
 */
export function GroupAssignment() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [courseId, setCourseId] = useState('')
  const [mentorId, setMentorId] = useState('')
  const [ticked, setTicked] = useState<ReadonlySet<number>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedAssignment | null>(null)
  const submittingRef = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const formHeadingId = useId()
  const createdHeadingId = useId()
  const learnersErrorId = useId()

  // After a 409 the choices are re-read (a Course may have changed); if that fails, the shown ones stay.
  const refetch = useCallback(() => loadChoices().then((choices) => setState({ status: 'ready', choices }), () => undefined), [])
  const conflict = useConflict(refetch)

  // Focus moves to the first invalid field once its message and aria links are rendered.
  useEffect(() => {
    if (formRef.current && Object.keys(errors).length > 0) {
      focusFirstInvalid(formRef.current, errors)
    }
  }, [errors])

  useEffect(() => {
    let current = true
    loadChoices().then(
      (choices) => current && setState({ status: 'ready', choices }),
      () => current && setState({ status: 'error' }),
    )
    return () => {
      current = false
    }
  }, [])

  const employees = state.status === 'ready' ? state.choices.employees : []
  const learners = mentorId === '' ? [] : employees.filter((employee) => String(employee.id) !== mentorId)
  // Only Learners still listed count: choosing a ticked Learner as the chosen Employee drops them.
  const chosen = learners.filter((learner) => ticked.has(learner.id)).map((learner) => learner.id)

  function toggle(learnerId: number, checked: boolean) {
    setTicked((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(learnerId)
      } else {
        next.delete(learnerId)
      }
      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current || chosen.length === 0) {
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setErrors({})
    setFailure(null)
    setCreated(null)
    conflict.clear()
    try {
      const assignment = await assignGroup({
        course_id: courseId === '' ? null : Number(courseId),
        mentor_id: Number(mentorId),
        learner_ids: chosen,
      })
      setCreated(assignment)
      setCourseId('')
      setMentorId('')
      setTicked(new Set())
    } catch (caught) {
      const invalid = fieldErrors(caught)
      if (invalid) {
        setErrors(formErrors(invalid))
      } else if (!conflict.handle(caught)) {
        setFailure(copy.errors.generic)
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const text = copy.groupAssignment

  return (
    <>
      <PageHeader title={text.title} icon="group_add" />
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <p className="field-error" role="alert">
          {copy.errors.generic}
        </p>
      )}
      {state.status === 'ready' && (
        <div className="group-assignment">
          <div role="status" aria-live="polite">
            {created && (
              <section className="card" aria-labelledby={createdHeadingId}>
                <h2 className="card__header" id={createdHeadingId}>
                  {text.created}
                </h2>
                <dl className="summary">
                  <div className="summary__row">
                    <dt className="meta">{text.course}</dt>
                    <dd>{created.course_title}</dd>
                  </div>
                  <div className="summary__row">
                    <dt className="meta">{text.chosenEmployee}</dt>
                    <dd>{created.mentor_name}</dd>
                  </div>
                  <div className="summary__row">
                    <dt className="meta">{text.learners}</dt>
                    <dd>
                      <ul className="summary__list">
                        {created.learner_names.map((name, index) => (
                          <li key={index}>{name}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div className="summary__row">
                    <dt className="meta">{text.createdAt}</dt>
                    <dd>{copy.date(created.created_at)}</dd>
                  </div>
                </dl>
              </section>
            )}
          </div>
          <section className="card" aria-labelledby={formHeadingId}>
            <h2 className="card__header" id={formHeadingId}>
              {text.form}
            </h2>
            <form className="card__body" ref={formRef} onSubmit={handleSubmit} noValidate>
              <div className="group-assignment__fields">
                <SelectField
                  label={text.course}
                  name="course_id"
                  value={courseId}
                  options={state.choices.courses.map((course) => ({ id: course.id, label: course.title }))}
                  onChange={setCourseId}
                  error={errors.course_id}
                />
                <SelectField
                  label={text.chosenEmployee}
                  name="mentor_id"
                  value={mentorId}
                  options={employees.map((employee) => ({ id: employee.id, label: employee.name }))}
                  onChange={setMentorId}
                  error={errors.mentor_id}
                />
              </div>
              {learners.length > 0 && (
                <fieldset
                  className="group-assignment__learners"
                  name="learner_ids"
                  aria-describedby={errors.learner_ids ? learnersErrorId : undefined}
                >
                  <legend className="group-assignment__legend">{text.learners}</legend>
                  <ul className="group-assignment__checks">
                    {learners.map((learner) => (
                      <li key={learner.id}>
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={ticked.has(learner.id)}
                            onChange={(event) => toggle(learner.id, event.target.checked)}
                          />
                          {learner.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                  {errors.learner_ids && (
                    <p className="field-error" id={learnersErrorId}>
                      {errors.learner_ids}
                    </p>
                  )}
                </fieldset>
              )}
              <div className="group-assignment__actions">
                <ConflictMessage message={conflict.message ?? failure} />
                <button type="submit" className="button button--primary" disabled={submitting || chosen.length === 0}>
                  {text.assign}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
