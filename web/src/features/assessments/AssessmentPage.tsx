import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { getAssessment, submitAttempt } from '../../api/assessments'
import { ApiError } from '../../api/client'
import type { Assessment, StageLevel } from '../../api/types/assessments'
import { copy } from '../../app/copy'
import { ConflictMessage } from '../../app/forms'
import { PageHeader } from '../../app/PageHeader'
import { Loading, NotFound } from '../../app/PageStates'
import { Link } from '../../app/Router'
import { useRouter } from '../../app/router'

type LoadState =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'error' }
  | { status: 'refused' }
  | { status: 'ready'; assessment: Assessment }
  | { status: 'result'; assessment: Assessment; passed: boolean }

const levels: readonly StageLevel[] = ['bronze', 'silver', 'gold']

function isLevel(value: string | undefined): value is StageLevel {
  return levels.includes(value as StageLevel)
}

/**
 * One Stage's Assessment: every question on one page in authored order, one radio group each, then
 * Submit answers, enabled only once every question has an answer. The result ("Passed." or "Not
 * passed.") replaces the form at the same URL. Leaving before Submit uses no attempt. A 409 (the
 * Stage isn't available) shows the API's message; a draft or missing Course shows Not found.
 */
export function AssessmentPage() {
  const { params } = useRouter()
  const id = /^\d+$/.test(params.id ?? '') ? Number(params.id) : NaN
  const level = isLevel(params.stage) ? params.stage : null
  const valid = Number.isSafeInteger(id) && level !== null
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [refusal, setRefusal] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState(false)
  const [sending, setSending] = useState(false)
  const sendingRef = useRef(false)
  const resultRef = useRef<HTMLParagraphElement>(null)
  // Only the latest read is applied.
  const readRef = useRef(0)

  const read = useCallback(() => {
    if (!valid || level === null) {
      return
    }
    const current = ++readRef.current
    getAssessment(id, level).then(
      (assessment) => {
        if (current === readRef.current) {
          setRefusal(null)
          setAnswers({})
          setState({ status: 'ready', assessment })
        }
      },
      (caught: unknown) => {
        if (current !== readRef.current) {
          return
        }
        if (caught instanceof ApiError && caught.status === 409) {
          setRefusal(caught.message)
          setState({ status: 'refused' })
          return
        }
        // A hidden Course and a forbidden one look the same.
        const hidden = caught instanceof ApiError && (caught.status === 403 || caught.status === 404)
        setState({ status: hidden ? 'notFound' : 'error' })
      },
    )
  }, [id, level, valid])

  // A new Course or Stage starts a new read, and the earlier one's answer is dropped.
  useEffect(() => read(), [read])

  useEffect(() => {
    if (state.status === 'result') {
      resultRef.current?.focus()
    }
  }, [state.status])

  if (!valid || state.status === 'notFound') {
    return <NotFound />
  }

  const assessment = state.status === 'ready' || state.status === 'result' ? state.assessment : null
  const title = assessment ? copy.assessments.title(assessment.course.title, copy.assessments.level[assessment.level]) : copy.assessments.pageName
  const allAnswered = state.status === 'ready' && state.assessment.questions.every((question) => answers[question.id] !== undefined)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state.status !== 'ready' || !allAnswered || sendingRef.current || level === null) {
      return
    }
    const taken = state.assessment
    sendingRef.current = true
    setSending(true)
    setSubmitError(false)
    try {
      const result = await submitAttempt(id, level, {
        answers: taken.questions.map((question) => ({ question_id: question.id, option_id: answers[question.id] })),
      })
      setState({ status: 'result', assessment: taken, passed: result.passed })
    } catch (caught: unknown) {
      if (caught instanceof ApiError && caught.status === 409) {
        // The server state has changed: keep its message and read the Stage again.
        setRefusal(caught.message)
        read()
      } else if (caught instanceof ApiError && (caught.status === 403 || caught.status === 404)) {
        setState({ status: 'notFound' })
      } else {
        setSubmitError(true)
      }
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  return (
    <>
      <PageHeader title={title} icon="quiz" />
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <p className="field-error" role="alert">
          {copy.errors.generic}
        </p>
      )}
      {state.status === 'ready' && (
        <form className="assessment" onSubmit={onSubmit} noValidate>
          {state.assessment.questions.map((question, index) => (
            <fieldset className="card assessment__question" key={question.id}>
              <legend className="assessment__legend">{copy.assessments.question(index + 1, question.text)}</legend>
              <div className="assessment__options">
                {question.options.map((option) => (
                  <label className="assessment__option" key={option.id}>
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option.id}
                      checked={answers[question.id] === option.id}
                      onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                    />
                    {option.text}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {submitError && (
            <p className="field-error" role="alert">
              {copy.errors.generic}
            </p>
          )}
          <div className="assessment__actions">
            <button type="submit" className="button button--primary" disabled={!allAnswered || sending}>
              {copy.assessments.submit}
            </button>
          </div>
        </form>
      )}
      <ConflictMessage message={refusal} />
      {state.status === 'refused' && (
        <p>
          <Link to={`/courses/${id}`}>{copy.assessments.backToCourse}</Link>
        </p>
      )}
      {state.status === 'result' && (
        <section className="card assessment-result">
          <div className="assessment-result__body">
            <p className="assessment-result__sentence" role="status" tabIndex={-1} ref={resultRef}>
              {state.passed ? copy.assessments.result.passed : copy.assessments.result.notPassed}
            </p>
            <Link to={`/courses/${id}`} className="button button--secondary">
              {copy.assessments.backTo(state.assessment.course.title)}
            </Link>
          </div>
        </section>
      )}
    </>
  )
}
