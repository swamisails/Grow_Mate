---
title: 'Refactor sweep (epic 1)'
type: 'refactor'
ticket: '9'
created: '2026-11-16'
status: 'built'
baseline_revision: '22ae71b9b512eb0514ad6cdadf5b4be850c49dfc'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 1's stories each copied what they needed. Four API test bases repeat the same setup, and a shared web test stub lives inside the Courses feature. Up to six e2e specs carry their own sign-in and API helpers. The Employee route group borrows the Courses `browse` policy, so Mentors and Notifications routes depend on Courses for access, which goes against AD-3's one-way dependencies.

**Approach:** Epic 1, entry 9: cleanup only, with no behaviour change. Each item below changes structure, not responses, copy or rules. The API tests, the web tests and the Playwright harness all pass unchanged in what they assert.

## Boundaries & Constraints

**Always:**
- **The Employee gate:** Accounts defines a gate `employee` (not Admin) beside `admin`. The `/api/v1` Employee group uses `can:employee`. Guests still get 401 and Admin still gets 403, before any lookup.
  - The Courses `browse` policy method goes, along with its registration if nothing else uses it.
  - `PublishedCoursesTest`'s gate assertions move to the `employee` gate.
  - The comment in `SubmitMentorCheckRequest` follows the change.
- **One API test base:** `Tests\Feature\ApiTestCase` holds `RefreshDatabase` and the Sanctum stateful and Referer setup. The Accounts, Courses, Mentors and Notifications test cases extend it and keep only their own helpers.
- **One web test stub:** `web/src/features/courses/testApi.ts` moves to `web/src/test/api.ts`, and every importer is updated. Its content is unchanged.
- **One e2e helper module:** `e2e/tests/support/helpers.ts` holds the helpers duplicated across specs: `signIn`, `signUp`, `signOut`, `adminSignIn`, `apiRequest`, `newEmployee` and `newPage`. Specs import them and keep any helper that is truly theirs.
  - Where copies differ (default secret, a URL wait), the shared helper takes a parameter, so each spec keeps its exact current steps and assertions.
  - No assertion is removed or weakened.

**Decisions (2026-11-16):**
- The e2e helper extraction stays in scope. Docker will be up for implementation. `./e2e/run.sh` runs on the baseline before any change and again after, and both runs must pass. If the stack can't run, implementation stops before the e2e item rather than shipping it unverified.
- Laravel Boost stays deferred; `api/AGENTS.md` and `api/CLAUDE.md` are untouched.
- **Flaky Home session-expiry test.** The baseline run on `22ae71b9` gave 39 passed and 1 failed. The failure was "when the session expires on Home, Sign in returns to it" in `e2e/tests/employee-accounts.spec.ts`, and it failed 1 of 5 when rerun on its own.
  - **Likely cause:** the test clears cookies as soon as the URL is `/home`, while Home's own `GET /api/v1/registration-decisions` (added in 1.8) can still be in flight. That response's Set-Cookie restores the session.
  - **Fix in this sweep:** that test waits for Home's `GET /api/v1/registration-decisions` response before `context.clearCookies()`. This is test-only, adds a wait and loosens no assertion.
  - **The "before" requirement** is met by those 39 passing tests plus the passing reruns of this one.

**Never:** a change to any response, status code, copy, route path or rule; new features; the rejected review findings (each was rejected on purpose); the dirty `api/.env.example` or the untracked walkthrough folder.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Employee routes | Employee calls courses, mentors, mentor-check, registration-decisions, notices | Same responses as before | — |
| Admin on Employee routes | Admin calls any of them | Same as before | 403 |
| Guest on Employee routes | No session | Same as before | 401 |
| Suites | API, web, e2e after the sweep | Same tests pass; assertion counts don't drop | — |

</frozen-after-approval>

## Code Map

- `api/routes/api.php` L37 -- `Route::middleware('can:browse,'.Course::class)`: the Employee group to switch to `can:employee`. The `Course` import may become unused.
- `api/app/Modules/Accounts/{AccountsServiceProvider.php,Policies/AdminPolicy.php}` -- `Gate::define('admin', [AdminPolicy::class, 'admin'])`; add `employee` the same way (rename the policy only if that's clearer, for example to `RolePolicy`).
- `api/app/Modules/Courses/{Policies/CoursePolicy.php,CoursesServiceProvider.php}` -- `browse` is used only by the route group. `publish` stays, since it's used on the publish route.
- `api/tests/Feature/Courses/PublishedCoursesTest.php` L33-48 -- the gate assertions on `browse`.
- `api/app/Modules/Mentors/Http/Requests/SubmitMentorCheckRequest.php` L15 -- the comment naming the `browse` policy.
- `api/tests/Feature/{Accounts,Courses,Mentors,Notifications}/*TestCase.php` -- each repeats the `setUp` with `RefreshDatabase`, `sanctum.stateful` and the Referer.
- `web/src/features/courses/testApi.ts` -- imported by the courses tests and by `features/mentors/*.test.tsx` and `features/notifications/Notices.test.tsx`.
- `e2e/tests/*.spec.ts` -- `signIn` is defined in 6 specs with different signatures (`course-drafts`: page only; `app-shell`: password default; `course-mentors`: email; others: email and secret). `signUp`, `adminSignIn`, `apiRequest` and `newEmployee` each appear in 4. `playwright.config.ts` has `testDir: './tests'`, so `tests/support/helpers.ts` (with no `.spec`) isn't collected as a spec.

## Tasks & Acceptance

**Execution:**
- [x] `api/app/Modules/Accounts/...`, `api/routes/api.php`, `api/app/Modules/Courses/{Policies/CoursePolicy.php,CoursesServiceProvider.php}`, `api/tests/Feature/Courses/PublishedCoursesTest.php`, `SubmitMentorCheckRequest.php` -- the `employee` gate.
- [x] `api/tests/Feature/ApiTestCase.php` + the four `*TestCase.php` -- one base.
- [x] `web/src/test/api.ts` + importers -- move the stub.
- [x] `e2e/tests/support/helpers.ts` + the specs -- shared helpers, plus the session-expiry test's wait (see Decisions). Then run `./e2e/run.sh`; every spec passes.

**Acceptance Criteria:**
- Given the sweep, when `php artisan test` runs, then the same number of tests pass as on the baseline (157), with no fewer assertions.
- Given the sweep, when `npm test` runs, then the same 110 tests pass.
- Given the sweep, when `./e2e/run.sh` runs, then every spec passes, and so did the baseline run just before it.
- Given `grep -rn "browse" api/app api/routes`, then nothing refers to the `browse` policy.

## Implementation Notes

- **Running the stack:** `./e2e/run.sh` needs Docker running and a root `.env`, and neither exists at planning time. Entries 5 and 6 ran it with `docker compose --env-file` pointing at a scratch env file. Ask the human for the env values rather than inventing them.
- **Stack now available (2026-11-16):** Docker is up. A complete env file, rebuilt from the running e2e containers' own settings, is at `/tmp/claude-1000/-home-swami-Practice-GROW-MATE/bc99668a-b40f-4319-a331-7c0dc5c3d0c3/scratchpad/e2e.env`. Don't copy it into the repo.
  - Run from the repo root with `set -a && . <that file> && set +a && ./e2e/run.sh --reporter=line`.
  - The baseline run is done (see the frozen Decisions), so don't rerun it.

## Plan Change Log

- 2026-11-16: Items 1–3 done. The e2e item is not started: Docker Desktop's engine wasn't running and there is no root `.env`, so the baseline `./e2e/run.sh` couldn't run. Per the Decisions, implementation stopped before it. `AdminPolicy` was renamed `RolePolicy`, since it now holds both the `admin` and `employee` gates.
- 2026-11-16: The e2e item is done now that the stack is up. The session-expiry test awaits Home's `GET /api/v1/registration-decisions` before clearing cookies. `helpers.ts` also holds `admin` (from the env), `employeePassword`, `publishCourse` and `decisionsRead`, each duplicated across specs. `./e2e/run.sh` gave 40 passed, and the session-expiry test alone passed 10 of 10.

## Review Triage Log

Loop 1 (quick lens). Verdicts: 0 high, 0 medium, 1 low, 0 false.

| # | Location | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | `e2e/tests/course-publishing.spec.ts` L30–39, L87–94; `e2e/tests/mentor-check.spec.ts` L107–116 | Inline copies of sign-up (with a literal `'employee-password'`), of `newPage` and of `publishCourse`'s document and calls remain | low | Confirmed by reading both specs. A change to the password or the Course document would need edits in three places, which goes against the sweep's intent of one helper module. Fix: use the shared helpers, with `publishCourse` returning the id | patch |

## Verification

**Commands:**
- `cd api && php artisan test --compact && vendor/bin/pint --dirty --format agent` -- expected: green, 157 tests, no style diffs.
- `cd web && npm run lint && npm test && npm run build` -- expected: clean, 110 tests.
- `./e2e/run.sh` -- expected: the full suite passes before and after.
