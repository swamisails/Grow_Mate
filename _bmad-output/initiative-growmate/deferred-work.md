- source_plan: `_bmad-output/initiative-growmate/tickets/epic-accounts-courses-first-mentors/tickets/story-admin-signs-in-on-the-deployed-stack-plan.md`
  summary: Decide whether to install Laravel Boost (`laravel/boost`, `php artisan boost:install`) as the starter's `api/AGENTS.md` and `api/CLAUDE.md` instruct, or remove that instruction.
  evidence: The Laravel 13 starter added agent files telling agents to install Boost before changing the app; story 1.1 skipped it because the plan doesn't include it.
- source_plan: `_bmad-output/initiative-growmate/plan-retro-1-auth-rate-limit.md`
  summary: Update the architecture spine for rate limiting: remove "rate limiting" from the Deferred list (architecture-growmate.md:357), add 429 (rate limit, message only, no code) to AD-10's error statuses, and record the proxy-trust rule (API trusts private addresses; `web` overwrites X-Forwarded-For).
  evidence: The rate-limit change adds a 429 response and trusts the `web` proxy, but AD-10 lists only 422/409/403/404 and the Deferred section still says rate limiting is not driven by any requirement; the fix edits a spec, so it is deferred.
- source_plan: `_bmad-output/initiative-growmate/plan-retro-1-auth-rate-limit.md`
  summary: If the stack is ever placed behind another load balancer, `web/nginx.conf`'s `X-Forwarded-For $remote_addr` will key every user's rate limit on that balancer's address; the deploy would then need `real_ip` handling in `web`.
  evidence: AD-17 publishes `web` directly on any Docker host today, so this cannot happen in the current deployment; recorded so a future hosting change does not silently turn the per-IP limits into site-wide ones.

- source_plan: `_bmad-output/initiative-growmate/tickets/epic-group-assignment/tickets/story-admin-assigns-a-group-and-the-chosen-employee-sees-it-plan.md`
  summary: The uncommitted `api/.env.example` edit appends a second block (`APP_ENV=e2e`, blank `APP_KEY`/DB keys) that overrides the file's own `APP_ENV=local`, so a `.env` copied from it runs with the AD-6 testing routes.
  evidence: Loading a two-line `.env` (`APP_ENV=local`, then `APP_ENV=e2e`) with the vendored `Dotenv::createImmutable` gives `APP_ENV=e2e`. The keys look like the root `.env.example` pasted into the Laravel one. Ties to epic 1 retro item 8.
