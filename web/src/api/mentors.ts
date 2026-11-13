import { api, type Resource } from './client'
import type { CourseMentor, MentorCheck, SubmitMentorCheckRequest } from './types/mentors'

/** A published Course's Mentors, by name, without the viewer; a draft or missing Course is a 404. */
export async function listCourseMentors(courseId: number): Promise<CourseMentor[]> {
  const { data } = await api.get<Resource<CourseMentor[]>>(`/api/v1/courses/${courseId}/mentors`)
  return data
}

/** The signed-in Employee's Mentor check: pending, with the Courses they may name, or done. */
export async function getMentorCheck(): Promise<MentorCheck> {
  const { data } = await api.get<Resource<MentorCheck>>('/api/v1/mentor-check')
  return data
}

/** Submits or skips the Mentor check, once; a 409 means it is already done or a Course can't be named. */
export async function submitMentorCheck(submission: SubmitMentorCheckRequest): Promise<MentorCheck> {
  const { data } = await api.post<Resource<MentorCheck>>('/api/v1/mentor-check', submission)
  return data
}
