import { api, type Resource } from './client'
import type { CourseMentor } from './types/mentors'

/** A published Course's Mentors, by name, without the viewer; a draft or missing Course is a 404. */
export async function listCourseMentors(courseId: number): Promise<CourseMentor[]> {
  const { data } = await api.get<Resource<CourseMentor[]>>(`/api/v1/courses/${courseId}/mentors`)
  return data
}
