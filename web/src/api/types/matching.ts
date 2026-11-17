export type RequestEligibility = { can_request: boolean }

/** A pending Request addressed to the signed-in Employee. The sentence is built from these fields. */
export type IncomingRequest = {
  id: number
  learner_name: string
  course_title: string
}

/** One Course the viewer is learning. `match_id` is set only while `in_progress`. */
export type LearningRow = {
  course_id: number
  course_title: string
  status: 'not_yet_started' | 'in_progress'
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
  status: 'not_yet_started' | 'in_progress' | null
}
