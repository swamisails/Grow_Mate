import { api, type Resource } from './client'
import type { IncomingRequest, RequestEligibility } from './types/matching'

/** Whether the signed-in Learner may send a Request on this Course. */
export async function getRequestEligibility(courseId: number): Promise<RequestEligibility> {
  const { data } = await api.get<Resource<RequestEligibility>>(`/api/v1/courses/${courseId}/request-eligibility`)
  return data
}

/** Sends one Request to a Mentor of the Course. A 409 means one is already open. */
export async function sendRequest(courseId: number, mentorId: number): Promise<void> {
  await api.post(`/api/v1/courses/${courseId}/requests`, { mentor_id: mentorId })
}

/** Pending Requests addressed to the signed-in Employee, in the API's order. */
export async function listRequests(): Promise<IncomingRequest[]> {
  const { data } = await api.get<Resource<IncomingRequest[]>>('/api/v1/requests')
  return data
}

/** Accepts one Request. A 404 means it can no longer be Accepted. */
export async function acceptRequest(requestId: number): Promise<void> {
  await api.post(`/api/v1/requests/${requestId}/accept`)
}
