import type { RouteDef } from '../../app/router'
import { Requests } from './Requests'

export const matchingRoutes: RouteDef[] = [
  { path: '/requests', access: 'employee', layout: 'employee', Component: Requests },
]
