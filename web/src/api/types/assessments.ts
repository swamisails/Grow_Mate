/** A Stage's level, in the order Stages are taken. */
export type StageLevel = 'bronze' | 'silver' | 'gold'

/**
 * App\Modules\Assessments\Http\Resources\StageStateResource: one Stage the Learner has reached.
 * A Stage not reached is not in the list. A Locked Stage carries `locked_until` (ISO-8601 UTC).
 */
export type StageState =
  | {
      level: StageLevel
      state: 'available' | 'passed'
    }
  | {
      level: StageLevel
      state: 'locked'
      locked_until: string
    }

/** One option of a question, in authored order. Never says whether it is correct (AD-14). */
export type AssessmentOption = {
  id: number
  text: string
}

export type AssessmentQuestion = {
  id: number
  text: string
  options: AssessmentOption[]
}

/** App\Modules\Assessments\Http\Resources\AssessmentResource: the Assessment to take. */
export type Assessment = {
  course: { id: number; title: string }
  level: StageLevel
  questions: AssessmentQuestion[]
}

/** POST /api/v1/courses/{course}/stages/{stage}/attempts: one answer per question, as an ordered list. */
export type SubmitAttemptRequest = {
  answers: { question_id: number; option_id: number }[]
}

/** App\Modules\Assessments\Http\Resources\AttemptResultResource: the result, and nothing else. */
export type AttemptResult = {
  passed: boolean
}
