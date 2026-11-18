export type RequestEligibility = { can_request: boolean }

/** A pending Request addressed to the signed-in Employee. The sentence is built from these fields. */
export type IncomingRequest = {
  id: number
  learner_name: string
  course_title: string
}
