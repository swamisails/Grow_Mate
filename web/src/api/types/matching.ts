export type RequestEligibility = { can_request: boolean }

/** A pending Request addressed to the signed-in Employee. The sentence is built from these fields. */
export type SingleIncomingRequest = {
  id: number
  learner_name: string
  course_title: string
}

/**
 * A group assignment's pending Requests, as one row: the Learners' names in Request order. `id` is
 * the group's first Request, which Accept posts.
 */
export type GroupIncomingRequest = {
  id: number
  learner_names: string[]
  course_title: string
}

/** One row on Requests; tell the two apart with `'learner_names' in row`. */
export type IncomingRequest = SingleIncomingRequest | GroupIncomingRequest

/** POST /api/v1/admin/group-assignments. 422 keys: `course_id`, `mentor_id`, `learner_ids` (or `learner_ids.N`). */
export type AssignGroupRequest = {
  /** Null when no Course is chosen, for the API to refuse with a 422. */
  course_id: number | null
  mentor_id: number
  learner_ids: number[]
}

/** App\Modules\Matching\Http\Resources\GroupAssignmentResource: the assignment just created, by name. */
export type GroupAssignment = {
  course_title: string
  mentor_name: string
  learner_names: string[]
  created_at: string
}

/** One Course the viewer is learning. `match_id` is set only while `in_progress`. */
export type LearningRow = {
  course_id: number
  course_title: string
  status: 'not_yet_started' | 'in_progress' | 'quit'
  match_id: number | null
}

/** One live Match the viewer mentors. */
export type MentoringRow = {
  id: number
  person_name: string
  course_title: string
}

export type HomeScreen = {
  learning: LearningRow[]
  mentoring: MentoringRow[]
}

/** The Match screen: the other person, the Course, and that Learner's bar. */
export type MatchScreen = {
  person_name: string
  course_title: string
  status: 'not_yet_started' | 'in_progress' | 'quit' | null
}
