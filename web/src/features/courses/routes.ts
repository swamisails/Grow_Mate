import type { RouteDef } from '../../app/router'
import { EmployeeCourses } from './EmployeeCourses'
import { CoursePage } from './CoursePage'
import { AdminCourses } from './AdminCourses'
import { CourseEditor } from './CourseEditor'

export const coursesRoutes: RouteDef[] = [
  { path: '/courses', access: 'employee', layout: 'employee', Component: EmployeeCourses },
  { path: '/courses/:id', access: 'employee', layout: 'employee', Component: CoursePage },
  { path: '/admin/courses', access: 'admin', layout: 'admin', Component: AdminCourses },
  { path: '/admin/courses/new', access: 'admin', layout: 'admin', Component: CourseEditor },
  { path: '/admin/courses/:id', access: 'admin', layout: 'admin', Component: CourseEditor },
]
