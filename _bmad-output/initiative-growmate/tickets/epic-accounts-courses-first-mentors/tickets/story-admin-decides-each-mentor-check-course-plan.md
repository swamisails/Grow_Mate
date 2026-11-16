---
title: 'Admin decides each Mentor-check Course'
type: 'feature'
ticket: '7'
created: '2026-11-16'
status: 'built'
baseline_revision: '06a0d057d34695d84c59ee1b116bbd688dadf5b6'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Employees name Courses in the Mentor check (entry 6), but nothing lets Admin decide them, so no Employee can become a Mentor through registration.

**Approach:** Epic 1, entry 7; covers R3 (AD-4, AD-7, AD-8). The Mentors module stores one final Registration decision per Mentor-check Course. Approval calls `GrantMentor` with `registration_approval`. A refusal is stored for epic 4's refused-for-Course read. An Admin-only Registration decisions page lists every Mentor-check Course with Approve and Refuse, or its tag once decided.

## Boundaries & Constraints

**Always:**
- **Record:** `registration_decisions` (`user_id`, `course_id`, `outcome` of `approved` or `refused` as a string-backed enum, timestamps), unique on (`user_id`, `course_id`). Only `Mentors\Actions\DecideRegistration` writes it, in one transaction. On approval, the Action calls `GrantMentor` inside that same transaction.
- **API** (under the existing `admin` prefix and `can:admin` gate):
  - `GET /api/v1/admin/registration-decisions` returns `{data: [{id, employee_name, course_title, outcome}]}`, one row per `mentor_check_courses` row, ordered by that row's id. `id` is the `mentor_check_courses` id, and `outcome` is `null` while the row is undecided.
  - `POST /api/v1/admin/registration-decisions/{id}/approve` and `.../refuse` return 201 with `{data: {id, outcome}}`. `{id}` has a numeric constraint.
  - An unknown id is a 404. A second decision on a row, including a concurrent duplicate that hits the unique key, is a 409 with `MENTORS_ALREADY_DECIDED`. Nothing changes in either case.
  - No response carries a `route`, a score or a comment.
  - Names and titles come through Accounts and Courses Queries. Mentors never reads `users` or `courses` directly (AD-3).
- **SPA:**
  - `/admin/registration-decisions` is an Admin-only page with the title "Registration decisions". It is a full-width table card with three columns: Employee, Course, and Decision.
  - An undecided row shows Approve and Refuse, both secondary buttons. Clicking either opens a confirmation dialog that says "This decision is final." with Cancel and the chosen action. On success the row shows an "Approved" or "Refused" tag (a neutral outlined `.tag`) in place of the buttons.
  - While the call is in flight, that row's buttons are disabled.
  - A 409 shows the API `message` next to the row in `field-error` (announced politely) and refetches the list.
  - The Admin top bar gains "Registration decisions" after Courses.
  - All wording lives in `copy.ts`.

**Never:** notices, the Home Mentor check card or Employee lists (entry 8); comment or score fields; an undo or edit; any route value; Group assignment use of refusals (epic 4); a change to `GrantMentor` or `SubmitMentorCheck` behaviour. Don't touch the dirty `api/.env.example` or the untracked walkthrough folder.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| List | Two checks with three Courses between them; one decided | 3 rows in id order; the decided row has its `outcome` | — |
| Skip only | A check with no Courses | No row | — |
| Approve | Undecided row | Stored as `approved`; the Employee is in the Course's Mentors list | — |
| Already a Mentor | Approve a pair that already has a grant | `approved` is stored; the first route is kept | — |
| Refuse | Undecided row | Stored as `refused`; no grant | — |
| Second decision | Approve or refuse a decided row | Nothing changes | 409 `MENTORS_ALREADY_DECIDED` |
| Unknown or bad id | `/999/approve`, `/abc/approve` | — | 404 |
| Access | Guest; Employee | — | 401; 403 |
| Empty | No Mentor-check Courses | "No registration decisions." | — |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Mentors/Actions/SubmitMentorCheck.php` -- pattern to copy: an existence check, then insert inside `DB::transaction`, with `UniqueConstraintViolationException` mapped to a 409. `GrantMentor::handle(int, int, Route)` already runs as a savepoint inside a caller's transaction. Don't change either Action.
- `api/app/Modules/Mentors/{ErrorCode.php,Exceptions/MentorRuleViolation.php}` -- add `AlreadyDecided = 'MENTORS_ALREADY_DECIDED'` and its message to the `match`.
- `api/app/Modules/Mentors/Models/{MentorCheck,MentorCheckCourse,Route}.php` -- the row source (`mentor_check_courses` joined to `mentor_checks.user_id`). `Route::RegistrationApproval` is the grant route.
- `api/app/Modules/Accounts/Queries/UserNames.php` -- id-to-name map; reuse it.
- `api/app/Modules/Courses/Queries/PublishedBefore.php` -- style for the new `CourseTitles` Query (ids to titles). Don't change existing Queries.
- `api/database/migrations/2026_11_14_000000_create_mentor_checks_tables.php` -- migration style. The new file is `2026_11_16_000000_create_registration_decisions_table.php`.
- `api/routes/api.php` -- the `admin` group: add both routes after the Courses routes, in the `courses/{course}/publish` style.
- `api/app/Modules/Courses/Http/Controllers/PublishCourseController.php` -- the one-Action controller shape (`int $id` plus the injected Action).
- `api/tests/Feature/Mentors/{MentorsTestCase,MentorCheckTest}.php` -- helpers (`employee()`, `publishedCourse()`, `grant()`). Use `app(SubmitMentorCheck::class)` to create rows, and copy the concurrent-duplicate simulation that uses an `eloquent.creating` listener. `Tests\Feature\Accounts\AccountsTestCase` or `Courses` tests show how to sign in as Admin.
- `web/src/features/courses/AdminCourses.tsx` -- the table-card list page to copy (load state, `.table`, `.tag`, `card__empty`).
- `web/src/features/courses/PublishConfirmation.tsx` -- the dialog. Generalise it into `web/src/app/Confirmation.tsx` (title, message, confirm label as props), and switch `CourseEditor` to use it.
- `web/src/app/forms.ts` -- `useConflict(refetch)` with `ConflictMessage`.
- `web/src/app/layout.tsx` `AdminLayout` -- add the NavLink. `web/src/app/icons.tsx` -- add a Material Symbols outlined `how_to_reg` path.
- `web/src/features/mentors/routes.ts`, `web/src/api/mentors.ts`, `web/src/api/types/mentors.ts`, `web/src/app/copy.ts` -- the route, calls, types and copy.
- `e2e/tests/mentor-check.spec.ts` -- `newEmployee`, `signUp`, `adminSignIn`, `apiRequest` helpers, copied per spec. Every Employee's name is unique, so the spec finds its rows by name in a shared list.

## Tasks & Acceptance

**Execution:**
- [x] `api/database/migrations/2026_11_16_000000_create_registration_decisions_table.php`, `api/app/Modules/Mentors/Models/{RegistrationDecision,Outcome}.php`, `api/database/factories/RegistrationDecisionFactory.php` -- the record and its enum.
- [x] `api/app/Modules/Courses/Queries/CourseTitles.php` -- titles by id, for Mentors.
- [x] `api/app/Modules/Mentors/{ErrorCode.php,Exceptions/MentorRuleViolation.php,Actions/DecideRegistration.php,Queries/RegistrationDecisions.php}` -- the rule and the list.
- [x] `api/app/Modules/Mentors/Http/{Controllers,Resources}/`, `api/routes/api.php` -- GET and the two POSTs.
- [x] `api/tests/Feature/Mentors/RegistrationDecisionsTest.php` -- every matrix row, the concurrent duplicate, no `route` key, and the approved Employee showing up in `GET /courses/{id}/mentors`.
- [x] `web/src/app/Confirmation.tsx`, `web/src/features/courses/{CourseEditor.tsx,PublishConfirmation.tsx}` -- the shared dialog; delete `PublishConfirmation`. `CourseEditor` tests stay green.
- [x] `web/src/api/{mentors.ts,types/mentors.ts}`, `web/src/features/mentors/{RegistrationDecisions.tsx,routes.ts}`, `web/src/app/{layout.tsx,icons.tsx,copy.ts}` -- the page and the nav link.
- [x] `web/src/features/mentors/RegistrationDecisions.test.tsx` -- rows, the confirm then tag flow, Cancel sends nothing, the 409 message with refetch, the empty state and the error state.
- [x] `e2e/tests/registration-decisions.spec.ts` -- the ticket's verify: a new Employee names two Courses; Admin approves one and refuses the other; both tags show after a reload; the approved Course page lists the Employee to a demo Employee and the refused one doesn't; the API returns a 409 for a second decision on either row.

**Acceptance Criteria:**
- Given Admin approved one of an Employee's Courses and refused another, when a demo Employee opens each Course page, then only the approved one lists the Employee as a Mentor.
- Given `php artisan test`, Pint, `npm run lint`, `npm test`, `npm run build` and `./e2e/run.sh`, when they run, then all pass.

## Implementation Notes

- `DecideRegistration::handle(int $mentorCheckCourseId, Outcome)` returns `array{id, outcome}`; the 404 is `abort_if(..., 404, 'Not found.')`, as in `PublishedCourse`. The transaction closure ends before the `return`, which is where entry 8 sends its notice.
- Two Resources: `RegistrationDecisionRowResource` (the list) and `RegistrationDecisionResource` (the POST result). Routes use `{id}` with `[0-9]{1,18}`.
- `Confirmation` takes its Cancel label from the new `copy.confirmation.cancel`; `copy.courseEditor.cancel` was removed.
- The SPA updates a decided row from the POST response (`outcome`), and refetches only on a 409. In-flight state and each 409 or failure message are kept per row (a set of ids and a map by id) rather than through `useConflict`, whose single message can't follow several concurrent rows; `ConflictMessage` still renders each one. After a confirmed decision settles, focus moves to that row's Decision cell (`tabIndex={-1}`).
- The e2e spec publishes its own two Courses (then waits 1.1s, since a nameable Course must be published strictly before sign-up to the second), so the demo Courses' Mentor lists checked by `course-mentors.spec.ts` stay as seeded.
- Not run here: `./e2e/run.sh` (Docker was not running in this environment).

## Plan Change Log

## Review Triage Log

Loop 1 (quick lens). Verdicts: 0 high, 2 medium, 0 low, 0 false.

| # | Location | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | `web/src/features/mentors/RegistrationDecisions.tsx` `decide()` | In-flight and message state are single page-wide values. A decision on row B while row A's call is in flight re-enables A's buttons, A's `finally` re-enables B mid-flight, and A's error lands under B | medium | `disabled={pendingId === row.id}` and `messageRowId === row.id` read one value each. After the modal closes, other rows' buttons stay enabled, so a second `decide()` overwrites both. This breaks the Always rule "While the call is in flight, that row's buttons are disabled" and "next to the row". The server's 409 still holds the rule. Fix: per-row pending set and per-row message | patch |
| 2 | `RegistrationDecisions.tsx` `decide()` + `web/src/app/Confirmation.tsx` cleanup | Confirming a decision drops keyboard focus to `<body>` | medium | `setConfirming(null)` and `setPendingId(id)` commit together, so the cleanup's `opener?.focus()` targets a disabled button and does nothing. On success or on a 409 the buttons are then replaced by the tag. This breaks EXPERIENCE.md, Accessibility Floor ("focus returns to the button that opened them"). When the opener is gone, its in-place replacement (the row's Decision cell) is the only reading | patch |

## Design Notes

- **Two action endpoints, not a body enum.** These mirror `courses/{course}/publish`. Each controller calls `DecideRegistration` with a fixed `Outcome` and returns its result. That is one Action call, which keeps the entry-6 review's AD-3 finding from coming back.
- **Rows are keyed by the `mentor_check_courses` id, while decisions are keyed by (`user_id`, `course_id`).** This follows the ERD (USERS and COURSES to REGISTRATION_DECISIONS), and it gives epic 4 a direct "refused for this Course" read. A user has one check, so the pair is unique.
- **Decided rows stay listed in id order**, so a row keeps its place after it's decided (ticket: "Decided rows show an Approved or Refused tag").
- **Entry 8 hook.** Entry 8 adds the notice by calling `SendNotice` after the commit, from inside `DecideRegistration`. Keep the Action's transaction boundary explicit so entry 8 can do that.
- **Copy the UX docs leave open** (adjust at approval): column headers "Employee", "Course" and "Decision"; empty state "No registration decisions."; the 409 message "This course has already been decided."; dialog titles "Approve" and "Refuse".

## Verification

**Commands:**
- `cd api && php artisan test --compact && vendor/bin/pint --dirty --format agent` -- expected: green, no style diffs.
- `cd web && npm run lint && npm test && npm run build` -- expected: clean.
- `./e2e/run.sh` -- expected: the full suite passes, including `registration-decisions.spec.ts`.
