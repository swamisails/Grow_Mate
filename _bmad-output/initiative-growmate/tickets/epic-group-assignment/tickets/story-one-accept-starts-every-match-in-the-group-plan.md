---
title: 'One Accept starts every Match in the group'
type: 'feature'
ticket: '2'
created: '2026-11-18'
status: 'built'
baseline_revision: '4cbc6794b4d4a492e055c3af786dc9acbcbd1263'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After 4.1 the chosen Employee sees a group but can't Accept it. Its Learners never get a Match, and the chosen Employee never becomes a Mentor.

**Approach:** Widen the one Accept path (AD-13). Accept on a grouped Request accepts every pending Request in the group. It creates one independent Match per Learner, sends each Learner the ordinary Accept notice, and grants the chosen Employee Mentor status with the route `group_assignment_accepted`. A group never Accepted is Cancelled together on day 6 and grants nothing.

## Boundaries & Constraints

**Always:**
- `AcceptRequest` stays the only Accept. An ungrouped Request behaves exactly as today.
- Any Request id in a pending group accepts the whole group, in one transaction. The group's Requests are locked in id order before anything is checked, so two Accepts on the same group can't deadlock. The response is the Match of the posted Request, with the same shape as today.
- Each Learner gets one `request_accepted` notice ("{Mentor} is your mentor for {Course}.") after commit. The chosen Employee gets no notice.
- `GrantMentor(chosen Employee, Course, GroupAssignmentAccepted)` runs inside the same transaction. An existing grant keeps its first route (AD-7).
- Nothing exposes a route or `group_assignment_id`. After Accept, each Match, Home row and notice looks like a one-to-one Match.
- Day-3 and day-6 notices stay derived per Request (`RequestTimeNotices`, unchanged): each Learner gets one, and the chosen Employee gets one per Learner.

**Never:**
- The 4.3 exclusions.
- Accepting part of a group.
- A group notice or a group-shaped response.
- Any change to the clock rules, Quit or Course Completed.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Group Accept | Imani Accepts a pending group of five on SQL Fundamentals | 201. Five accepted Requests, five Matches, five Learner notices. Imani is in the Course's Mentors list. The group row leaves Requests | — |
| Any sibling id | Accept posts the third Request's id | Same as above | — |
| Twice | A second Accept on the group | Nothing new is created | 404 |
| Stranger | Another Employee Accepts the group | Nothing is accepted | 404 |
| Day 3 | 72 h after Assign, un-Accepted | Each Learner has a day-3 notice. Imani has one per Learner. The row stays | — |
| Day 6 | 144 h, un-Accepted | Each Learner and Imani have day-6 notices. The row is gone. Accept gives 404. Imani isn't a Mentor | 404 |
| Already Mentor | Imani already mentors via Registration approval | Group Accept works. Her route stays `registration_approval` | — |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Matching/Actions/AcceptRequest.php`:
  - L36–45: lock and guards. L41 refuses `group_assignment_id`; replace that with the group branch.
  - L47–60: accept, Match and notice. Reuse this per Request.
  - Names come from `UserNames` and titles from `CourseTitles`.
  - Update the class docblock.
- `api/app/Modules/Mentors/Actions/GrantMentor.php`: `handle(int $userId, int $courseId, Route $route)`. It is insert-or-ignore and already uses a savepoint. `Mentors\Models\Route::GroupAssignmentAccepted` exists.
- `AcceptRequestController` and `MentorMatchResource`: no change.
- `IncomingRequests` (4.1) drops accepted Requests, so the row disappears on its own.
- `RequestTimeNotices`: no change. It is already per Request, and a group shares `sent_at`.
- `web/src/features/matching/Requests.tsx`: no logic change. After Accept it re-fetches, and the group row's id is the posted id, so the error fallback filter still works. Update the docblock only.
- Tests to flip from "refused" to "accepted":
  - `api/tests/Feature/Matching/GroupAssignmentTest.php` L130 (`test_accepting_the_group_is_still_refused…`)
  - `AcceptRequestTest.php` L101 (the grouped part of `test_a_grouped_or_already_accepted…`)
  - `web/src/features/matching/Requests.test.tsx` L81
  - `e2e/tests/group-assignment.spec.ts` L101–108
- Clock test patterns: `RequestTimeTest.php` (`at()`, `travelTo`). Mentor-list read: `GET /api/v1/courses/{course}/mentors`.

## Tasks & Acceptance

**Execution:**
- [x] `AcceptRequest.php`:
  - Read the posted Request. If it is grouped, lock the group's Requests in id order and re-check the guards on the posted one. Then accept every pending, uncancelled Request in the group.
  - Create one Match and one Learner notice for each, then call `GrantMentor` once.
  - Return the posted Request's Match.
- [x] `GroupAssignmentTest.php`: replace the refused test with one test per matrix row, using `travelTo` for day 3 and day 6. Fix `AcceptRequestTest` L101 so it keeps covering the already-accepted and cancelled cases and drops the grouped ones.
- [x] `Requests.test.tsx`: the group Accept succeeds and the re-fetched list no longer has the row.
- [x] `e2e/tests/group-assignment.spec.ts`:
  - Move the Learner checks before Accept.
  - Then Accept: 201, the row is gone, each Learner has the Accept notice and an `in_progress` Home row, and the chosen Employee is in the Course's Mentors list.
  - `hidesSecrets` on every body.

**Acceptance Criteria:**
- Given an accepted group, when any Learner's Match, Home or notice is read, then it matches a one-to-one Match's shape, with no route or group id.
- Given the commands in Verification, when they run, then they pass. The known exceptions are the `RateLimitTest` proxy test and the 5 e2e failures noted in the 4.1 plan.

## Implementation Notes

- Branch `story/4-2-group-accept` is cut from `story/4-1-group-assignment` (`4cbc679`), which is still in review as a PR. Rebase onto `main` once 4.1 merges.

## Plan Change Log

## Review Triage Log

- Quick review, pass 1: high 0, medium 2, low 3, false 1, maybe-false 0.
  - medium, patch: the grouped Accept X-locks the group's Requests before `GrantMentor`'s insert takes InnoDB FK shared locks on the `users` and `courses` rows. `SendRequest` (`LockUser`, then `LockCourse`, then `LearnerEligibility` FOR UPDATE on the open Request) and `AssignGroup` lock users, then the Course, then Requests, so the opposite order can deadlock and the loser gets a 500. SQLite tests can't see it. Fix: lock the chosen Employee and the Course before the siblings.
  - low, patch: the "`group_assignment_id` never changes" comment overstates the schema (`nullOnDelete`). Behaviour is safe (`firstWhere` null, then 404). Comment reworded.
  - low, patch: the `group-assignment.spec.ts` header comment line is about 143 characters against the file's roughly 100. Rewrapped.
  - low, rejected: the Mentor name and Course title are looked up per Learner (2N small queries). No user or developer would notice this at group sizes, and the fix adds parameters.
  - false: `AcceptRequestTest` `assertHidesRouteAndGroup` runs on a list just pinned empty. It is redundant but causes no harm, and the cancelled and already-accepted cases stay covered.
  - medium, defer: the uncommitted `api/.env.example` edit predates this story and is outside its diff. Already logged under 4.1, and it is epic 1 retro item 8.

## Design Notes

Locking all siblings in id order first, rather than the posted row first, makes every Accept on one group take its locks in the same order. A plain "lock posted, then lock the rest" would deadlock when two Accepts post different sibling ids.

## Verification

**Commands:**
- `cd api && php artisan test --compact && vendor/bin/pint --dirty --format agent`: green apart from the known rate-limit test.
- `cd web && npm run lint && npm test && npm run build`: clean.
- `./e2e/run.sh`: `group-assignment.spec.ts` passes; no new failures beyond the 5 known ones.
