import { api, type Resource } from './client'
import type { Course, CourseListItem, CreateCourseRequest, SaveCourseDraftRequest } from './types/courses'

export async function listCourses(): Promise<CourseListItem[]> {
  const { data } = await api.get<Resource<CourseListItem[]>>('/api/v1/admin/courses')
  return data
}

export async function getCourse(id: number): Promise<Course> {
  const { data } = await api.get<Resource<Course>>(`/api/v1/admin/courses/${id}`)
  return data
}

export async function createCourse(course: CreateCourseRequest): Promise<Course> {
  const { data } = await api.post<Resource<Course>>('/api/v1/admin/courses', course)
  return data
}

export async function saveCourseDraft(id: number, draft: SaveCourseDraftRequest): Promise<Course> {
  const { data } = await api.put<Resource<Course>>(`/api/v1/admin/courses/${id}`, draft)
  return data
}
