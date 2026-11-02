---
review: versions-and-reality-check
target: architecture-growmate.md
reviewed: 2026-11-02
lens: "Every committed decision web-researched or reality-checked: current versions, named technologies still exist and fit, live starter defaults."
verdict: "Needs changes. Most named APIs exist in Laravel 13 / React 19 / Vite 8, but 3 decisions fail a reality check (e2e clock, Sanctum token use and expiry, build-time VITE_API_URL vs 'same images on any host'), and 2 pins are stale (Node 22, arguably PHP 8.4)."
---

# Review: versions and reality check

Each claim from the spine is checked against a live source, fetched 2026-11-02. Status values: **OK** means confirmed. **FLAG** means wrong, stale, or does not fit as written. **UNVERIFIED** means it was not confirmed this session.

## Findings, by severity

### High

**H1. AD-6: `Carbon::setTestNow` in a `POST /api/v1/testing/clock` endpoint does not carry over to later requests. FLAG**
- Under PHP-FPM, each HTTP request runs in fresh process state. `setTestNow()` called while handling the clock request changes only that request's clock. The SPA's next call sees real time again.
- Community e2e patterns for Laravel use a per-request middleware instead. It reads a stored or cookie-carried test time and calls `Carbon::setTestNow()` on every request.
- The fix belongs in the spine, because it is the only cross-epic part of the harness:
  - the endpoint persists the time, for example in cache, a file or a DB row;
  - a testing-only middleware applies that time on every request;
  - the clock is reset between runs.
- Sources:
  - https://www.dev.to/johnbraun/how-to-use-fake-dates-in-cypress-end-to-end-testing-19h5
  - https://gist.github.com/n1215/5c2640c68b52a30f1e6940e745224280
  - https://github.com/laravel/framework/pull/41810

**H2. AD-9: Sanctum's own 13.x docs advise against bearer API tokens for a first-party SPA. FLAG (decision not recorded as a deliberate deviation)**
- The docs say: "You should not use API tokens to authenticate your own first-party SPA. Instead, use Sanctum's built-in SPA authentication features." That cookie mode "protects against leakage of the authentication credentials via XSS".
- AD-9 claims to prevent "XSS token theft" while storing the token in `localStorage`. That only reduces the risk; any script injected into the page, including one from a compromised dependency, can read `localStorage`.
- The memlog records this as the user's choice. The spine should either:
  - state the deviation and why (for example, API and SPA on unrelated origins), and soften the "Prevents" line; or
  - switch to Sanctum SPA (cookie) auth. That needs the SPA and API to share a top-level domain, for example `app.` and `api.` subdomains.
- Source: https://laravel.com/docs/13.x/sanctum (sections "API Token Authentication" and "SPA Authentication")

**H3. AD-12: a `VITE_API_URL` read "at build time" contradicts "the same images run locally and on any future host". FLAG**
- Vite 8 replaces `VITE_*` values statically at build time, so the API URL is baked into the `web` image. Moving to another host means rebuilding the image, or adding runtime config injection, for example an nginx-served `config.js` or a same-origin `/api` reverse proxy.
- The `VITE_` prefix requirement itself is confirmed. To type the variable, augment `ImportMetaEnv` in `src/vite-env.d.ts`.
- Source: https://vite.dev/guide/env-and-mode (page labelled v8.3.4)

### Medium

**M1. AD-9: token expiry is opt-in, and expired tokens need a scheduler. FLAG (underspecified)**
- Sanctum tokens never expire by default. The `expiration` key in `config/sanctum.php` is in minutes and defaults to null. A per-token expiry can be passed as the third argument to `createToken(...)`. Both are confirmed in 13.x.
- The spine says "tokens have an expiry" but names no value or mechanism. Pick one, for example `SANCTUM_EXPIRATION` in `.env` per the Config convention.
- Expired rows stay in `personal_access_tokens` until `sanctum:prune-expired` runs on a schedule. AD-12 defines no scheduler or cron process. AD-5's "never by scheduled jobs" covers business rules only, but the spine should say whether a scheduler exists for housekeeping.
- Sign-out revocation via `$request->user()->currentAccessToken()->delete()` is confirmed.
- Source: https://laravel.com/docs/13.x/sanctum#token-expiration

**M2. Stack: "Node.js 22.x LTS" is stale. FLAG**
- Node 22 is Maintenance LTS and reaches end of life on 2027-04-30, about 6 months away.
- The current Active LTS is Node 26 (active support until 2027-10-27, EOL 2029-04-30). Node 24 is maintenance until 2028-04-30.
- Laravel Sail 13.x installs Node 24 by default.
- Recommendation: pin Node 24 or 26. Both meet Vite 8's floor of 20.19+ or 22.12+ (from the memlog).
- Sources:
  - https://endoflife.date/nodejs
  - https://laravel.com/docs/13.x/sail#sail-node-versions

**M3. Memlog plan to build the production image "from published Sail Dockerfiles" does not fit AD-12. FLAG (memlog/spine drift)**
- Sail is described as "Laravel's default Docker development environment". It "relies on `artisan serve` to serve your application".
- AD-12 requires PHP-FPM and nginx in the `api` image. Sail's Dockerfiles do not provide that, so the memlog line should be corrected before epic 1 follows it.
- Sail also publishes `compose.yaml`, while the spine's source tree names `docker-compose.yml`. Compose accepts both names, but this should be made consistent (minor; the Compose naming preference was not verified this session).
- Source: https://laravel.com/docs/13.x/sail (Introduction, Xdebug section, Customization)

### Low

**L1. Stack: PHP 8.4 is valid but near the end of active support. FLAG (minor)**
- PHP 8.4 active support ends 2026-12-31; security support runs to 2028-12-31.
- PHP 8.5 has active support to 2027-12-31. Laravel 13 supports PHP 8.3–8.5, and Sail's default runtime is PHP 8.5.
- The memlog reason for 8.4 (Symfony 8 needs ≥ 8.4, issue #59564) sets a minimum, not a reason to avoid 8.5. Consider pinning 8.5, or record why not.
- Sources:
  - https://www.php.net/supported-versions.php
  - https://laravel.com/docs/13.x/releases#support-policy
  - https://laravel.com/docs/13.x/sail#sail-php-versions

**L2. AD-10: "API Resources" is now ambiguous in Laravel 13, and "every body is `{data: …}`" ignores pagination. FLAG (minor)**
- Laravel 13 ships `JsonApiResource` (`make:resource --json-api`). It produces a different shape and the `application/vnd.api+json` content type. Name `JsonResource` (plain `make:resource`) explicitly so that no epic chooses the JSON:API variant.
- Default outermost `data` wrapping is confirmed. Paginated responses always add sibling `links` and `meta` keys, so AD-10 should allow them.
- Sources:
  - https://laravel.com/docs/13.x/eloquent-resources#data-wrapping
  - https://laravel.com/docs/13.x/eloquent-resources#jsonapi-resources
  - https://laravel.com/docs/13.x/releases

**L3. AD-1/AD-12: CORS is not addressed. FLAG (gap)**
- The SPA (`web`) and the API (`api`) are separate containers, normally on different origins.
- Laravel's global `HandleCors` middleware is configured through `php artisan config:publish cors`. The spine should fix the allowed origin, for example via an `.env` value, so that epics don't each loosen it.
- Source: https://laravel.com/docs/13.x/routing#cors

## Claims confirmed (OK)

| Claim (spine location) | Status | Evidence | Source |
| --- | --- | --- | --- |
| Laravel 13.x (Stack) | OK | Released 2026-03-17. PHP 8.3–8.5. Bug fixes until Q3 2027, security fixes until 2028-03-17. | https://laravel.com/docs/13.x/releases#support-policy |
| `php artisan install:api` still exists (API-only setup) | OK | Installs Sanctum and creates `routes/api.php` with the `/api` prefix. The prefix can be changed with `apiPrefix:` in `withRouting` in `bootstrap/app.php`, or `v1` can be grouped inside `api.php`. | https://laravel.com/docs/13.x/routing ; https://laravel.com/docs/13.x/sanctum#installation |
| Sanctum bearer tokens, `HasApiTokens`, revoke on sign-out (AD-9) | OK | `Authorization: Bearer`, `createToken`, `currentAccessToken()->delete()` | https://laravel.com/docs/13.x/sanctum |
| Sanctum `expiration` config (AD-9) | OK (but see M1) | `'expiration' => <minutes>`, default never expires. Per-token `expiresAt` is the third argument to `createToken`. | https://laravel.com/docs/13.x/sanctum#token-expiration |
| `$this->travel()` (AD-6, Tests convention) | OK | `travel(n)->days()`, `travelTo()`, `travelBack()`, `freezeTime()` on the base feature test class, in Pest and PHPUnit | https://laravel.com/docs/13.x/mocking#interacting-with-time |
| Laravel database notification channel (AD-11) | OK | `php artisan make:notifications-table`, `toDatabase`/`toArray` into the `data` JSON column, `notifications`/`unreadNotifications`, `markAsRead()`. `afterCommit()` applies only to *queued* notifications, so the "notices only after commit" convention must be enforced in the Action (for example with `DB::afterCommit`) when sending synchronously. | https://laravel.com/docs/13.x/notifications |
| API Resources with `data` envelope (AD-10) | OK (but see L2) | `make:resource`. The outermost resource is wrapped in `data` by default. | https://laravel.com/docs/13.x/eloquent-resources#data-wrapping |
| `dangerouslySetInnerHTML` (AD-9) | OK | Still a React DOM prop (`{ __html }`) with an explicit XSS warning, so the ban is meaningful | https://react.dev/reference/react-dom/components/common |
| `VITE_` prefix for client env (AD-12) | OK (but see H3) | Only `VITE_*` values are exposed, replaced statically at build | https://vite.dev/guide/env-and-mode |
| Vite 8 (Stack) | OK | Live docs labelled v8.3.4 | https://vite.dev/guide/env-and-mode |
| PHP 8.4 supported by Laravel 13 (Stack) | OK (but see L1) | Inside the 8.3–8.5 range | https://laravel.com/docs/13.x/releases |
| Sail exists in 13.x, supports PHP 8.4/8.5, `sail:publish` for Dockerfiles | OK (but see M3) | | https://laravel.com/docs/13.x/sail |

## Accepted from the memlog (sourced there, not re-fetched)

| Claim | Memlog source | Note |
| --- | --- | --- |
| React 19.3 | react.dev/versions (2026-09-09) | Recent enough; not re-checked. |
| MySQL 8.4 LTS (premier support to 2029-04-30) | dev.mysql.com refman 8.4, endoflife.date/mysql | Not re-checked. Laravel 13's supported-database list was not checked this session. **UNVERIFIED** against https://laravel.com/docs/13.x/database#introduction |
| PHP ≥ 8.4 needed by Laravel 13.3+ (Symfony 8) | github.com/laravel/framework/issues/59564 | Not re-checked. The official release page still says the minimum is 8.3. |
| create-vite `react-ts` template defaults (TypeScript version, `@vitejs/plugin-react ^6.0.1`) | memlog | The TypeScript version is "per template"; no number recorded. |

## Unverified

- **Docker Compose "current stable" (Stack).** Not pinned and not checked. This is acceptable for a dev tool. Record a minimum Compose v2 version if the `api` one-shot migration relies on features such as `depends_on: condition: service_completed_successfully`.
- **Behaviour of `Carbon::setTestNow` across `Illuminate\Support\Carbon` and `CarbonImmutable` in Carbon 3.** Not checked. Laravel's `travelTo` helpers handle both, and AD-6's middleware should use the same approach.
