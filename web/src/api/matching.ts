import { api, type Resource } from './client'
import type {
  AssignGroupRequest,
  GroupAssignment,
  HomeScreen,
  IncomingRequest,
  MatchScreen,
  RequestEligibility,
} from './types/matching'

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

/** Home's Learning and Mentoring lists for the signed-in Employee. */
export async function getHome(): Promise<HomeScreen> {
  const { data } = await api.get<Resource<HomeScreen>>('/api/v1/home')
  return data
}

/** One Match for a party. A 404 means it is missing or the viewer is neither party. */
export async function getMatch(id: number): Promise<MatchScreen> {
  const { data } = await api.get<Resource<MatchScreen>>(`/api/v1/matches/${id}`)
  return data
}

/** Either party quits a live Match with a reason. A 404 means it is gone or the viewer is neither party; a 422 keys `reason`. */
export async function quitMatch(id: number, reason: string): Promise<void> {
  await api.post(`/api/v1/matches/${id}/quit`, { reason })
}

/** Admin: assigns Learners to a chosen Employee on a Course. A 409 means the Course isn't published. */
export async function assignGroup(assignment: AssignGroupRequest): Promise<GroupAssignment> {
  const { data } = await api.post<Resource<GroupAssignment>>('/api/v1/admin/group-assignments', assignment)
  return data
}
