import { api, type Resource } from './client'
import type { Course, CourseListItem, CreateCourseRequest, PublishedCourse, SaveCourseDraftRequest } from './types/courses'

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

/** Publishes the saved Course; a 409 means it is incomplete or already published. */
export async function publishCourse(id: number): Promise<Course> {
  const { data } = await api.post<Resource<Course>>(`/api/v1/admin/courses/${id}/publish`, {})
  return data
}

/** Employee Courses: published Courses only. */
export async function listPublishedCourses(): Promise<PublishedCourse[]> {
  const { data } = await api.get<Resource<PublishedCourse[]>>('/api/v1/courses')
  return data
}

/** One published Course; a draft or missing one is a 404. */
export async function getPublishedCourse(id: number): Promise<PublishedCourse> {
  const { data } = await api.get<Resource<PublishedCourse>>(`/api/v1/courses/${id}`)
  return data
}
