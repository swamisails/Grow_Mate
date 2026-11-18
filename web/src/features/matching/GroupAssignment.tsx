import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { listEmployees } from '../../api/accounts'
import { ApiError } from '../../api/client'
import { listCourses } from '../../api/courses'
import { assignGroup } from '../../api/matching'
import { listRefusedEmployees } from '../../api/mentors'
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

/** Which Learner each `learner_ids.N` key of a Learner 409 marks, by the list that was sent. */
function learnerMarks(errors: Record<string, string[]>, sent: number[]): ReadonlyMap<number, string> {
  const marks = new Map<number, string>()
  for (const [key, messages] of Object.entries(errors)) {
    const index = /^learner_ids\.(\d+)$/.exec(key)?.[1]
    const learnerId = index === undefined ? undefined : sent[Number(index)]
    if (learnerId !== undefined && messages.length > 0) {
      marks.set(learnerId, messages[0])
    }
  }
  return marks
}

const none: ReadonlySet<number> = new Set()

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
 * An Employee refused the Course at registration isn't offered as the chosen Employee. A refused
 * Assign creates nothing: the API's summary shows at the top of the card and each Learner it marks
 * gets its message under the checkbox, with no reason (AD-12).
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
  // The refused list belongs to the Course it was read for, so a stale one never filters another.
  const [refused, setRefused] = useState<{ courseId: string; ids: ReadonlySet<number> } | null>(null)
  const [refusedReads, setRefusedReads] = useState(0)
  const [summary, setSummary] = useState<string | null>(null)
  const [marks, setMarks] = useState<ReadonlyMap<number, string>>(new Map())
  const submittingRef = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const formHeadingId = useId()
  const createdHeadingId = useId()
  const learnersErrorId = useId()
  const markIdPrefix = useId()

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

  // Once a Course is picked, its refused Employees are dropped from the choice, and a chosen one is
  // cleared. If the read fails the list stays whole: the API still refuses them.
  useEffect(() => {
    if (courseId === '') {
      return
    }
    let current = true
    listRefusedEmployees(Number(courseId)).then(
      (rows) => {
        if (!current) {
          return
        }
        const ids = new Set(rows.map((row) => row.id))
        setRefused({ courseId, ids })
        setMentorId((chosenId) => (chosenId !== '' && ids.has(Number(chosenId)) ? '' : chosenId))
      },
      () => undefined,
    )
    return () => {
      current = false
    }
  }, [courseId, refusedReads])

  const employees = state.status === 'ready' ? state.choices.employees : []
  const refusedIds = refused !== null && refused.courseId === courseId ? refused.ids : none
  const mentors = employees.filter((employee) => !refusedIds.has(employee.id))
  const learners = mentorId === '' ? [] : employees.filter((employee) => String(employee.id) !== mentorId)
  // Only Learners still listed count: choosing a ticked Learner as the chosen Employee drops them.
  const chosen = learners.filter((learner) => ticked.has(learner.id)).map((learner) => learner.id)

  // A chosen-Employee refusal describes the earlier choice, so a new Course or Employee drops it.
  function clearMentorError() {
    setErrors((current) => {
      if (!('mentor_id' in current)) {
        return current
      }
      const rest = { ...current }
      delete rest.mentor_id
      return rest
    })
  }

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
    setSummary(null)
    setMarks(new Map())
    conflict.clear()
    const sent = chosen
    try {
      const assignment = await assignGroup({
        course_id: courseId === '' ? null : Number(courseId),
        mentor_id: Number(mentorId),
        learner_ids: sent,
      })
      setCreated(assignment)
      setCourseId('')
      setMentorId('')
      setTicked(new Set())
    } catch (caught) {
      const invalid = fieldErrors(caught)
      const code = caught instanceof ApiError && caught.status === 409 ? caught.code : undefined
      if (invalid) {
        setErrors(formErrors(invalid))
      } else if (caught instanceof ApiError && code === 'MATCHING_LEARNER_NOT_ASSIGNABLE') {
        setSummary(caught.message)
        setMarks(learnerMarks(caught.errors ?? {}, sent))
      } else if (caught instanceof ApiError && code === 'MATCHING_MENTOR_NOT_ELIGIBLE') {
        // Under the Chosen Employee select; the refused list is re-read, which clears the choice.
        setErrors({ mentor_id: caught.errors?.mentor_id?.[0] ?? caught.message })
        setRefusedReads((reads) => reads + 1)
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
              <p className="field-error group-assignment__summary" role="status">
                {summary}
              </p>
              <div className="group-assignment__fields">
                <SelectField
                  label={text.course}
                  name="course_id"
                  value={courseId}
                  options={state.choices.courses.map((course) => ({ id: course.id, label: course.title }))}
                  onChange={(value) => {
                    setCourseId(value)
                    setSummary(null)
                    setMarks(new Map())
                    clearMentorError()
                  }}
                  error={errors.course_id}
                />
                <SelectField
                  label={text.chosenEmployee}
                  name="mentor_id"
                  value={mentorId}
                  options={mentors.map((employee) => ({ id: employee.id, label: employee.name }))}
                  onChange={(value) => {
                    setMentorId(value)
                    clearMentorError()
                  }}
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
                    {learners.map((learner) => {
                      const mark = marks.get(learner.id)
                      const markId = `${markIdPrefix}-${learner.id}`
                      return (
                        <li key={learner.id}>
                          <label className="checkbox-row">
                            <input
                              type="checkbox"
                              checked={ticked.has(learner.id)}
                              onChange={(event) => toggle(learner.id, event.target.checked)}
                              aria-describedby={mark ? markId : undefined}
                              aria-invalid={mark ? true : undefined}
                            />
                            {learner.name}
                          </label>
                          {mark && (
                            <p className="field-error group-assignment__mark" id={markId}>
                              {mark}
                            </p>
                          )}
                        </li>
                      )
                    })}
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
