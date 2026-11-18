---
title: 'Rate-limit sign-in and sign-up'
type: 'bugfix'
ticket: ''
created: '2026-11-17'
status: 'built'
baseline_revision: '3f280787e1d29b47295c3e880e2f33941eec5a4a'
route: 'oneshot'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-retro-2026-11-17.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `POST /api/v1/login` and `POST /api/v1/register` have no rate limit (`api/routes/api.php:28-30`; no `throttle` or `RateLimiter` anywhere), so the seeded Admin email can be guessed against without limit and sign-up's "email taken" refusal can be used to probe for accounts. This is Epic 1 retro finding F1, action item 1.

**Approach:** Named Laravel rate limiters defined in `AccountsServiceProvider` and applied to the two routes with `throttle:<name>`. Only **failed** attempts (422) count, through `Limit::after`, so successful sign-ins and the e2e suite's many sign-ins are never throttled.
- `sign-in`: 5 failed attempts per minute per lower-cased email plus IP, and 20 failed attempts per minute per IP (to stop spraying one password across many emails).
- `sign-up`: 10 failed attempts per minute per IP.
- Once a limit is reached, every request on that key answers 429 with the AD-10 shape `{ "message": "Too many attempts. Try again in a minute." }` (no `code`; it is not a module rule refusal) plus Laravel's `Retry-After` headers, until the minute decays. The SPA already shows a non-field API message in Sign in's and Sign up's alert line, so no SPA change is needed.
- API tests cover: the 6th attempt after 5 failures is 429 even with the right password; successes don't count; another email from the same IP is unaffected below the IP limit; the IP limit; sign-up after 10 failures; the limit lifts after a minute (`$this->travel()`); the 429 body shape.

</frozen-after-approval>

## Implementation Notes

One-shot route: one provider, the two route lines and one test file, roughly 100 lines with tests.

- `api/app/Modules/Accounts/AccountsServiceProvider.php`: `sign-in` and `sign-up` limiters built from one `refusedAttempts()` helper (`Limit::perMinute()->after(422)->response(429 JSON)`). A non-string `email` keys as an empty string, so a malformed body can't raise an array-to-string error; it still falls under the per-IP limit.
- `api/routes/api.php`: `throttle:sign-in` on `login`, `throttle:sign-up` on `register`.
- `api/tests/Feature/Accounts/RateLimitTest.php` (made with `make:test --phpunit`): 8 tests covering every case in the Intent.
- Root `.env` (git-ignored, action item 8) was rebuilt from the running `growmate-e2e` containers so `./e2e/run.sh` can run; it is not part of this change.
- `php artisan test --compact`: 165 passed. Pint: clean.
- **Review fix (proxy trust):** the API sees every request from the `web` nginx container and trusted no proxy, so "per IP" was really site-wide. `api/bootstrap/app.php` now trusts private addresses (`10/8`, `172.16/12`, `192.168/16`, loopback). A first attempt with `trustProxies(at: '*')` was wrong: in Laravel 13 `'*'` trusts `0.0.0.0/0`, so a forged `X-Forwarded-For` entry became the client address; the new forged-header test caught it. `web/nginx.conf` now sets `X-Forwarded-For $remote_addr` instead of appending (`$proxy_add_x_forwarded_for`), so a client can't inject an entry even when its own address is private (as with Docker Desktop).
- **Review fix (accents):** the email key is `Str::lower(Str::ascii(...))`, matching the accent- and case-insensitive `utf8mb4_unicode_ci` lookup.
- 3 more tests: per-browser limits behind the proxy, a forged forwarded address, an accented email. `php artisan test --compact`: 168 passed. Pint: clean.
- e2e: baseline on `main` 41 passed. The first two runs with the change never started: building the API image failed in Docker Desktop's credential helper (`docker-credential-desktop.exe`; WSL interop `UtilAcceptVsock: accept4 failed`). Re-run with `DOCKER_CONFIG` pointing at an empty config, since every base image is public.

## Verification

**Commands:**
- `cd api && php artisan test --compact` -- expected: all pass
- `cd api && vendor/bin/pint --dirty --format agent` -- expected: clean
- `./e2e/run.sh --reporter=line` -- expected: same pass count as the baseline on `main`, no new failures

## Review Triage Log

Quick lens (1 reviewer), 4 findings: 1 high, 1 low, 1 deferred, 1 false.

| # | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|
| 1 | Every "per IP" key is the `web` proxy's address, so the limits are site-wide: 20 wrong passwords from anyone lock out every user, and 5 lock out any one account. | high | patch | Confirmed: `api/bootstrap/app.php` had no `trustProxies`; `web/nginx.conf` forwards with `X-Forwarded-For`. Fixed by trusting private addresses and making nginx overwrite the header; tests `test_behind_the_web_proxy_each_browser_address_has_its_own_limit` and `test_a_forged_forwarded_address_does_not_escape_the_limit`. |
| 2 | Accent variants of an email (`ádmin@…`) get their own 5-attempt budget, because MySQL's `utf8mb4_unicode_ci` matches them to the same row. | low | patch | One-call fix (`Str::ascii`) in the key; test `test_an_accented_variant_of_the_email_shares_its_limit`. Still capped by the per-IP limit before the fix. |
| 3 | The architecture still lists rate limiting as deferred, and AD-10 has no 429. | medium | defer | A spec edit; logged in `deferred-work.md`. |
| 4 | The branch carries the `api/.env.example` change the retro says to discard. | false | — | Not part of this change: it is left out of the commit and stays uncommitted for the user to discard. |
