import type { RouteDef } from '../../app/router'
import { GroupAssignment } from './GroupAssignment'
import { Match } from './Match'
import { Requests } from './Requests'

export const matchingRoutes: RouteDef[] = [
  { path: '/requests', access: 'employee', layout: 'employee', Component: Requests },
  { path: '/matches/:id', access: 'employee', layout: 'employee', Component: Match },
  { path: '/admin/group-assignments', access: 'admin', layout: 'admin', Component: GroupAssignment },
]
