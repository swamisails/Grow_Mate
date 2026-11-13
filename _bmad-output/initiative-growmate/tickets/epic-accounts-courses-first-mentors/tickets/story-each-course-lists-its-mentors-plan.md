---
title: 'Each Course lists its Mentors'
type: 'feature'
ticket: '5'
created: '2026-11-13'
status: 'built'
baseline_revision: '0240fc7ee9b8c6d0695ee7fff995fc1e57dbaf7a'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md'
  - '{project-root}/_bmad-output/initiative-growmate/ux-growmate/DESIGN.md'
  - '{project-root}/_bmad-output/initiative-growmate/ux-growmate/mockups/course-page.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing records who is a Mentor for a Course, so a Course page can't list them and later epics have no grant operation to call.

**Approach:** Create the Mentors module: the `mentor_routes` record, the single `GrantMentor` Action (first route kept), and an Employee-only Course Mentors endpoint and card on the Course page listing every Mentor except the viewer, without the route. Seed demo Employees and grants after Courses. Covers epic 1 R7 and R8.

## Boundaries & Constraints

**Always:** `mentor_routes` is unique on (`user_id`, `course_id`), with a route of `gold_pass`, `registration_approval` or `group_assignment_accepted` (a string-backed enum). Only `Mentors\Actions\GrantMentor` writes it, in one transaction. A repeat grant changes nothing, and a concurrent duplicate insert is treated as the same no-op. "Is a Mentor" is answered only by `Mentors\Queries`. Mentors never imports another module's Models or tables (AD-3): Course lookups go through Courses Queries (`PublishedCourse` for the 404, `PublishedCourses` for the seeder), and names and Employee creation go through new Accounts Query and Action classes. The endpoint is `GET /api/v1/courses/{course}/mentors` in the existing `can:browse` group, with a numeric constraint. It returns `{data: [{id, name}]}` sorted by name then id, excluding the viewer. No response carries `route` (AD-8). The card shows names only, with "No mentors for this course yet." as its empty state, Loading text while it loads, and the generic error otherwise. All wording lives in `copy.ts`. The Mentors seeder runs after Courses, only in `local`/`e2e`, is idempotent, and creates Priya Nair, Rafi Haddad and Imani Okafor through the Accounts Action. It grants Rafi and Imani for Python Basics with `registration_approval`, with no Mentor check or decision rows. Decision (2026-11-13): demo Employees share one fixed password, a constant in `MentorsSeeder` (`demo-password`), with no environment variable.

**Never:** a Request button, eligibility flag, Mentor check, Registration decisions, notices, avatars or initials, any route display, route values in any response, or a change to SignUp's behaviour. Don't touch the dirty `api/.env.example` or the untracked walkthrough folder.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| List | Employee opens a published Course with Mentors | Names alphabetically, viewer excluded, no route | — |
| Viewer is Mentor | Rafi opens Python Basics | Imani only | — |
| Empty | No Mentors, or only the viewer | "No mentors for this course yet." | — |
| Hidden | Draft or unknown id | Same as missing | 404 |
| Bad id | `/courses/abc/mentors` | Not found | 404 |
| Access | Guest; Admin | No access | 401; 403 |
| Repeat grant | Same pair, different route | First route kept, one row | No error |
| Reseed | Seeder runs twice | No duplicate users or grants | — |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Courses/` -- the pattern to copy: invokable controllers that take `int $course` plus an injected Query, Resources with `@mixin` and `@return array{}` shapes, a string-backed `ErrorCode` enum, and a provider that registers policies only. `Queries/PublishedCourse::handle` gives the draft/unknown 404. `Queries/PublishedCourses` gives the seeder its title-to-id lookup. Don't change Courses.
- `api/app/Modules/Accounts/Actions/SignUp.php` -- sets `is_admin=false` outside fillable and lowercases the email. Copy that for the new `CreateEmployee`; leave SignUp as it is. `Queries/EmailIsTaken` shows the Query style.
- `api/routes/api.php` L29-32 -- the `can:browse` group; add the Mentors route here.
- `api/database/migrations/2026_11_12_000000_create_courses_tables.php` -- migration style: FK `constrained()->cascadeOnDelete()`, composite unique.
- `api/database/seeders/DatabaseSeeder.php` -- append `MentorsSeeder` after `CoursesSeeder`. `CoursesSeeder` shows the env gate, Action-only writes and idempotency.
- `api/bootstrap/providers.php` -- register `MentorsServiceProvider` if the module needs one.
- `api/tests/Feature/Courses/CoursesTestCase.php`, `PublishedCoursesTest.php`, `CoursesSeederTest.php` -- test helpers, the 401/403/404 pattern and the env-switching seeder tests to mirror.
- `web/src/features/courses/CoursePage.tsx` -- the load-state pattern and Description card markup (`.card`, `.card__header`, `.card__body`, `.card__empty`). It has no grid yet.
- `web/src/api/courses.ts`, `web/src/api/types/courses.ts`, `web/src/app/copy.ts`, `web/src/app/styles.css` -- the API helper pattern and the copy and style locations. There's no list-row or two-column grid class yet.
- `web/src/features/courses/EmployeeCourses.test.tsx` -- holds the Course-page tests and its `open()` fetch stub. The assertion `queryByText('Mentors')).toBeNull()` must change.
- `e2e/run.sh`, `e2e/tests/course-publishing.spec.ts` -- the reseed flow and per-spec `signIn` helpers.

## Tasks & Acceptance

**Execution:**
- [x] `api/database/migrations/2026_11_13_000000_create_mentors_tables.php`, `api/app/Modules/Mentors/Models/{MentorRoute,Route}.php`, `api/database/factories/MentorRouteFactory.php` -- add the record, the route enum and the factory.
- [x] `api/app/Modules/Mentors/Actions/GrantMentor.php` -- `handle(int $userId, int $courseId, Route $route): void`. Insert-or-ignore inside a transaction.
- [x] `api/app/Modules/Accounts/Actions/CreateEmployee.php`, `Queries/{EmployeeIdByEmail,UserNames}.php` -- create an Employee with no session, look up an id by email, and map ids to names.
- [x] `api/app/Modules/Mentors/Queries/CourseMentors.php`, `Http/Controllers/CourseMentorsController.php`, `Http/Resources/CourseMentorResource.php`, `api/routes/api.php` -- the endpoint.
- [x] `api/app/Modules/Mentors/Database/Seeders/MentorsSeeder.php`, `api/database/seeders/DatabaseSeeder.php` -- the demo Employees and grants.
- [x] `api/tests/Feature/Mentors/` and `api/tests/Feature/Accounts/CreateEmployeeTest.php` -- the matrix, all three route values, first route kept, no `route` key, and seeder env/idempotency tests.
- [x] `web/src/api/{mentors.ts,types/mentors.ts}`, `web/src/features/mentors/CourseMentors.tsx`, `web/src/features/courses/CoursePage.tsx`, `copy.ts`, `styles.css` -- the Mentors card in a two-column card grid, with `list-row` rows.
- [x] `web/src/features/courses/EmployeeCourses.test.tsx` (or a new `web/src/features/mentors/CourseMentors.test.tsx`) -- rows, empty state and the error state.
- [x] `e2e/tests/course-mentors.spec.ts` -- signed in as Rafi, Python Basics lists Imani and not Rafi, and Git Essentials shows the empty state. Check that existing specs still pass with the seeded "Priya Nair".

**Acceptance Criteria:**
- Given the seeded e2e stack, when a demo Mentor opens Python Basics, then every other Mentor is listed and the route appears neither on screen nor in the API response.
- Given `GrantMentor` is called twice for one pair with different routes, then one row remains with the first route.
- Given `php artisan db:seed` in production, then no demo Employees or grants exist.

## Implementation Notes

- `GrantMentor` inserts with `create` inside `DB::transaction`, which is a savepoint when a caller's transaction is open. It catches `UniqueConstraintViolationException` as the no-op and never reads the row back, so a concurrent duplicate committed outside the caller's REPEATABLE READ snapshot can't cause a rethrow. This is the insert-or-ignore behaviour without MySQL `INSERT IGNORE`, which would also swallow foreign-key failures. A grant for a missing user or Course still throws.
- `CourseMentors` (Mentors Query) calls `Courses\Queries\PublishedCourse` for the 404, reads `user_id`s from `mentor_routes` excluding the viewer, maps names through `Accounts\Queries\UserNames`, then sorts in PHP (`strcasecmp` on name, then id) so the order doesn't depend on DB collation. `Accounts\Actions\CreateEmployee` returns the new id (an `int`), so Mentors never touches the `User` model.
- `EmployeeIdByEmail` matches Employees only (never the Admin), case-insensitively, like `EmailIsTaken`.
- Demo emails: `priya.nair@example.com`, `rafi.haddad@example.com`, `imani.okafor@example.com`; password `MentorsSeeder::DEMO_PASSWORD` (`demo-password`).
- No `MentorsServiceProvider`: the endpoint reuses the Courses `browse` policy, and the module registers nothing else.
- SPA: `.card-grid` (two columns, 28px gap) holds the Description card (when present) and the Mentors card. `.list` and `.list-row` are generic DESIGN.md list rows. `CourseMentors` is keyed by Course id, so switching Course resets it to Loading.

## Plan Change Log

## Review Triage Log

Loop 1 (quick lens). Verdicts: 1 medium, 1 low, 1 false.

| # | Location | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | `api/app/Modules/Mentors/Actions/GrantMentor.php` | A concurrent duplicate grant inside a caller's transaction can rethrow instead of being a no-op | medium | Laravel `createOrFirst` catches the unique violation and then calls `where($attributes)->first() ?? throw $e`. On MySQL REPEATABLE READ, a caller transaction that has already read has a snapshot that hides a row committed concurrently, so `first()` returns null and the violation is rethrown. That breaks the Always rule "a concurrent duplicate insert is treated as the same no-op" for the AD-13 `AcceptRequest` caller. Fix: insert in a savepoint, catch the violation, no read-back | patch |
| 2 | `GrantMentor.php` + `Accounts/Queries/UserNames.php` | An Admin id passed to GrantMentor would list the Admin as a Mentor | false | No caller can pass an Admin id. All three routes are Employee-only by policy: Registration approval (Mentor check is behind `browse`), Gold pass (Assessments) and Group assignment (the chosen Employee). The guard would protect a state nothing can reach | rejected |
| 3 | `api/app/Modules/Mentors/Database/Seeders/MentorsSeeder.php` | `ADMIN_EMAIL` equal to a demo email makes `db:seed` fail in local/e2e | low | Real only when `ADMIN_EMAIL` is set to one of the three `@example.com` demo addresses. That is unlikely in everyday use, and the fix would add guard logic | rejected |

## Verification

Results (2026-11-13): `php artisan test --compact` gave 89 passed. Pint was clean. `npm run lint` and `npm run build` were clean. `npm test` gave 68 passed. Under full-suite load, `SignUp.test.tsx` and `roles.test.tsx` fail intermittently, and they fail the same way on the baseline commit. `./e2e/run.sh` gave 29 passed, including `course-mentors.spec.ts`. It ran with the root env taken from the running e2e containers, because no root `.env` exists.

After the review patch (2026-11-13), `GrantMentor` now uses a savepoint insert and catches the unique violation. The API tests passed (89), Pint was clean, and web lint, test (68) and build were clean. `./e2e/run.sh` was not re-run after the patch, because the e2e stack was down and no root `.env` exists; the seeder's GrantMentor path is covered by `MentorsSeederTest`.

**Commands:**
- `cd api && php artisan test --compact && vendor/bin/pint --dirty --format agent` -- expected: green, no style diffs.
- `cd web && npm run lint && npm test && npm run build` -- expected: clean.
- `./e2e/run.sh` -- expected: the full suite passes on the reseeded e2e stack.
