---
title: 'Admin assigns a group and the chosen Employee sees it'
type: 'feature'
ticket: '1'
created: '2026-11-18'
status: 'built'
baseline_revision: '423469b5453d4caad600eaafe328132d8407e1cc'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-growmate/ux-growmate/mockups/epic4-group-assignment.html']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admin has no way to staff a Course with a group, and a chosen Employee who isn't yet a Mentor can't be reached by a Request.

**Approach:** Add one write-only admin endpoint and a Group assignment form. Assign creates one pending Request per Learner, all with one shared sent time. The chosen Employee sees the group as one block on their Requests screen and gets the existing new-Request notice for each Request. Whole-group Accept comes in 4.2 and refusals in 4.3.

## Boundaries & Constraints

**Always:**
- `POST /api/v1/admin/group-assignments` takes `course_id`, `mentor_id` and `learner_ids` (at least one, distinct). It returns 201 with the created assignment: Course title, chosen Employee name, Learner names and created time. It never returns Request or Match state.
- A draft Course is refused with a 409 carrying a new Matching code, `MATCHING_COURSE_NOT_PUBLISHED`. An unknown or Admin id in `mentor_id` or `learner_ids` gives a 422 on that field. A refusal creates nothing.
- The Requests and the assignment share one sent time. Each Request stores a `request_sent` notice for the chosen Employee, sent through `SendNotice` after commit. Learners get no notice.
- The block reads "A, B and C requested you to guide them with Course": names in Request order, no count, no "group" wording. It shows only on the chosen Employee's own Requests screen, while the group is pending and within 144 h. It has one Accept, which posts the group's first Request id. Until 4.2 the API keeps refusing that Accept with a 404.
- No other response or notice carries `group_assignment_id` or any sign of a group (AD-8). The Learner's Home, Course bar and Request button stay generic: Not yet started, and no Request button.
- The admin nav order is Courses · Registration decisions · Group assignment.

**Never:** Whole-group Accept, `GrantMentor`, the eligibility refusals, the refused-chosen-Employee and self-assignment checks (4.2 and 4.3), a history list, an Accepted state, or a confirmation dialog.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Assign | Noor assigns five Learners to Imani for a published Course | 201. One assignment and five pending Requests sharing `sent_at`. Imani has five `request_sent` notices | — |
| Requests | Imani opens Requests | One row naming the five, with one Accept, alongside any ordinary rows | — |
| Group Accept | Imani clicks Accept | Nothing is accepted | 404, so the generic error shows |
| Draft | `course_id` is a draft | Nothing is created | 409 `MATCHING_COURSE_NOT_PUBLISHED` |
| Bad ids | Empty `learner_ids`, or an unknown or Admin id | Nothing is created | 422 on the field |
| Non-admin | An Employee POSTs | — | 403 |
| Day 6 | 144 h pass | The block is gone | — |

</frozen-after-approval>

## Code Map

- `api/database/migrations/2026_11_14_000000_create_matching_tables.php` — `group_assignments` has only `id`. Add a new migration with `course_id` and `mentor_id` (FKs, cascade) and a `created_at` timestamp. Give `Models/GroupAssignment.php` fillable fields and casts, and `GroupAssignmentFactory` a real definition.
- `api/app/Modules/Matching/Actions/SendRequest.php` — pattern to follow: `LockUser`, `LockCourse` (returns false for a draft), `Request::create`, then `SendNotice(RequestSent, person_name, course_title)` inside the transaction, using `UserNames` and `CourseTitles`. Don't change it.
- `api/app/Modules/Matching/ErrorCode.php` and `Exceptions/MatchingRuleViolation.php` — new case plus a match arm.
- `api/app/Modules/Matching/Queries/IncomingRequests.php` — L29 excludes groups. Keep single rows as they are, and add one row per pending group.
- `api/app/Modules/Matching/Http/Resources/IncomingRequestResource.php` — single rows `{id, learner_name, course_title}`, group rows `{id, learner_names, course_title}`.
- `AcceptRequest.php` L116–124 already gives a grouped Request a 404. Leave it.
- `LearnerEligibility`, `ProgressStatus` and `RequestEligibilityController` are already generic over grouped Requests (see `HomeAndMatchTest` L14). Don't change them.
- `api/routes/api.php` L78–92 — the admin group. Patterns: `CreateCourseController` + `CreateCourseRequest` + `SendCourseRequest` (`integer:strict`).
- Accounts has no Employee list. Add `Queries/Employees` (non-admin `{id, name}`, ordered by name) and an admin `GET /api/v1/admin/employees`.
- Tests: `tests/Feature/Matching/MatchingTestCase` (`publishedCourse`, `employee`, `assertHidesRouteAndGroup`) and `Mentors/RegistrationDecisionsTest` (admin and 403 patterns).
- Web:
  - Shell: `app/layout.tsx` L65–85 (nav), `app/icons.tsx` (no `group_add` yet), `app/copy.ts` (`nav` L10–18, `requests.sentence` L119, `date`).
  - Form helpers: `app/forms.ts` (`fieldErrors`, `focusFirstInvalid`, `useConflict`, `ConflictMessage`), `app/PageHeader.tsx`, `PageStates.tsx`.
  - Patterns: `features/mentors/MentorCheck.tsx` L74–89 (checkbox list) and `RegistrationDecisions.tsx` (load state).
  - API: `api/courses.ts` `listCourses()` (filter on `published`).
  - There is no select component or select CSS yet (`styles.css` `.field__input` is around L318).
- Nav-list assertions to update: `RegistrationDecisions.test.tsx` L75–78, `e2e/tests/registration-decisions.spec.ts` L32, `registration-decision-notices.spec.ts` L99.
- e2e: `support/helpers.ts` (`newEmployee`, `signUp`, `adminSignIn`, `publishCourse`) and `request-and-accept.spec.ts` (`hidesSecrets`). The seed has only three Employees, so the spec signs up its own.

## Tasks & Acceptance

**Execution:**
- [x] API — migration plus `GroupAssignment` model and factory.
- [x] `Accounts/Queries/Employees`, its controller and resource, and the route.
- [x] `Matching/Actions/AssignGroup` — one transaction. Lock the Course, refuse a draft, take one `$sentAt`, lock the Learners in id order, create the assignment and one Request each, and store one notice each.
- [x] `AssignGroupRequest`, the controller, `GroupAssignmentResource`, and the route.
- [x] `IncomingRequests` group rows, and the matching resource change.
- [x] Tests — `Matching/GroupAssignmentTest`, one test per matrix row, plus "the Learner sees no notice and no Request button" and "no Learner-facing body has `group_assignment_id`". `Accounts/EmployeesTest`.
- [x] Web:
  - `api/types/accounts.ts` and `api/accounts.ts` — the Employee list.
  - `api/types/matching.ts` and `api/matching.ts` — `assignGroup`, and the union type `IncomingRequest`.
  - `copy.ts` — the nav label, the form strings from the mock-up, and a `names(list)` joiner.
  - `icons.tsx`, the nav item in `layout.tsx`, the route in `features/matching/routes.ts`, and select CSS.
- [x] `features/matching/GroupAssignment.tsx` and its test. Course select (published only), Chosen Employee select, and a Learners fieldset without the chosen Employee. Assign is disabled while nothing is ticked or a call is in flight. Show 422 errors per field, a 409 through `ConflictMessage`, and on success an "Assignment created" card with the form reset.
- [x] `Requests.tsx` and its test — render the group row.
- [x] Update the nav-list tests. Add `e2e/tests/group-assignment.spec.ts` for the Assign row of the matrix, using a fresh Course, chosen Employee and Learners.

**Acceptance Criteria:**
- Given a successful Assign, when the Admin response and every Learner-facing response are read, then none has Request or Match state, a route, or `group_assignment_id`.
- Given the commands in Verification, when they run, then they pass. The one exception is the rate-limit test that already fails on `main`.

## Implementation Notes

- The baseline merges `origin/story/2-4-request-and-accept-notices` (its PR to `main` is pending) and `fix/2-5-merge-damage`. That branch fixes `LearnerEligibility` and `request-clock.spec.ts`, both broken on `main` by merge `b1962a83`.
- `RateLimitTest::test_behind_the_web_proxy_each_browser_address_has_its_own_limit` already fails on `main` and is out of scope.
- Lock order: `AssignGroup` locks the Learners (in id order) and then the Course, matching `SendRequest`'s Learner-then-Course order so the two can't deadlock. The plan listed the Course first. Behaviour is unchanged.
- Added `Accounts/Queries/EmployeeIds` so Matching can check that ids are Employees without reading `users` (AD-3). An unknown `course_id` is also a 422 on its field.
- The form shows the Learners fieldset only after a chosen Employee is picked (mock-up screen 3).
- Per the epic's 2026-11-10 decision, assigned Learners still get the derived day-3 and day-6 notices, like any Learner.
- `./e2e/run.sh`: 47 passed, 5 failed. The new `group-assignment.spec.ts` passed. `home-and-match.spec.ts` (L114, L132, L161, L191) and `uj-3-and-course-publishing.spec.ts:11` fail the same way on the baseline with this story's changes stashed, so they are out of scope here.

## Plan Change Log

## Review Triage Log

- Quick review, pass 1: high 0, medium 1, low 0, false 0, maybe-false 0. The reviewer found nothing wrong in the story's diff.
  - medium, defer: the uncommitted `api/.env.example` edit (it predates this story, isn't in its diff and isn't staged) appends `APP_ENV=e2e` and blank DB keys after the file's own `APP_ENV=local`. Checked against the vendored phpdotenv: a later duplicate key wins, so a `.env` copied from that example runs as `e2e` and registers the testing routes (AD-6). This is epic 1 retro item 8; it was left as the user asked.

## Design Notes

A group row's `id` is the lowest Request id in the group. Accept stays on the one `AcceptRequest` path (AD-13), so 4.2 only needs to widen that Action. Keeping single rows unchanged leaves the 2.x Requests contract, its tests and the e2e intact. TypeScript tells the two row shapes apart with `'learner_names' in row`.

## Verification

**Commands:**
- `cd api && php artisan test --compact && vendor/bin/pint --dirty --format agent` — green apart from the known rate-limit test.
- `cd web && npm run lint && npm test && npm run build` — clean.
- `./e2e/run.sh` — pass.
