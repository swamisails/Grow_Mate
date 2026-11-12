---
title: 'Employees sign up, sign in and sign out'
type: 'feature'
ticket: '3'
created: '2026-11-12'
status: 'built'
baseline_revision: '139858643d2c04ad7cc304f8ce149ddef3e694e2'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Only the seeded Admin can use the app. Employees can't create accounts, and the SPA has no Employee pages, top bar or routing. The Mentor check (entry 6), the Employee Courses list (entry 4) and every later epic need signed-in Employees.

**Approach:** Epic 1, entry 3; covers R1 (Employee part) and R11 (Employee top bar).
- **API:** a sign-up endpoint that creates an Employee (never an Admin) and starts the session.
- **SPA:**
  - Sign up, linked from Sign in.
  - An `employee` route access.
  - An Employee top bar with only Home linked.
  - An empty Home page where an Employee lands after sign-up or sign-in.
  - Sign out.

## Boundaries & Constraints

**Always:**
- **API rules:**
  - AD-3: the code lives in `api/app/Modules/Accounts/` as an `Actions/SignUp` and a controller that calls it.
  - AD-9: Sanctum cookie session, stateful origin only. Without a session the API answers 403, as Sign in already does. The response is `UserResource`.
  - Signup always creates `is_admin = false`. A request field named `is_admin` is ignored.
  - Password rules are Laravel's `Password::defaults()`.
  - A duplicate email is refused with a 422 on `email`. The duplicate check is case-insensitive, and emails are stored lowercased.
- **Routing:**
  - Signed out on an Employee page: Sign in, carrying the return path.
  - Signed in as either role on Sign in or Sign up: go to the return path, or home.
  - An Employee on an Admin page, or Admin on an Employee page: Not found (entry 11's 403 = 404).
- **SPA conventions:** use entry 11's primitives (`PageHeader`, `fieldErrors`, `focusFirstInvalid`). All strings go in `copy.ts`.
- **Employee top bar:**
  - Left: "GrowMate" (a link to Home), then the Home link.
  - Right: the theme toggle, the Employee's name, and Sign out.
  - Only built pages are linked.

**Decisions (2026-11-12):** the plan is kept whole (~2,000 tokens) by choice; no split.

**Never:** the Mentor check step or card (entry 6); Courses, Notices, Requests or Upskilling links (later entries); email verification, password reset or SSO (C2); any way to create or promote an Admin through the API.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sign up | new name, email, valid password | Employee created, signed in; SPA lands on Home under the Employee bar | — |
| Duplicate email | email of an existing user, any case | refused under Email | 422 `email` |
| Weak or missing fields | blank name, bad email, short password | each refused under its field; focus on the first | 422 per field |
| Admin smuggling | body includes `is_admin: true` | account created as an Employee | ignored |
| Employee sign in / out | Employee signs out, then back in | Sign in → Home; Sign out → Sign in; `/home` afterwards → Sign in with return | — |
| Wrong role | Employee opens `/admin/courses`; Admin opens `/home` | Not found in the user's own layout | 403 from the admin API |
| Signed in on Sign up | an Employee opens `/sign-up` | goes to Home | — |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Accounts/Http/Controllers/SignInController.php` -- the pattern to copy: an `abort_unless($request->hasSession(), 403, …)` guard, `validate`, then one Action and a `UserResource`.
- `api/app/Modules/Accounts/Actions/SignIn.php` -- `Auth::guard('web')` and `$session->regenerate()`. Sign up logs in the new user the same way.
- `api/app/Modules/Accounts/Models/User.php` -- `#[Fillable(['name','email','password'])]`, with `is_admin` not fillable and the `password` cast hashed. Keep it that way. `UserFactory` has `admin()`.
- `api/routes/api.php` -- add `POST v1/register` beside `login`, outside `auth:sanctum`.
- `api/tests/Feature/Accounts/AccountsTestCase.php` -- the stateful Referer and the `withSessionFrom` helpers.
- `web/src/app/router.ts` -- `Access = 'guest' | 'admin'`. Add `'employee'`.
- `web/src/app/App.tsx`:
  - `UserLayout` picks Admin or Bare.
  - The guest branch fires only for `user?.is_admin`; make it fire for any signed-in user.
  - The admin-route branches need employee twins.
- `web/src/app/session.ts` -- `homePath` returns `/sign-in` for anyone who isn't Admin. Employees go to `/home`. `SessionValue` gains `signUp`.
- `web/src/app/SessionProvider.tsx`, `web/src/api/accounts.ts` -- add `signUp` beside `signIn`. It fetches the CSRF cookie first.
- `web/src/app/layout.tsx` -- `AdminLayout` has the nav, toggle, name and Sign out pattern. Add an `EmployeeLayout` alongside it.
- `web/src/features/accounts/SignIn.tsx` -- the form pattern with per-field 422s. Add a "Sign up" link.
- `e2e/tests/*` -- `run.sh` resets the database. Use a unique email per test run.

## Tasks & Acceptance

**Execution:**
- [x] `api/app/Modules/Accounts/Actions/SignUp.php`, `Http/Controllers/SignUpController.php`, `api/routes/api.php` -- validate the request, then create the Employee with a lowercased email, then log in and regenerate the session. The response is 201 with a `UserResource`.
- [x] `api/tests/Feature/Accounts/SignUpTest.php` -- one test per API-side I/O row, plus "can sign in afterwards" and the no-session 403.
- [x] `web/src/app/router.ts`, `App.tsx`, `session.ts`, `SessionProvider.tsx`, `web/src/api/accounts.ts`, `web/src/api/types/accounts.ts` -- add `employee` access, the role-based layout and home, the guest redirect for any signed-in user, and `signUp`.
- [x] `web/src/app/layout.tsx`, `icons.tsx`, `copy.ts`, `styles.css` -- `EmployeeLayout` (GrowMate links to Home, plus the Home nav link) and the strings.
- [x] `web/src/features/accounts/SignUp.tsx`, `SignIn.tsx`, `routes.ts` -- the Sign up page with Name, Email and Password, and the links between Sign in and Sign up.
- [x] `web/src/features/home/Home.tsx`, `routes.ts`, `web/src/app/routes.ts` -- Home with a Learning card and "You aren't learning a course yet."
- [x] `web/src/**/*.test.tsx` -- routing for each role and the Sign up 422 placement.
- [x] `e2e/tests/employee-accounts.spec.ts` -- cover the browser-side rows: sign up and land on Home; sign out and back in; a duplicate email; the wrong role; and the return after a 401.

**Acceptance Criteria:**
- Given a new Employee, when they land on Home, then the top bar shows GrowMate, Home, the theme toggle, their name and Sign out, and nothing else.
- Given `php artisan test`, `npm run lint`, `npm test`, `npm run build` and `./e2e/run.sh`, when they run, then all pass.

## Implementation Notes

- The duplicate check compares `LOWER(email)`, so a mixed-case stored email (the seeded Admin's, taken from `.env` as typed) still counts. A concurrent sign-up that slips past validation hits the unique index and is turned into the same 422 on `email`.
- The 201 comes from `UserResource` itself (a resource for a just-created model answers 201).
- `AdminLayout` and `EmployeeLayout` share one `SignedInLayout` (bar, toggle, name, Sign out). The Sign in and Sign up fields share `features/accounts/TextField.tsx`; Sign in's markup is unchanged.
- The Sign in and Sign up cross links keep `?return=`, so a Sign up reached from a 401 still returns to the open page.
- App routing tests live in `web/src/app/roles.test.tsx`; the Sign up 422 placement in `web/src/features/accounts/SignUp.test.tsx`.

## Plan Change Log

## Review Triage Log

### Review pass 1 (quick lens, 2026-11-12) — high 0, medium 0, low 3, false 0

| # | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|
| 1 | Array `email` reaches `emailIsFree()` and returns 500, not 422 | low | patch | no `bail`, so the closure runs after `string` fails; `(string)` on an array raises an ErrorException under Laravel's handler (reproduced) |
| 2 | `SignUpController` queries `users` itself, against AD-3 | low | patch | `User::query()->whereRaw('LOWER(email) = ?')` in the controller; later entries copy this controller; fix moves it to an Accounts Query |
| 3 | `web/src/features/home/` is not a module folder | low | patch | architecture Conventions: "SPA feature folders are kebab-case module names" (tree line 322 lists modules only); later entries add module cards to Home; fix moves Home to `features/accounts/` |

## Design Notes

- **Copy the UX docs leave open** (adjust at approval):
  - Sign up title "Sign up". Field labels "Name", "Email", "Password". Submit "Sign up".
  - On Sign in: "No account? Sign up". On Sign up: "Have an account? Sign in".
  - The Home Learning card header is "Learning".
- **Home's empty Learning line has no Courses link yet.** EXPERIENCE gives "You aren't learning a course yet." with a link to Courses, but Courses arrives in entry 4. The ticket's rule "links only to built pages" applies, so entry 4 adds the link.
- **`/home` is the Employee home path.** `/` keeps redirecting to `homePath(user)`.
- **Errors use Laravel's default messages**, e.g. "The email has already been taken." EXPERIENCE says the API `message` is shown unchanged.

## Verification

**Commands:**
- `cd api && php artisan test` -- expected: all pass, including `SignUpTest`.
- `cd web && npm run lint && npm test && npm run build` -- expected: clean.
- `./e2e/run.sh` -- expected: all specs green, including `employee-accounts.spec.ts`.
