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
