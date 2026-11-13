// Mentors resource types, hand-written to match the API's JsonResources (AD-10).

/**
 * App\Modules\Mentors\Http\Resources\CourseMentorResource: GET /api/v1/courses/{id}/mentors.
 * Never carries how the Mentor qualified (AD-8).
 */
export type CourseMentor = {
  id: number
  name: string
}
