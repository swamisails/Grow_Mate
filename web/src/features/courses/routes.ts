import type { RouteDef } from '../../app/router'
import { AdminCourses } from './AdminCourses'
import { CourseEditor } from './CourseEditor'

export const coursesRoutes: RouteDef[] = [
  { path: '/admin/courses', access: 'admin', layout: 'admin', Component: AdminCourses },
  { path: '/admin/courses/new', access: 'admin', layout: 'admin', Component: CourseEditor },
  { path: '/admin/courses/:id', access: 'admin', layout: 'admin', Component: CourseEditor },
]
