import type { RouteDef } from '../../app/router'
import { MentorCheck } from './MentorCheck'

export const mentorsRoutes: RouteDef[] = [
  { path: '/mentor-check', access: 'employee', layout: 'employee-step', Component: MentorCheck },
]
