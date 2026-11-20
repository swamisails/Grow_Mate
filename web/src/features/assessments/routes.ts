import type { RouteDef } from '../../app/router'
import { AssessmentPage } from './AssessmentPage'

export const assessmentsRoutes: RouteDef[] = [
  { path: '/courses/:id/stages/:stage', access: 'employee', layout: 'employee', Component: AssessmentPage },
]
