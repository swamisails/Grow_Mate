import { accountsRoutes } from '../features/accounts/routes'
import { coursesRoutes } from '../features/courses/routes'
import { mentorsRoutes } from '../features/mentors/routes'
import type { RouteDef } from './router'

/** Every page in the SPA; each feature owns its own list. */
export const routes: RouteDef[] = [...accountsRoutes, ...coursesRoutes, ...mentorsRoutes]
