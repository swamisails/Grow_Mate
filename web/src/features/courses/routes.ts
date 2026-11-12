import type { RouteDef } from '../../app/router'
import { AdminCourses } from './AdminCourses'

export const coursesRoutes: RouteDef[] = [
  { path: '/admin/courses', access: 'admin', layout: 'admin', Component: AdminCourses },
]
