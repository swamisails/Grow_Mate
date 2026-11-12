# Walkthrough — Admin signs in on the deployed stack (story 1.1)

Target: commit `a22a86c` on branch `story/1-1-admin-signs-in` — the implementation of story 1.1. The commit before it (`47d2198`) is the untouched Laravel and Vite starters and is not walked through.

Current block: **1 — Intent**

## Blocks

### [ ] 1 — Intent (in progress)

From the story's plan file, [story-admin-signs-in-on-the-deployed-stack-plan.md](../tickets/epic-accounts-courses-first-mentors/tickets/story-admin-signs-in-on-the-deployed-stack-plan.md), verbatim:

> **Problem:** There is no code yet. Every later story needs a running stack, sign-in, a SPA shell and an end-to-end harness to build on.
>
> **Approach:** Tracer bullet through every layer (epic 1, entry 1; covers R1 Admin part, R10, R11 Admin top bar): a Docker Compose stack (api, web, mysql) for `local`, `e2e` and `production`; a Laravel 13 API with Sanctum SPA cookie sessions; a bare React SPA where the seeded Admin signs in, sees an empty Admin Courses page and signs out; and a Playwright harness that resets and reseeds the e2e database before each run.

### [ ] 2 — Broad strokes (not visited)

One Compose stack serves everything from one origin: the browser only ever talks to `web`, which serves the built React app and forwards `/api` and `/sanctum` to the Laravel `api`. Open these in order:

- [docker-compose.yml](../../../docker-compose.yml) — the three services, the one-shot `migrate` step, and which port is published.
- [web/nginx.conf](../../../web/nginx.conf) — the one-origin rule: the SPA plus the two proxied paths.
- [api/routes/api.php](../../../api/routes/api.php) — every endpoint this story adds, and which guard protects each.
- [api/app/Modules/Accounts/Actions/SignIn.php](../../../api/app/Modules/Accounts/Actions/SignIn.php) — how a sign-in becomes a cookie session.
- [web/src/app/App.tsx](../../../web/src/app/App.tsx) — how the SPA decides which page to show for who is signed in.

### [ ] 3 — The stack and its three environments (not visited)

`local` and `production` run the same base file with a different `APP_ENV`; `e2e` layers an override that runs as a separate Compose project with its own database, so its reset never touches local data. Migrations and seeders run once per start in a `migrate` service that `api` waits for.

- [docker-compose.yml:60](../../../docker-compose.yml#L60) — the one-shot `migrate` service (`migrate --force --seed`).
- [docker-compose.yml:43](../../../docker-compose.yml#L43) — MySQL deliberately publishes no host port.
- [docker-compose.yml:83](../../../docker-compose.yml#L83) — `web` on `${WEB_PORT:-8180}`.
- [docker-compose.e2e.yml:7](../../../docker-compose.e2e.yml#L7) — the separate `growmate-e2e` project; [line 25](../../../docker-compose.e2e.yml#L25) drops the host port so both stacks run side by side.
- [api/Dockerfile](../../../api/Dockerfile) — PHP 8.5-FPM and nginx in one image; dev dependencies are skipped when `APP_ENV=production`.
- [api/docker/start.sh:6](../../../api/docker/start.sh#L6) — starts PHP-FPM, then nginx in the foreground.
- [web/Dockerfile](../../../web/Dockerfile) — Node 26 build stage, nginx runtime.

### [ ] 4 — Sanctum cookie sign-in (not visited)

The SPA first fetches `/sanctum/csrf-cookie`, then posts credentials; Sanctum's `statefulApi()` middleware gives requests from the app's own origin a Laravel session, so the "token" is just the session cookie. A request from any other origin has no session and is refused with a 403 before any sign-in is attempted.

- [api/bootstrap/app.php:17](../../../api/bootstrap/app.php#L17) — `statefulApi()` turns on cookie sessions for the SPA.
- [api/app/Modules/Accounts/Http/Controllers/SignInController.php:14](../../../api/app/Modules/Accounts/Http/Controllers/SignInController.php#L14) — the 403 for a non-app origin.
- [api/app/Modules/Accounts/Actions/SignIn.php](../../../api/app/Modules/Accounts/Actions/SignIn.php) — one generic error for a wrong email or password, then the session id is regenerated.
- [api/app/Modules/Accounts/Actions/SignOut.php](../../../api/app/Modules/Accounts/Actions/SignOut.php) — sign out, invalidate the session, rotate the CSRF token.
- [api/routes/api.php:13](../../../api/routes/api.php#L13) — `auth:sanctum` on everything but login; [line 17](../../../api/routes/api.php#L17) — the `admin` gate on `/api/v1/admin/*`.
- [api/app/Modules/Accounts/Policies/AdminPolicy.php](../../../api/app/Modules/Accounts/Policies/AdminPolicy.php) — the gate is just `is_admin`.

### [ ] 5 — The one Admin and the Accounts module (not visited)

Admin is never created through the app: a seeder reads `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` and updates the single Admin row (or creates it), so reseeding never adds a second Admin and never signs Admin out unless the password changed. The `User` model now lives inside the Accounts module, which owns the `users` table.

- [api/app/Modules/Accounts/Database/Seeders/AccountsSeeder.php:26](../../../api/app/Modules/Accounts/Database/Seeders/AccountsSeeder.php#L26) — find the existing Admin first, else create by email; [line 36](../../../api/app/Modules/Accounts/Database/Seeders/AccountsSeeder.php#L36) — only rehash when the password changed.
- [api/database/seeders/DatabaseSeeder.php](../../../api/database/seeders/DatabaseSeeder.php) — module seeders in the architecture's order (only Accounts so far).
- [api/config/accounts.php](../../../api/config/accounts.php) — where the three `ADMIN_*` values are read.
- [api/app/Modules/Accounts/Models/User.php:16](../../../api/app/Modules/Accounts/Models/User.php#L16) — the moved model, with its factory named explicitly.
- [api/database/migrations/2026_11_11_060000_add_is_admin_to_users.php](../../../api/database/migrations/2026_11_11_060000_add_is_admin_to_users.php) — the `is_admin` column.

### [ ] 6 — The SPA shell (not visited)

The SPA asks `/api/v1/me` once on load and keeps the answer in a session context; nothing is stored in `localStorage`. A small hand-written router (react-router needs Node 22, the host has 20) maps paths to pages, and each route says whether it is for signed-out visitors or for Admin. All wording comes from one copy file; styling is plain CSS over the DESIGN.md tokens, with the two fonts bundled.

- [web/src/api/client.ts:43](../../../web/src/api/client.ts#L43) — the only HTTP client: same-origin `fetch`, echoing the `XSRF-TOKEN` cookie as a header.
- [web/src/app/SessionProvider.tsx:33](../../../web/src/app/SessionProvider.tsx#L33) — sign-out clears the user even when the API call fails.
- [web/src/app/App.tsx:21](../../../web/src/app/App.tsx#L21) — the route guards.
- [web/src/app/layout.tsx](../../../web/src/app/layout.tsx) — the Admin top bar: Courses link, name, Sign out.
- [web/src/features/accounts/SignIn.tsx](../../../web/src/features/accounts/SignIn.tsx) — the Sign in form and its error line.
- [web/src/features/courses/AdminCourses.tsx](../../../web/src/features/courses/AdminCourses.tsx) — the static "No courses yet." page.
- [web/src/app/copy.ts](../../../web/src/app/copy.ts) and [web/src/app/tokens.css](../../../web/src/app/tokens.css) — wording and design tokens; fonts imported in [web/src/main.tsx:4](../../../web/src/main.tsx#L4).

### [ ] 7 — Tests and the end-to-end harness (not visited)

API feature tests cover each scenario in the plan's table, plus the non-app-origin 403 and a changed Admin email. They always run on in-memory SQLite, never the stack's MySQL. The e2e script brings up the e2e stack, wipes and reseeds its database, then runs Playwright in its own container against `http://web`.

- [api/tests/Feature/Accounts/](../../../api/tests/Feature/Accounts/) — sign-in, wrong password, signed out, admin gate, sign-out, seeder.
- [api/phpunit.xml:25](../../../api/phpunit.xml#L25) — test settings forced over the container's real environment.
- [e2e/run.sh:16](../../../e2e/run.sh#L16) — `migrate:fresh --seed` before every run.
- [e2e/tests/admin-sign-in.spec.ts](../../../e2e/tests/admin-sign-in.spec.ts) — sign in, see the empty page, sign out; wrong password.

### [ ] 8 — Periphery (not visited)

- [.env.example](../../../.env.example) — every setting the stack reads.
- [.gitignore](../../../.gitignore) — secrets, dependencies, build and test output.
- [api/.dockerignore](../../../api/.dockerignore), [web/.dockerignore](../../../web/.dockerignore), [e2e/.dockerignore](../../../e2e/.dockerignore) — keep `.env` and local dependencies out of images.
- [e2e/Dockerfile](../../../e2e/Dockerfile) and [e2e/playwright.config.ts](../../../e2e/playwright.config.ts) — the Playwright runner.
- [web/index.html](../../../web/index.html) — page title.
- Starter demo files removed: the Laravel welcome page and web route, the Vite demo app, its CSS and images.
