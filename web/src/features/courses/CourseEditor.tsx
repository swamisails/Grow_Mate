import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { createCourse, getCourse, publishCourse, saveCourseDraft } from '../../api/courses'
import type { Course, SaveCourseDraftRequest, StageLevel } from '../../api/types/courses'
import { copy } from '../../app/copy'
import { ConflictMessage, fieldErrors, focusFirstInvalid, useConflict, type FieldErrors } from '../../app/forms'
import { PageHeader } from '../../app/PageHeader'
import { Loading, NotFound } from '../../app/PageStates'
import { useRouter } from '../../app/router'
import { PublishConfirmation } from './PublishConfirmation'

// The Course editor (EXPERIENCE.md, Component Patterns). Drafts are saved with Save only: no
// autosave and no optimistic update. After Save the editor re-fetches and shows the server state
// (AD-2). Inputs are named with the API's dot keys, so 422 messages land under their fields (AD-10).
// Publish acts on the saved Course: it is enabled only when the API says `can_publish`, nothing is
// unsaved and no request is pending. A published Course is shown read-only.

type DraftOption = { key: string; text: string; is_correct: boolean }
type DraftQuestion = { key: string; text: string; options: DraftOption[] }
type DraftStage = { level: StageLevel; passMark: string; questions: DraftQuestion[] }
type Draft = { title: string; description: string; stages: DraftStage[] }

/** React keys for rows that have no id yet (a save replaces every question and option). */
let lastKey = 0
function newKey(): string {
  lastKey += 1
  return `row-${lastKey}`
}

function emptyOption(): DraftOption {
  return { key: newKey(), text: '', is_correct: false }
}

function emptyQuestion(): DraftQuestion {
  return { key: newKey(), text: '', options: [emptyOption(), emptyOption()] }
}

function toDraft(course: Course): Draft {
  return {
    title: course.title,
    description: course.description ?? '',
    stages: course.stages.map((stage) => ({
      level: stage.level,
      passMark: stage.pass_mark === null ? '' : String(stage.pass_mark),
      questions: stage.questions.map((question) => ({
        key: newKey(),
        text: question.text,
        options: question.options.map((option) => ({ key: newKey(), text: option.text, is_correct: option.is_correct })),
      })),
    })),
  }
}

function toRequest(draft: Draft): SaveCourseDraftRequest {
  return {
    title: draft.title,
    description: draft.description,
    stages: draft.stages.map((stage) => ({
      level: stage.level,
      pass_mark: passMarkValue(stage.passMark),
      questions: stage.questions.map((question) => ({
        text: question.text,
        options: question.options.map((option) => ({ text: option.text, is_correct: option.is_correct })),
      })),
    })),
  }
}

/**
 * Blank saves as an incomplete draft (null), digits as a number; anything else goes as typed, so the
 * API refuses it under `stages.n.pass_mark` instead of it being silently dropped.
 */
function passMarkValue(raw: string): number | string | null {
  const text = raw.trim()
  if (text === '') {
    return null
  }
  return /^\d+$/.test(text) ? Number(text) : text
}

/** The API's dot keys for each control (AD-10). */
const names = {
  passMark: (s: number) => `stages.${s}.pass_mark`,
  questionText: (s: number, q: number) => `stages.${s}.questions.${q}.text`,
  options: (s: number, q: number) => `stages.${s}.questions.${q}.options`,
  optionText: (s: number, q: number, o: number) => `stages.${s}.questions.${q}.options.${o}.text`,
  /** The radio group's own name; not an API key (the API reports on `options`). */
  correct: (s: number, q: number) => `stages.${s}.questions.${q}.correct`,
}

/** Every key this form shows a message for; anything else is shown next to Save. */
function shownKeys(draft: Draft): Set<string> {
  const keys = new Set(['title', 'description'])
  draft.stages.forEach((stage, s) => {
    keys.add(names.passMark(s))
    stage.questions.forEach((question, q) => {
      keys.add(names.questionText(s, q))
      keys.add(names.options(s, q))
      question.options.forEach((_, o) => keys.add(names.optionText(s, q, o)))
    })
  })
  return keys
}

type FieldProps = {
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  multiline?: boolean
  /** `numeric` is a text input with a numeric keypad, so the raw text is kept (unlike `type="number"`). */
  type?: 'text' | 'numeric'
  className?: string
}

/** A labelled input with its 422 message below, linked by `aria-describedby`. */
function Field({ name, label, value, onChange, error, multiline, type = 'text', className }: FieldProps) {
  const id = useId()
  const errorId = useId()
  const shared = {
    id,
    name,
    value,
    placeholder: ' ',
    'aria-describedby': error ? errorId : undefined,
    'aria-invalid': error ? true : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
  }
  return (
    <div className={className ? `field ${className}` : 'field'}>
      {multiline ? (
        <textarea className="field__input field__input--multiline" rows={3} {...shared} />
      ) : type === 'numeric' ? (
        <input className="field__input" type="text" inputMode="numeric" {...shared} />
      ) : (
        <input className="field__input" type="text" {...shared} />
      )}
      <label className="field__label" htmlFor={id}>
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

/** Focus moves to the first invalid field once its message and aria links are rendered. */
function useFocusFirstInvalid(errors: FieldErrors) {
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (formRef.current && Object.keys(errors).length > 0) {
      focusFirstInvalid(formRef.current, errors)
    }
  }, [errors])
  return formRef
}

function SaveRow({ saving, message }: { saving: boolean; message: string | null }) {
  return (
    <div className="editor__actions">
      {message && (
        <p className="field-error" role="alert">
          {message}
        </p>
      )}
      <button type="submit" className="button button--primary" disabled={saving}>
        {copy.courseEditor.save}
      </button>
    </div>
  )
}

function CourseDetails({
  title,
  description,
  errors,
  onTitle,
  onDescription,
}: {
  title: string
  description: string
  errors: FieldErrors
  onTitle: (value: string) => void
  onDescription: (value: string) => void
}) {
  const headerId = useId()
  return (
    <section className="card" aria-labelledby={headerId}>
      <h2 className="card__header" id={headerId}>
        {copy.courseEditor.details}
      </h2>
      <div className="card__body editor__stack">
        <Field name="title" label={copy.courseEditor.title} value={title} onChange={onTitle} error={errors.title} />
        <Field
          name="description"
          label={copy.courseEditor.description}
          value={description}
          onChange={onDescription}
          error={errors.description}
          multiline
        />
      </div>
    </section>
  )
}

/** `/admin/courses/new`: title and description; Save creates the Course and opens its editor. */
function NewCourse() {
  const { navigate } = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const formRef = useFocusFirstInvalid(errors)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    setFormError(null)
    try {
      const course = await createCourse({ title, description })
      // The editor loads the created Course from the server; Back goes to Admin Courses, not a blank form.
      navigate(`/admin/courses/${course.id}`, { replace: true })
    } catch (caught) {
      const invalid = fieldErrors(caught)
      if (invalid) {
        setErrors(invalid)
      } else {
        setFormError(caught instanceof ApiError ? caught.message : copy.errors.generic)
      }
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title={copy.courseEditor.newTitle} icon="edit" />
      <form className="editor" ref={formRef} onSubmit={handleSubmit} noValidate>
        <CourseDetails
          title={title}
          description={description}
          errors={errors}
          onTitle={setTitle}
          onDescription={setDescription}
        />
        <SaveRow saving={saving} message={formError} />
      </form>
    </>
  )
}

type StageCardProps = {
  stage: DraftStage
  index: number
  errors: FieldErrors
  onChange: (update: (stage: DraftStage) => DraftStage) => void
  /** Adding or removing a row renumbers the keys, so old messages would land on the wrong rows. */
  onStructureChange: (update: (stage: DraftStage) => DraftStage) => void
}

function StageCard({ stage, index: s, errors, onChange, onStructureChange }: StageCardProps) {
  const headerId = useId()
  const optionsErrorId = useId()
  const c = copy.courseEditor

  const updateQuestion = (q: number, update: (question: DraftQuestion) => DraftQuestion) => (current: DraftStage) => ({
    ...current,
    questions: current.questions.map((question, i) => (i === q ? update(question) : question)),
  })

  return (
    <section className="card" aria-labelledby={headerId}>
      <h2 className="card__header" id={headerId}>
        {c.stages[stage.level]}
      </h2>
      <div className="card__body editor__stack">
        <Field
          name={names.passMark(s)}
          label={c.passMark}
          type="numeric"
          className="field--narrow"
          value={stage.passMark}
          onChange={(passMark) => onChange((current) => ({ ...current, passMark }))}
          error={errors[names.passMark(s)]}
        />
        {stage.questions.map((question, q) => {
          const optionsError = errors[names.options(s, q)]
          const groupErrorId = `${optionsErrorId}-${q}`
          return (
            <fieldset className="question" key={question.key}>
              <legend className="question__legend">{c.question(q + 1)}</legend>
              <Field
                name={names.questionText(s, q)}
                label={c.questionText}
                value={question.text}
                multiline
                onChange={(text) => onChange(updateQuestion(q, (current) => ({ ...current, text })))}
                error={errors[names.questionText(s, q)]}
              />
              <fieldset className="options" name={names.options(s, q)} aria-describedby={optionsError ? groupErrorId : undefined}>
                <legend className="options__legend">{c.options}</legend>
                {question.options.map((option, o) => (
                  <div className="option-row" key={option.key}>
                    <Field
                      name={names.optionText(s, q, o)}
                      label={c.option(o + 1)}
                      value={option.text}
                      onChange={(text) =>
                        onChange(
                          updateQuestion(q, (current) => ({
                            ...current,
                            options: current.options.map((item, i) => (i === o ? { ...item, text } : item)),
                          })),
                        )
                      }
                      error={errors[names.optionText(s, q, o)]}
                    />
                    <label className="option-row__correct">
                      <input
                        type="radio"
                        name={names.correct(s, q)}
                        checked={option.is_correct}
                        aria-label={c.correctFor(o + 1)}
                        onChange={() =>
                          onChange(
                            updateQuestion(q, (current) => ({
                              ...current,
                              options: current.options.map((item, i) => ({ ...item, is_correct: i === o })),
                            })),
                          )
                        }
                      />
                      {c.correct}
                    </label>
                    <button
                      type="button"
                      className="button button--secondary"
                      aria-label={c.removeOptionFor(o + 1)}
                      onClick={() =>
                        onStructureChange(
                          updateQuestion(q, (current) => ({
                            ...current,
                            options: current.options.filter((_, i) => i !== o),
                          })),
                        )
                      }
                    >
                      {c.removeOption}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button button--secondary"
                  aria-label={c.addOptionFor(q + 1)}
                  onClick={() =>
                    onStructureChange(
                      updateQuestion(q, (current) => ({ ...current, options: [...current.options, emptyOption()] })),
                    )
                  }
                >
                  {c.addOption}
                </button>
                {optionsError && (
                  <p className="field-error" id={groupErrorId}>
                    {optionsError}
                  </p>
                )}
              </fieldset>
              <button
                type="button"
                className="button button--secondary"
                aria-label={c.removeQuestionFor(q + 1)}
                onClick={() =>
                  onStructureChange((current) => ({
                    ...current,
                    questions: current.questions.filter((_, i) => i !== q),
                  }))
                }
              >
                {c.removeQuestion}
              </button>
            </fieldset>
          )
        })}
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onStructureChange((current) => ({ ...current, questions: [...current.questions, emptyQuestion()] }))}
        >
          {c.addQuestion}
        </button>
      </div>
    </section>
  )
}

/** A published Course is frozen (AD-14): its saved content as text, with no controls. */
function PublishedCourse({ course }: { course: Course }) {
  const c = copy.courseEditor
  return (
    <div className="editor">
      <ReadOnlyCard title={c.details}>
        <ReadOnlyValue label={c.title} value={course.title} />
        {course.description && <ReadOnlyValue label={c.description} value={course.description} />}
      </ReadOnlyCard>
      {course.stages.map((stage) => (
        <ReadOnlyCard key={stage.id} title={c.stages[stage.level]}>
          <ReadOnlyValue label={c.passMark} value={String(stage.pass_mark ?? '')} />
          {stage.questions.map((question, q) => (
            <div key={question.id}>
              <ReadOnlyValue label={c.question(q + 1)} value={question.text} />
              <ul className="editor__options">
                {question.options.map((option) => (
                  <li key={option.id}>
                    {option.text}
                    {option.is_correct && <span className="meta"> {c.correctTag}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </ReadOnlyCard>
      ))}
    </div>
  )
}

function ReadOnlyCard({ title, children }: { title: string; children: ReactNode }) {
  const headerId = useId()
  return (
    <section className="card" aria-labelledby={headerId}>
      <h2 className="card__header" id={headerId}>
        {title}
      </h2>
      <div className="card__body editor__stack">{children}</div>
    </section>
  )
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="meta">{label}</p>
      <p className="editor__value preserve-lines">{value}</p>
    </div>
  )
}

type LoadState = { status: 'loading' } | { status: 'notFound' } | { status: 'error' } | { status: 'ready'; course: Course }

/** `/admin/courses/:id`: the whole draft, saved as one document. */
function EditCourse({ id }: { id: number }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [savedDocument, setSavedDocument] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const formRef = useFocusFirstInvalid(errors)
  const [confirming, setConfirming] = useState(false)
  // After a successful Publish the header button is gone, so focus moves to the page title.
  const [justPublished, setJustPublished] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)

  // Shows the server's state of the Course, replacing whatever was being edited.
  const show = useCallback((course: Course) => {
    setState({ status: 'ready', course })
    const nextDraft = toDraft(course)
    setDraft(nextDraft)
    setSavedDocument(JSON.stringify(toRequest(nextDraft)))
  }, [])

  const showLoadError = useCallback((caught: unknown) => {
    // A missing Course and a forbidden one look the same.
    if (caught instanceof ApiError && (caught.status === 404 || caught.status === 403)) {
      setState({ status: 'notFound' })
    } else {
      setState({ status: 'error' })
    }
  }, [])

  const refetch = useCallback(async () => {
    setSaving(true)
    await getCourse(id).then(show, showLoadError)
    setSaving(false)
  }, [id, show, showLoadError])
  const conflict = useConflict(refetch)

  const published = state.status === 'ready' && state.course.status === 'published'
  useEffect(() => {
    if (justPublished && published) {
      titleRef.current?.focus()
    }
  }, [justPublished, published])

  useEffect(() => {
    let current = true
    getCourse(id).then(
      (course) => current && show(course),
      (caught: unknown) => current && showLoadError(caught),
    )
    return () => {
      current = false
    }
  }, [id, show, showLoadError])

  if (state.status === 'notFound') {
    return <NotFound />
  }
  if (state.status !== 'ready' || !draft) {
    return (
      <>
        <PageHeader title={copy.courseEditor.pageName} icon="edit" />
        {state.status === 'error' ? (
          <p className="field-error" role="alert">
            {copy.errors.generic}
          </p>
        ) : (
          <Loading />
        )}
      </>
    )
  }

  const editStage = (s: number, clearErrors: boolean) => (update: (stage: DraftStage) => DraftStage) => {
    setDraft((current) =>
      current && { ...current, stages: current.stages.map((stage, i) => (i === s ? update(stage) : stage)) },
    )
    if (clearErrors) {
      setErrors({})
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft || saving || state.status !== 'ready' || state.course.status === 'published') {
      return
    }
    setSaving(true)
    setErrors({})
    setFormError(null)
    conflict.clear()
    try {
      await saveCourseDraft(id, toRequest(draft))
    } catch (caught) {
      if (conflict.handle(caught)) {
        return
      }
      const invalid = fieldErrors(caught)
      if (invalid) {
        setErrors(invalid)
      } else if (caught instanceof ApiError && (caught.status === 404 || caught.status === 403)) {
        setState({ status: 'notFound' })
      } else {
        setFormError(caught instanceof ApiError ? caught.message : copy.errors.generic)
      }
      setSaving(false)
      return
    }
    // AD-2: re-fetch and show what the server now holds, never what was sent.
    await refetch()
  }

  // Publish acts on saved content only (AD-2: `can_publish` describes what the server holds).
  const dirty = JSON.stringify(toRequest(draft)) !== savedDocument
  const canPublish = state.course.can_publish && !dirty && !saving

  async function handlePublish() {
    setConfirming(false)
    if (!canPublish) {
      return
    }
    setSaving(true)
    setFormError(null)
    conflict.clear()
    try {
      await publishCourse(id)
      setJustPublished(true)
      await refetch()
    } catch (caught) {
      // A 409 (incomplete, or already published) shows the API message and re-fetches.
      if (conflict.handle(caught)) {
        return
      }
      if (caught instanceof ApiError && (caught.status === 403 || caught.status === 404)) {
        setState({ status: 'notFound' })
      } else {
        setFormError(caught instanceof ApiError ? caught.message : copy.errors.generic)
      }
      setSaving(false)
    }
  }

  if (state.course.status === 'published') {
    return (
      <>
        <PageHeader
          title={state.course.title}
          icon="edit"
          tag={<span className="tag">{copy.courseStatus.published}</span>}
          titleRef={justPublished ? titleRef : undefined}
        />
        <ConflictMessage message={conflict.message} />
        <PublishedCourse course={state.course} />
      </>
    )
  }

  // A message for a key that has no control here (e.g. `stages`) still reaches Admin, next to Save.
  const shown = shownKeys(draft)
  const unshown = Object.entries(errors).find(([key]) => !shown.has(key))?.[1] ?? null

  return (
    <>
      <PageHeader
        title={state.course.title}
        icon="edit"
        action={
          <button
            type="button"
            className="button button--primary"
            disabled={!canPublish}
            onClick={() => setConfirming(true)}
          >
            {copy.courseEditor.publish}
          </button>
        }
      />
      <ConflictMessage message={conflict.message} />
      {confirming && <PublishConfirmation onCancel={() => setConfirming(false)} onConfirm={handlePublish} />}
      <form className="editor" ref={formRef} onSubmit={handleSubmit} noValidate>
        {/* No edits while a request is pending: the re-fetch would replace them. */}
        <fieldset className="editor__fields" disabled={saving}>
          <CourseDetails
            title={draft.title}
            description={draft.description}
            errors={errors}
            onTitle={(title) => setDraft({ ...draft, title })}
            onDescription={(description) => setDraft({ ...draft, description })}
          />
          {draft.stages.map((stage, s) => (
            <StageCard
              key={stage.level}
              stage={stage}
              index={s}
              errors={errors}
              onChange={editStage(s, false)}
              onStructureChange={editStage(s, true)}
            />
          ))}
        </fieldset>
        <SaveRow saving={saving} message={formError ?? unshown} />
      </form>
    </>
  )
}

/** Course editor: `/admin/courses/new`, or `/admin/courses/:id` for an existing Course. */
export function CourseEditor() {
  const { params } = useRouter()

  if (params.id === undefined) {
    return <NewCourse />
  }
  // A Course id that isn't a number is Not found, the same as a missing Course.
  const id = /^\d+$/.test(params.id) ? Number(params.id) : NaN
  if (!Number.isSafeInteger(id)) {
    return <NotFound />
  }
  return <EditCourse id={id} />
}
