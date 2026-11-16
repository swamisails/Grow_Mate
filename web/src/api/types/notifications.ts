// Notifications resource types, hand-written to match the API's JsonResources (AD-10).

import type { Outcome } from './mentors'

/** The closed set of notice types (AD-11); only Registration decisions so far. */
export type NoticeType = 'registration_decision'

/** Fields every notice carries: a string id, its type and when it happened (ISO-8601 UTC with `Z`). */
type NoticeBase = {
  id: string
  occurred_at: string
}

/** Admin's Registration decision on a Course the Employee named in their Mentor check (R3). No route (AD-8). */
export type RegistrationDecisionNotice = NoticeBase & {
  type: 'registration_decision'
  course_title: string
  outcome: Outcome
}

/**
 * App\Modules\Notifications\Http\Resources\NoticeResource: GET /api/v1/notices, newest first.
 * No read state, count or link.
 */
export type Notice = RegistrationDecisionNotice
