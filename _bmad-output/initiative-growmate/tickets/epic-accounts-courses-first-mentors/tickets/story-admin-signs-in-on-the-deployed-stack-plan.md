---
title: 'Admin signs in on the deployed stack'
type: 'feature'
ticket: '1'
created: '2026-11-10'
status: 'built'
baseline_revision: 'cc4e8f3d454abdbe13f5fb1f49cd84173ff3d020'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md'
  - '{project-root}/_bmad-output/initiative-growmate/ux-growmate/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no code yet. Every later story needs a running stack, sign-in, a SPA shell and an end-to-end harness to build on.

**Approach:** Tracer bullet through every layer (epic 1, entry 1; covers R1 Admin part, R10, R11 Admin top bar): a Docker Compose stack (api, web, mysql) for `local`, `e2e` and `production`; a Laravel 13 API with Sanctum SPA cookie sessions; a bare React SPA where the seeded Admin signs in, sees an empty Admin Courses page and signs out; and a Playwright harness that resets and reseeds the e2e database before each run.

## Boundaries & Constraints

**Always:**
- AD-1: one origin; `web` nginx serves the SPA and proxies `/api` and `/sanctum` to `api`; no CORS, no API URL in the build.
- AD-9: Sanctum cookie sessions (`GET /sanctum/csrf-cookie`, then the login POST); `auth:sanctum` on protected routes; `users.is_admin`; admin routes under `/api/v1/admin/*` behind one `admin` gate; nothing auth-related in `localStorage`; no `dangerouslySetInnerHTML`.
- AD-10: `JsonResource` responses, snake_case, the one error shape (422 with `errors`).
- AD-3: code under `api/app/Modules/Accounts/` (Actions, Http, Policies, Database/Seeders); controllers call one Action.
- AD-17: configuration only from env vars; `.env` never committed; migrations as a one-shot `api` command; `DatabaseSeeder` calls module seeders in order Accounts → Courses → Mentors → Matching → Assessments (only Accounts exists now).
- Admin is seeded from `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` in every environment, idempotently; no demo data in `production`.
- All user-facing strings in `web/src/app/copy.ts`; styling is plain CSS with DESIGN.md tokens (light and dark tokens defined; the toggle is entry 11).
- The Admin top bar shows only links to built pages (Courses), plus the name and Sign out.

**Decisions (2026-11-10):**
- Sign-in is `POST /api/v1/login` and `POST /api/v1/logout`, proxied with the rest of `/api`; AD-9's "`POST /login`" is read as this path.
- Admin Courses is a static "No courses yet." page with no API call; entry 2 adds the real list.
- Playwright runs in its own container (official image matching 1.64) in the e2e override, started by `e2e/run.sh` after it resets and reseeds the database.
- `local` is the same stack from built images; live-reload dev servers come later.

**Never:** Employee signup (entry 3), theme toggle, page header or page states (entry 11), Course data or New Course (entry 2), the test clock (epic 2), Inertia/Blade UI, a UI component library, API tokens.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin signs in | seeded email + password | session cookie set; SPA shows Admin Courses with "No courses yet." | — |
| Wrong password | seeded email, bad password | stays on Sign in, generic message | 422 `{message, errors.email}`; no hint which field was wrong |
| Signed out, protected call | `GET /api/v1/me` without session | SPA shows Sign in | 401 |
| Non-admin on admin route | session of a non-admin user | refused | 403 from the `admin` gate |
| Sign out | Sign out clicked | session invalidated; back to Sign in; `/api/v1/me` → 401 | — |
| Seeder rerun | `db:seed` twice | still exactly one Admin | idempotent upsert by email |

</frozen-after-approval>

## Code Map

Greenfield: only `README.MD` (legacy brief, not a source), `docs/`, `skills/`, `_bmad*/`. No `.gitignore`. Host tools: Docker 29 / Compose v5.6, PHP 8.4 + Composer 2.8, Node 20.19 (starters only; images use PHP 8.5, Node 26).

## Tasks & Acceptance

**Execution:**
- [x] HITL — user runs `composer create-project laravel/laravel api` and `npm create vite@latest web -- --template react-ts` at the repo root, then `php artisan install:api` in `api/`; commit the untouched starters first.
- [x] `.gitignore`, `.env.example` (root) -- ignore `.env*` except examples, `node_modules`, `vendor`, Playwright output; document every env var -- AD-17.
- [x] `docker-compose.yml`, `docker-compose.e2e.yml` -- `mysql:8.4`, `api` and `web` built from repo Dockerfiles, `web` on host port 8080; the e2e override sets `APP_ENV=e2e` and adds the Playwright service -- one stack, three environments.
- [x] `api/Dockerfile`, `api/docker/` -- `php:8.5-fpm` with pdo_mysql, nginx in the same image, entrypoint starting both -- AD-17.
- [x] `web/Dockerfile`, `web/nginx.conf` -- Node 26 build stage, nginx serving `dist/` with SPA fallback and proxies for `/api` and `/sanctum` -- AD-1.
- [x] `api/bootstrap/app.php`, `api/config/sanctum.php`, `api/config/session.php` -- `statefulApi()`, database sessions, stateful domain from env.
- [x] `api/app/Modules/Accounts/` -- `Actions/SignIn`, `Actions/SignOut`, `Http/` controllers and `UserResource` (`id, name, email, is_admin`), `Policies` + `admin` gate, `Database/Seeders/AccountsSeeder` (Admin from env) -- R1 Admin part.
- [x] `api/database/migrations/*_add_is_admin_to_users.php`, `api/database/seeders/DatabaseSeeder.php`, `api/routes/api.php` -- `/api/v1/login`, `/api/v1/logout`, `/api/v1/me`, `/api/v1/admin/ping` (gate test only).
- [x] `api/tests/Feature/Accounts/` -- one test per I/O row.
- [x] `web/src/app/` (`router`, `layout`, `session`, `copy.ts`, `tokens.css`), `web/src/api/client.ts`, `web/src/api/types/accounts.ts`, `web/src/features/accounts/SignIn.tsx`, `web/src/features/courses/AdminCourses.tsx` -- R11 Admin top bar.
- [x] `e2e/` (`package.json` with `@playwright/test` 1.64, `playwright.config.ts`, `tests/admin-sign-in.spec.ts`, `run.sh`) -- `run.sh` runs `migrate:fresh --seed` in the e2e `api` container, then the Playwright service -- R10.

**Acceptance Criteria:**
- Given the e2e stack is up, when `e2e/run.sh` runs, then the database is reset and reseeded and the Admin sign-in test passes (sign in, see "No courses yet.", sign out).
- Given `APP_ENV=production` and built images, when the stack starts and migrations and seeders run, then Admin can sign in and the database holds no other user.
- Given any environment other than `e2e`, when the stack runs, then no Playwright service and no testing route exist.

## Implementation Notes

- Env contract (root `.env`, read by Compose; the user writes the real one from `.env.example`): `APP_ENV`, `APP_KEY`, `APP_URL=http://localhost:8080`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `SANCTUM_STATEFUL_DOMAINS=localhost:8080`, `SESSION_DOMAIN=localhost`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Containers get config only from these; `api/.env` from the starter is ignored by the images (exclude it via `.dockerignore`).
- HITL starters are committed as 47d219800587e8369d3db93463417f8f35d4b451 (laravel/framework ^13.17, laravel/sanctum ^4.0 via install:api; react ^19.3.1, vite ^8.3.6, typescript ~6.0.3); build on them, don't re-run them. The user writes the real root `.env` after `.env.example` exists; for your own verification runs, create a throwaway root `.env` with dev values and delete it afterwards.
- Correction (2026-11-11, host port conflict): port 8080 is taken on the dev host by an unrelated container, so `web`'s host port is the root env var `WEB_PORT`, default **8180**; the env contract above reads `APP_URL=http://localhost:8180` and `SANCTUM_STATEFUL_DOMAINS=localhost:8180` (plus `WEB_PORT=8180`), and verification uses http://localhost:8180. The GrowMate `mysql` container publishes no host port at all (internal Compose network only), so it never clashes with the user's other MySQL stacks.

## Plan Change Log

- 2026-11-11 (implementation): `web`'s host port is `${WEB_PORT:-8180}` (documented in `.env.example`; see the Implementation Notes correction); `mysql` publishes no host port. Migrations and seeders run as a one-shot `migrate` service (same `api` image) that `api` waits for. The e2e override runs as Compose project `growmate-e2e` (own MySQL volume), adds `web` to the stateful domains and uses a host-only session cookie so Playwright can reach the SPA as `http://web`; the Playwright service is built from `e2e/Dockerfile` (official `v1.64.1-noble` image) and sits behind the `e2e` profile. Added `api/config/accounts.php` (Admin env), `AccountsServiceProvider` (gate), `web/src/api/accounts.ts` (HTTP calls) and per-feature `routes.ts`; the SPA router is a small hand-written History-API router (no dependency). Removed the starter's Blade welcome route/view (AD-1). `phpunit.xml` forces its env (and `$_SERVER`) so container env vars can never point tests at MySQL.
- 2026-11-11 (review fixes): `User` moved to `App\Modules\Accounts\Models\User` (AD-3), with `#[UseFactory]` and an explicit `UserFactory::$model`. The Admin seeder updates the one existing `is_admin` row (even when `ADMIN_EMAIL` changes), else creates it. A login that has no session (non-stateful origin) gets a 403 `{message}`. The e2e override resets `web`'s host ports, so e2e runs beside the local stack. Sign-out clears the local user and returns to Sign in even if the API refuses. Lexend and Nunito Sans are self-hosted through `@fontsource-variable/*`.

## Review Triage Log

### Review pass 1 (quick lens, 2026-11-11) — high 0, medium 5, low 2, false 1, rejected 1, defer 1

| # | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|
| 1 | e2e and local stacks both publish `${WEB_PORT:-8180}` | medium | patch | base `web.ports` is inherited unchanged by the `growmate-e2e` project; `run.sh`'s `up --wait` fails while `growmate` runs |
| 2 | e2e `page.request.get('/api/v1/me')` after sign-out proves nothing | low | patch | APIRequestContext sends no Referer/Origin, so `EnsureFrontendRequestsAreStateful` starts no session and the call is 401 either way |
| 3 | Non-stateful `POST /api/v1/login` → 500 | medium | patch | `statefulApi()` adds session middleware only for stateful origins; `SignInController` then calls `$request->session()`, which throws "Session store not set" |
| 4 | Failed sign-out leaves the user stuck | medium | patch | `SessionProvider.signOut` awaits `accounts.signOut()` with no catch; on 401/419 `setUser(null)` never runs and `handleSignOut` rejects unhandled |
| 5 | Non-admin who signs in sees nothing | false | reject | no non-admin can exist in this change: only `AccountsSeeder` creates users and signup is entry 3 |
| 6 | DESIGN.md fonts never loaded | low | patch | `--font-heading`/`--font-body` name Lexend and Nunito Sans but nothing ships them; every screen falls back to system-ui |
| 7 | Changing `ADMIN_EMAIL` creates a second Admin | medium | patch | seeder upserts by email only; the old row keeps `is_admin = true`, breaking C2 |
| 8 | `User` model outside `app/Modules/Accounts` | medium | patch | AD-3 gives each module its `Models/`; leaving `App\Models\User` means Mentors and Matching will import the model directly instead of Accounts' Queries |
| 9 | Laravel Boost install skipped (`api/AGENTS.md`, `api/CLAUDE.md`) | — | defer | fix edits agent-context tooling the starter added; not in intent; the user decides |
| 10 | Plan Verification still says port 8080 | — | reject | fix edits this build's plan |

## Design Notes

Login lives at `/api/v1/login` rather than AD-9's literal `POST /login`, so the AD-1 proxy list (`/api`, `/sanctum`) stays complete.

## Verification

**Commands:**
- `docker compose exec api php artisan test` -- expected: all Accounts feature tests pass.
- `./e2e/run.sh` -- expected: database reset, Playwright test green.
- `docker compose -f docker-compose.yml up -d --build` with `APP_ENV=production` -- expected: Admin signs in at http://localhost:8080.
