import { api, type Resource } from './client'
import type { Assessment, AttemptResult, StageLevel, StageState, SubmitAttemptRequest } from './types/assessments'

/** The Stages the signed-in Learner has reached on a Course, in order; empty before Course Completed. */
export async function listStages(courseId: number): Promise<StageState[]> {
  const { data } = await api.get<Resource<StageState[]>>(`/api/v1/courses/${courseId}/stages`)
  return data
}

/** The Assessment of one Stage. A 409 means the Stage isn't available to the Learner; a 404, no such Course. */
export async function getAssessment(courseId: number, level: StageLevel): Promise<Assessment> {
  const { data } = await api.get<Resource<Assessment>>(`/api/v1/courses/${courseId}/stages/${level}/assessment`)
  return data
}

/** Submits one attempt; the API scores it. A 409 means the Stage isn't available any more. */
export async function submitAttempt(courseId: number, level: StageLevel, body: SubmitAttemptRequest): Promise<AttemptResult> {
  const { data } = await api.post<Resource<AttemptResult>>(`/api/v1/courses/${courseId}/stages/${level}/attempts`, body)
  return data
}
