// Notifications resource types, hand-written to match the API's JsonResources (AD-10).

import type { Outcome } from './mentors'

/** The closed set of notice types (AD-11). Day-3 and day-6 rows are derived, never stored. */
export type NoticeType =
  | 'registration_decision'
  | 'request_sent'
  | 'request_accepted'
  | 'match_quit'
  | 'request_reminder_day3'
  | 'request_cancelled_day6'

/** Which sentence a derived Request notice uses. `person_name` is the other person. */
export type NoticeParty = 'learner' | 'mentor'

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

/** A derived Request notice. `party` picks the sentence; names and the Course title are text. No route (AD-8). */
export type RequestTimeNotice = NoticeBase & {
  type: 'request_reminder_day3' | 'request_cancelled_day6'
  party: NoticeParty
  person_name: string
  course_title: string
}

/**
 * A stored Request notice. `person_name` is the other person's account name. No route (AD-8).
 * `request_sent` is the Mentor's; `request_accepted` is the Learner's.
 */
export type RequestEventNotice = NoticeBase & {
  type: 'request_sent' | 'request_accepted'
  person_name: string
  course_title: string
}

/** The Quit note, to the other party. `person_name` is who quit; `reason` is user text, rendered as text. */
export type MatchQuitNotice = NoticeBase & {
  type: 'match_quit'
  person_name: string
  course_title: string
  reason: string
}

/**
 * App\Modules\Notifications\Http\Resources\NoticeResource: GET /api/v1/notices, newest first.
 * No read state, count or link.
 */
export type Notice = RegistrationDecisionNotice | RequestTimeNotice | RequestEventNotice | MatchQuitNotice
