// Courses resource types, hand-written to match the API's JsonResources (AD-10).

/** Derived by the API from `published_at` (AD-4). */
export type CourseStatus = 'draft' | 'published'

/** Every Course has exactly these three Stages, in this order. */
export type StageLevel = 'bronze' | 'silver' | 'gold'

/** App\Modules\Courses\Http\Resources\CourseListItemResource */
export type CourseListItem = {
  id: number
  title: string
  status: CourseStatus
}

/** An option of a question in the authoring read; `is_correct` is Admin-only (AD-14). */
export type QuestionOption = {
  id: number
  text: string
  is_correct: boolean
}

export type Question = {
  id: number
  text: string
  options: QuestionOption[]
}

export type Stage = {
  id: number
  level: StageLevel
  /** Null until Admin enters one. */
  pass_mark: number | null
  questions: Question[]
}

/** App\Modules\Courses\Http\Resources\CourseResource (the authoring read) */
export type Course = {
  id: number
  title: string
  description: string | null
  status: CourseStatus
  /** The API's completeness check of the saved Course; always false once published. */
  can_publish: boolean
  /** Bronze, Silver, Gold. */
  stages: Stage[]
}

/** POST /api/v1/admin/courses */
export type CreateCourseRequest = {
  title: string
  description: string | null
}

/**
 * PUT /api/v1/admin/courses/{id}: the whole draft at once. 422 keys follow this shape with dots,
 * e.g. `stages.0.questions.1.options.0.text` (AD-10).
 */
export type SaveCourseDraftRequest = {
  title: string
  description: string | null
  stages: {
    level: StageLevel
    /** Null when blank; text that isn't a whole number is sent as typed, for the API to refuse. */
    pass_mark: number | string | null
    questions: {
      text: string
      options: { text: string; is_correct: boolean }[]
    }[]
  }[]
}

/**
 * App\Modules\Courses\Http\Resources\PublishedCourseResource: GET /api/v1/courses and
 * /api/v1/courses/{id}. Employees get no Stage, question or answer data.
 */
export type PublishedCourse = {
  id: number
  title: string
  description: string | null
}
