import type { RouteDef } from '../../app/router'
import { SignIn } from './SignIn'

export const accountsRoutes: RouteDef[] = [{ path: '/sign-in', access: 'guest', layout: 'bare', Component: SignIn }]
