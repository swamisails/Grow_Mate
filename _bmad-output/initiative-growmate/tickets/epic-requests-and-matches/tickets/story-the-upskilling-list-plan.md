---
title: 'The Upskilling list'
type: 'feature'
ticket: '8'
created: '2026-11-19'
status: 'in-progress'
baseline_revision: 'd2509c42b92ede2e0ae427c4a5954272d0211e15'
route: 'full'
route_source: 'auto'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no way to see who is learning what. Employees and Admin cannot see which Employees are In progress on a Course.

**Approach:** Add one read-only Upskilling list for every signed-in user, Admin included. It shows each Employee who is In progress on a Course (name, Course, bar with its state word), one row per Employee and Course, sorted by name then Course title. It is built from the existing Progress status query, and an Upskilling link is added to both top bars.

## Boundaries & Constraints

**Always:** A row appears only when `ProgressStatus` returns `in_progress` for that Employee and Course. That includes a Learner whose Mentor clicked Course Completed, who stays In progress. Not yet started and Quit never appear. One row per Employee and Course, sorted by name (case-insensitive) then Course title. Columns are Name, Course and Status (a bar with its state word). Empty state: "No one is in progress." The API returns only name, course title and status, so Admin sees no Request or Match ids, Mentors, routes or groups (C4, C6). Admin never appears as a row. All copy lives in `app/copy.ts`. Header order: Employee "GrowMate · Home · Courses · Requests · Notices · Upskilling"; Admin "GrowMate · Courses · Registration decisions · Group assignment · Upskilling".

**Never:** No counts, sorting controls, filters, search, links, buttons or actions on the list (C9). No Quit reasons, no Mentor names. Do not change `ProgressStatus`, `RequestState`, `HomeLists` behaviour, LearnerEligibility or the existing role access for other routes. No migration.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Employee views | Two Learners In progress, one Not yet started | Exactly the two In progress rows, sorted by name, no counts or controls | No error expected |
| Admin views | Same data | The same two rows | No error expected |
| Same name order | One Employee on two Courses | Two rows, sorted by Course title | n/a |
| Quit or no status | Quit Learner, pending Request, cancelled Request | Not listed | n/a |
| Course Completed | Mentor clicked Course Completed, bar In progress | Listed | n/a |
| Nobody In progress | No qualifying rows | "No one is in progress." | n/a |
| Signed out | No session | Refused | 401 |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Progress/Queries/ProgressStatus.php` -- `handle(learnerId, courseId)` gives `in_progress` | `not_yet_started` | `quit` | null; reuse, do not change.
- `api/app/Modules/Matching/Queries/HomeLists.php` -- the per-Learner status list pattern (distinct course ids, `ProgressStatus` per course, `CourseTitles`, `usort` with `strcasecmp`); copy its shape.
- `api/app/Modules/Matching/Queries/UpskillingList.php` -- NEW, in Matching beside HomeLists (Progress depends on Matching models; avoid a cycle). Distinct (learner_id, course_id) from `Matching\Models\Request`, keep `in_progress`, names via `Accounts\Queries\UserNames`, titles via `Courses\Queries\CourseTitles`.
- `api/app/Modules/Matching/Http/Controllers/HomeController.php`, `Notifications/Http/Controllers/NoticesController.php`, `Accounts/Http/Controllers/EmployeesController.php` -- invokable controller and resource patterns (`{data: ...}`).
- `api/routes/api.php` -- add `Route::get('upskilling', UpskillingController::class)` inside `auth:sanctum` but outside the `can:employee` and `admin` groups, beside `Route::get('me', ...)`.
- `api/tests/Feature/Matching/MatchingTestCase.php`, `HomeAndMatchTest.php`, `QuitMatchTest.php`, `CompleteCourseTest.php` -- helpers and fixtures; admin via `User::factory()->admin()->create()`.
- `web/src/app/layout.tsx` -- `AdminLayout` and `EmployeeLayout` nav; add an Upskilling `NavLink` to both; leave `EmployeeStepLayout`.
- `web/src/app/icons.tsx` -- add an icon path entry; `web/src/app/copy.ts` -- `copy.nav.upskilling` and a `copy.upskilling` block (title, empty, column names).
- `web/src/app/router.ts`, `web/src/app/App.tsx`, `web/src/app/routes.ts` -- there is no access mode for any signed-in user: add `'user'` access; the forbidden check and the pending-step redirect must not block it wrongly, and a shared page uses the role's `UserLayout`.
- `web/src/features/progress/ProgressBar.tsx` (reuse), `web/src/app/PageHeader.tsx`, `app/PageStates`, `web/src/features/notifications/Notices.tsx` (list-page pattern), `web/src/features/mentors/RegistrationDecisions.tsx` (table pattern).
- `web/src/features/progress/Upskilling.tsx` and `routes.ts` -- NEW page and route; `web/src/api/progress.ts` and `api/types/progress.ts` -- `listUpskilling()` and `UpskillingRow`.
- Tests to update or copy: `web/src/app/roles.test.tsx` (nav link lists), `features/accounts/Home.test.tsx`, Admin nav tests, `features/notifications/Notices.test.tsx`, `test/api.ts` (`stubApi`).

## Tasks & Acceptance

**Execution:**
- [ ] `Matching/Queries/UpskillingList.php`, `UpskillingController.php`, resource, route -- the read-only list for any signed-in user
- [ ] web `'user'` access in router and App, the Upskilling page and route -- one page both roles can open
- [ ] both top bars, icon, copy, API client and type -- the link and strings
- [ ] `api/tests/Feature/Matching/UpskillingListTest.php` and web tests, updating existing nav assertions -- cover every I/O row

**Acceptance Criteria:**
- Given two Learners In progress and one Not yet started, when Priya or Admin opens Upskilling, then both see exactly the two In progress rows sorted by name, with no counts, sorting controls or actions.
- Given a signed-out visitor, then the API answers 401 and the page redirects to sign in.
- Given Admin opens it, then the response holds no Request or Match ids, Mentor names or routes.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

Status comes only from `ProgressStatus`, so the list can never disagree with the bar on Home or the Course page. Because a Course Completed Learner stays In progress until epic 3's Gold pass, they stay listed.

## Verification

**Commands:** (Windows. Prepend PHP to PATH first: `C:\Users\LENOVO\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.5_Microsoft.Winget.Source_8wekyb3d8bbwe`. Run phpunit directly: `php -d extension_dir=<that folder>\ext -d extension=pdo_sqlite -d extension=sqlite3 vendor/phpunit/phpunit/phpunit --filter 'Matching|Notif|Progress'` from `api/`, because `php artisan test` loses the flags. No MySQL is needed. On web, a plain `npm test` fails here because `./Router` resolves to `router.ts`; run vitest with a temporary config that fixes the resolution, and delete it afterwards. Do not touch git: no commits, no branches, no pushes. The working tree has unrelated changes you must leave alone.)
- phpunit as above -- expected: all pass
- `npx vitest run` (from `web/`, with the temporary config) -- expected: all pass

**Manual checks (if no CLI):**
- Open Upskilling as an Employee and as Admin on the local stack.
