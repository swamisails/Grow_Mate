import type { RouteDef } from '../../app/router'
import { Notices } from './Notices'

export const notificationsRoutes: RouteDef[] = [{ path: '/notices', access: 'employee', layout: 'employee', Component: Notices }]
