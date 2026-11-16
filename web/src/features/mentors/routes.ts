import type { RouteDef } from '../../app/router'
import { MentorCheck } from './MentorCheck'
import { RegistrationDecisions } from './RegistrationDecisions'

export const mentorsRoutes: RouteDef[] = [
  { path: '/mentor-check', access: 'employee', layout: 'employee-step', Component: MentorCheck },
  { path: '/admin/registration-decisions', access: 'admin', layout: 'admin', Component: RegistrationDecisions },
]
