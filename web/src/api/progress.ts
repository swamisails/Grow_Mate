import { api, type Resource } from './client'
import type { CourseProgress, UpskillingRow } from './types/progress'

/** The signed-in Learner's Progress status on a Course, or null when there is none. */
export async function getCourseProgress(courseId: number): Promise<CourseProgress> {
  const { data } = await api.get<Resource<CourseProgress>>(`/api/v1/courses/${courseId}/progress`)
  return data
}

/** Everyone In progress on a Course, sorted by the API; open to any signed-in user, Admin included. */
export async function listUpskilling(): Promise<UpskillingRow[]> {
  const { data } = await api.get<Resource<UpskillingRow[]>>('/api/v1/upskilling')
  return data
}
