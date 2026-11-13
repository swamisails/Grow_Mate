---
title: 'Employees name Courses in the Mentor check'
type: 'feature'
ticket: '6'
created: '2026-11-13'
status: 'built'
baseline_revision: '33bcb850243a4cb301bcd51ab0c621e8bb2af3b0'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md'
  - '{project-root}/_bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A new Employee can't name the Courses they can already mentor, so Admin has nothing to decide (entry 7) and the first Mentors can't come from registration.

**Approach:** Epic 1, entry 6; covers R2 (AD-15). The Mentors module records one Mentor check per Employee: a list of Courses, or a skip. The SPA shows it as sign-up step 2 and keeps sending a signed-in Employee back to it until they submit or skip.

## Boundaries & Constraints

**Always:**
- **API (Mentors module, AD-3):**
  - `GET /api/v1/mentor-check` returns `{data: {pending, courses: [{id, title}]}}`. `courses` holds the Courses published strictly before the Employee's account was created, sorted by title. It is empty when the check is not pending.
  - `POST /api/v1/mentor-check` takes `{course_ids: [int, …]}` (one or more, distinct) or `{skip: true}`, never both. It returns 201 with the same shape as GET.
  - Both routes sit in the existing `can:browse` Employee group.
  - Only `Mentors\Actions\SubmitMentorCheck` writes, in one transaction. Tables: `mentor_checks` (unique `user_id`) and `mentor_check_courses` (unique `mentor_check_id`, `course_id`). A skip is a check with no Course rows.
  - Refusals are 409 with a Mentors `ErrorCode`. `MENTORS_CHECK_DONE` covers a second submission, including a concurrent duplicate that hits the unique key. `MENTORS_COURSE_NOT_ELIGIBLE` covers any id that is unknown, a draft, or published at or after the account's creation; nothing is stored. A bad shape is a 422.
  - The account's creation time comes through a new Accounts Query. Eligible Courses come through a new Courses Query. Mentors never reads `users` or `courses` directly.
- **SPA:**
  - The Mentor check page lives at `/mentor-check`, Employee-only. It has a checkbox per Course, then Submit (primary, enabled only when at least one box is ticked) and Skip (secondary). With no Courses, only Skip is shown. There is no confirmation.
  - The page's top bar has the brand, the theme toggle, the name and Sign out, with no nav links.
  - While the check is pending, every Employee page goes to `/mentor-check`. Once it is done, `/mentor-check` goes to Home. Sign-up lands on the step; sign-in lands on the step while it is pending.
  - After Submit or Skip, go to Home. A 409 shows the API `message` and refetches.
  - All wording lives in `copy.ts`.

**Decisions (2026-11-13):**
- The Mentors seeder records a skipped Mentor check (no Course rows) for each demo Employee, through `SubmitMentorCheck`, so demo sign-ins go straight to Home. This relaxes the epic note "no Mentor check … rows behind them" for skips only: a skip names no Courses, so no grant has a check or decision behind it.
- The plan is kept whole (~2,500 tokens) by choice; no split.

**Never:** Registration decisions, Admin screens, notices, the Home Mentor check card (entries 7 and 8), any Mentor grant, a route value, helper text, a way to redo or edit the check, a Mentors flag on `UserResource`/`/me`. Don't touch the dirty `api/.env.example` or the untracked walkthrough folder.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Submit | new Employee ticks 2 eligible Courses | stored; Home; step never shown again | — |
| Skip | new Employee clicks Skip | stored with no Courses; Home | — |
| No Courses | nothing published before signup | Skip only | — |
| Left at step | signs out at the step, signs in again | lands on `/mentor-check` | — |
| Deep link while pending | opens `/courses/1` | `/mentor-check` | — |
| Done | opens `/mentor-check` | Home | — |
| Second submission | API call after a submit or skip | nothing changes | 409 `MENTORS_CHECK_DONE` |
| Later Course | id published after signup, or draft or unknown | nothing stored | 409 `MENTORS_COURSE_NOT_ELIGIBLE` |
| Bad shape | `[]`, both fields, duplicates, non-ints | nothing stored | 422 |
| Access | guest; Admin | — | 401; 403 |

</frozen-after-approval>

## Code Map

- `api/routes/api.php` L30-35 -- the `can:browse,Course` group; add both routes here.
- `api/app/Modules/Mentors/` -- `GrantMentor` shows the transaction and `UniqueConstraintViolationException` catch (copy it for the concurrent-duplicate 409). `CourseMentors` + `CourseMentorsController` show cross-module Query injection and reading only `$request->user()?->getAuthIdentifier()`. There's no provider, ErrorCode or Exceptions folder yet.
- `api/app/Modules/Courses/ErrorCode.php`, `Exceptions/CourseRuleViolation.php` -- the 409 pattern to copy (`ShouldntReport`, `render()` → `{message, code}`).
- `api/app/Modules/Courses/Queries/PublishedCourses.php` -- style for the new `PublishedBefore` Query (`published_at < $instant`, `id, title`, title order). Don't change existing Queries.
- `api/app/Modules/Accounts/Queries/UserNames.php` -- style for the new `UserCreatedAt` Query.
- `api/database/migrations/2026_11_13_000000_create_mentors_tables.php` -- migration style. The new file is `2026_11_14_000000_create_mentor_checks_tables.php`.
- `api/app/Modules/Mentors/Database/Seeders/MentorsSeeder.php` -- demo Employees; add their skipped checks here, after the grants.
- `api/tests/Feature/Mentors/MentorsTestCase.php` -- `publishedCourse()`, `employee()`. Use `$this->travel()` for before/after timing (AD-6). `Accounts/AccountsTestCase::withSessionFrom` is for real sign-up flows.
- `web/src/app/App.tsx` `CurrentPage` -- add the pending gate after the role checks, before an Employee page renders.
- `web/src/app/router.ts` (`layout` union), `layout.tsx` (`SignedInLayout`, `EmployeeLayout`) -- add the no-nav Employee layout.
- `web/src/app/SessionProvider.tsx`, `session.ts` -- the place to hold the Mentor check status (fetched for Employees on load, sign-in and sign-up; cleared on sign-out).
- `web/src/app/routes.ts` -- spread a new `features/mentors/routes.ts`.
- `web/src/app/forms.ts` -- `useConflict`, `ConflictMessage`. `styles.css` -- `.card`, `.list-row`, `.option-row__correct input` accent for checkboxes.
- `web/src/api/mentors.ts`, `types/mentors.ts` -- add the calls and types.
- Tests that assume sign-up lands on Home: `web/src/features/accounts/SignUp.test.tsx`, `web/src/app/App.test.tsx`, `web/src/app/roles.test.tsx`, `e2e/tests/employee-accounts.spec.ts` L37. Spec helpers are copied per file; `course-publishing.spec.ts` has `apiRequest` and `adminSignIn`.

## Tasks & Acceptance

**Execution:**
- [x] `api/database/migrations/2026_11_14_000000_create_mentor_checks_tables.php`, `api/app/Modules/Mentors/Models/{MentorCheck,MentorCheckCourse}.php`, factories -- the record.
- [x] `api/app/Modules/Accounts/Queries/UserCreatedAt.php`, `api/app/Modules/Courses/Queries/PublishedBefore.php` -- the cross-module reads.
- [x] `api/app/Modules/Mentors/{ErrorCode.php,Exceptions/MentorRuleViolation.php,Actions/SubmitMentorCheck.php,Queries/MentorCheckStatus.php}` -- the rule and status.
- [x] `api/app/Modules/Mentors/Http/{Controllers,Requests,Resources}/`, `api/routes/api.php` -- GET and POST.
- [x] `api/app/Modules/Mentors/Database/Seeders/MentorsSeeder.php` -- a skipped check for each demo Employee, idempotent on reseed (a repeat skip is a no-op, not a 409, inside the seeder).
- [x] `api/tests/Feature/Mentors/MentorCheckTest.php` (+ seeder test update) -- every API matrix row, including the same-second boundary and the concurrent-duplicate 409.
- [x] `web/src/api/{mentors.ts,types/mentors.ts}`, `web/src/app/{SessionProvider.tsx,session.ts,App.tsx,router.ts,layout.tsx,routes.ts,copy.ts,styles.css}` -- status, gate and layout.
- [x] `web/src/features/mentors/{MentorCheck.tsx,routes.ts}` + `MentorCheck.test.tsx` -- the page; update the sign-up/roles/App tests.
- [x] `e2e/tests/mentor-check.spec.ts`, `employee-accounts.spec.ts` (+ any spec signing in demo Employees) -- the browser rows, and the API 409s through `apiRequest`.

**Acceptance Criteria:**
- Given a new Employee who submitted or skipped, when they sign out and back in, then they land on Home and `/mentor-check` sends them to Home.
- Given `php artisan test`, Pint, `npm run lint`, `npm test`, `npm run build` and `./e2e/run.sh`, when they run, then all pass.

## Implementation Notes

- **409 in the SPA.** A 409 shows the API `message` and refetches the status through the session. For `MENTORS_COURSE_NOT_ELIGIBLE` the page stays with the message and the refreshed list. For `MENTORS_CHECK_DONE` the refetch says the check is done, so the router takes the Employee Home and the message isn't seen. That follows "once it is done, `/mentor-check` goes to Home".
- **Failed status read.** If `GET /mentor-check` fails for any reason except a 401, the session holds no status and Employee pages open as usual. The SPA doesn't lock the Employee out. The API still enforces the one check, and the next load asks again.
- **Concurrent duplicate.** `SubmitMentorCheck` checks for an existing check, then the eligible Courses, then inserts. A unique-key violation on insert becomes `MENTORS_CHECK_DONE`. The test simulates the race by inserting a competing row from an `eloquent.creating` listener.
- **Non-409 failures** on the step show `copy.errors.generic`. The form can't send a bad shape.
- **e2e run.** There was no root `.env`, so the `./e2e/run.sh` steps were run with `docker compose --env-file` pointing at a scratch env file. That file was rebuilt from the previous e2e containers' configuration. All 35 tests passed.

## Plan Change Log

## Review Triage Log

Loop 1 (quick lens). Verdicts: 0 high, 0 medium, 2 low, 1 false.

| # | Location | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | `api/app/Modules/Mentors/Http/Controllers/SubmitMentorCheckController.php` | Calls `SubmitMentorCheck` and then `MentorCheckStatus`, two calls where AD-3 allows one | low | AD-3 (architecture L72): "Controllers validate, call one Action or Query". Later entries copy controllers. After a successful submit the check is always done, so the fix is to return a fixed `{pending: false, courses: []}` | patch |
| 2 | `web/src/features/accounts/SignUp.tsx` L34 | The comment says Sign up leaves "for the return path or Home"; it now goes to the pending Mentor check | low | `App.tsx` sends a pending Employee on a guest route to `mentorCheckPath` before the return path; `SignUp.test.tsx` asserts `/mentor-check` | patch |
| 3 | `api/app/Modules/Mentors/Actions/SubmitMentorCheck.php` | Duplicate `$courseIds` from a caller that skips the request would give a 500 from the `mentor_check_courses` unique key | false | No caller can pass duplicates. The HTTP path validates `distinct:strict`, and the only other caller, `MentorsSeeder`, passes `[]`. The unique key failing loudly is correct behaviour for a state nothing reaches | rejected |

## Design Notes

- **Status lives in Mentors, not on `/me`.** AD-3 makes dependencies one-way (Mentors → Accounts), so the SPA gets the pending flag from `GET /mentor-check`, one extra call per Employee session.
- **"Before" is strict (`<`).** Both timestamps have second precision, so a Course published in the same second as signup is refused rather than risk accepting one published after it.
- **Refusals are 409, not 422** (AD-10): a later Course and a second submission break a rule rather than the request's shape.
- **Copy the UX docs leave open** (adjust at approval): page title "Mentor check"; card header "Courses you can mentor"; buttons "Submit" and "Skip"; 409 messages "You've already done the Mentor check." and "One or more of these courses can't be named."
- **Step layout:** no nav links, because each would bounce back to the step.

## Verification

**Commands:**
- `cd api && php artisan test --compact && vendor/bin/pint --dirty --format agent` -- expected: green, no style diffs.
- `cd web && npm run lint && npm test && npm run build` -- expected: clean.
- `./e2e/run.sh` -- expected: the full suite passes, including `mentor-check.spec.ts`.
