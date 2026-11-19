import type { RouteDef } from '../../app/router'
import { Upskilling } from './Upskilling'

export const progressRoutes: RouteDef[] = [{ path: '/upskilling', access: 'user', layout: 'user', Component: Upskilling }]
