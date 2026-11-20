import { accountsRoutes } from '../features/accounts/routes'
import { assessmentsRoutes } from '../features/assessments/routes'
import { coursesRoutes } from '../features/courses/routes'
import { matchingRoutes } from '../features/matching/routes'
import { mentorsRoutes } from '../features/mentors/routes'
import { notificationsRoutes } from '../features/notifications/routes'
import { progressRoutes } from '../features/progress/routes'
import type { RouteDef } from './router'

/** Every page in the SPA; each feature owns its own list. */
export const routes: RouteDef[] = [...accountsRoutes, ...coursesRoutes, ...mentorsRoutes, ...matchingRoutes, ...notificationsRoutes, ...progressRoutes, ...assessmentsRoutes]
