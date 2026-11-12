import type { RouteDef } from '../../app/router'
import { Home } from './Home'
import { SignIn } from './SignIn'
import { SignUp } from './SignUp'

export const accountsRoutes: RouteDef[] = [
  { path: '/sign-in', access: 'guest', layout: 'bare', Component: SignIn },
  { path: '/sign-up', access: 'guest', layout: 'bare', Component: SignUp },
  { path: '/home', access: 'employee', layout: 'employee', Component: Home },
]
