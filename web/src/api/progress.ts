import { api, type Resource } from './client'
import type { CourseProgress } from './types/progress'

/** The signed-in Learner's Progress status on a Course, or null when there is none. */
export async function getCourseProgress(courseId: number): Promise<CourseProgress> {
  const { data } = await api.get<Resource<CourseProgress>>(`/api/v1/courses/${courseId}/progress`)
  return data
}
