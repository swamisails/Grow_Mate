/** A Learner's Progress status on one Course. Null means there is no bar. */
export type CourseProgress = {
  status: 'not_yet_started' | 'in_progress' | 'quit' | null
}

/** One Upskilling row: who is In progress on which Course. Names and status only (C4, C6). */
export type UpskillingRow = {
  person_name: string
  course_title: string
  status: 'in_progress'
}
