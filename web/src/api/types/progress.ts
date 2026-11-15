/** A Learner's Progress status on one Course. Null means there is no bar. */
export type CourseProgress = {
  status: 'not_yet_started' | 'in_progress' | null
}
