// Mentors resource types, hand-written to match the API's JsonResources (AD-10).

/**
 * App\Modules\Mentors\Http\Resources\CourseMentorResource: GET /api/v1/courses/{id}/mentors.
 * Never carries how the Mentor qualified (AD-8).
 */
export type CourseMentor = {
  id: number
  name: string
}

/** A Course the Employee may name in the Mentor check: published before their account was created. */
export type MentorCheckCourse = {
  id: number
  title: string
}

/**
 * App\Modules\Mentors\Http\Resources\MentorCheckResource: GET and POST /api/v1/mentor-check.
 * `courses` is empty once the check is done.
 */
export type MentorCheck = {
  pending: boolean
  courses: MentorCheckCourse[]
}

/** POST /api/v1/mentor-check: one or more distinct Course ids, or a skip; never both. */
export type SubmitMentorCheckRequest = { course_ids: number[] } | { skip: true }

/** Admin's final Registration decision on one Mentor-check Course (R3). */
export type Outcome = 'approved' | 'refused'

/**
 * App\Modules\Mentors\Http\Resources\RegistrationDecisionRowResource: GET /api/v1/admin/registration-decisions.
 * `id` is the Mentor-check Course row; `outcome` is null until it is decided. Never carries a route (AD-8).
 */
export type RegistrationDecisionRow = {
  id: number
  employee_name: string
  course_title: string
  outcome: Outcome | null
}

/**
 * App\Modules\Mentors\Http\Resources\RegistrationDecisionResource: POST
 * /api/v1/admin/registration-decisions/{id}/approve and .../refuse.
 */
export type RegistrationDecision = {
  id: number
  outcome: Outcome
}
