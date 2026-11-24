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

- source_plan: `_bmad-output/initiative-growmate/tickets/epic-group-assignment/tickets/story-one-accept-starts-every-match-in-the-group-plan.md`
  summary: The uncommitted `api/.env.example` edit (`APP_ENV=e2e` after `APP_ENV=local`, blank DB keys) is still in the working tree during story 4.2.
  evidence: The 4.2 quick review flagged it again; a later duplicate key wins in phpdotenv, as verified under 4.1. It is epic 1 retro item 8.

- source_plan: `_bmad-output/initiative-growmate/tickets/epic-group-assignment/tickets/story-group-assignment-refusals-plan.md`
  summary: Story 4.1's "Assignment created" live region is hidden by `.group-assignment > [role='status']:empty { display: none }`, so screen readers may not announce the created card when it appears.
  evidence: The region joins the accessibility tree with its content already in place; `ConflictMessage` (`web/src/app/forms.ts` L87) keeps its live region always rendered for this reason. The 4.3 review fixed the same pattern on the refusal summary.

- source_plan: `_bmad-output/initiative-growmate/tickets/epic-group-assignment/tickets/story-group-assignment-refusals-plan.md`
  summary: The uncommitted `api/.env.example` edit (`APP_ENV=e2e` after `APP_ENV=local`) is still in the working tree during story 4.3.
  evidence: The 4.3 quick review flagged it a third time. It is epic 1 retro item 8.

- source_plan: `_bmad-output/initiative-growmate/tickets/epic-stages-and-gold/tickets/story-a-learner-takes-bronze-and-sees-the-result-plan.md`
  summary: Web vitest is timing-flaky under full-suite load: about 1 run in 8 fails a default 1 s `findBy*` wait in a file story 3.1 did not touch (`CourseMentors.test.tsx` "shows Loading until the list arrives", `MentorCheckCard.test.tsx` "renders nothing while loading…"). Owner: Swami.
  evidence: The failing files differ between runs, and `MentorCheckCard` is on Home, which makes no Stages call. Each file passes alone. The baseline af96089b passed 3 of 3 full runs with 151 tests; with 3.1's 14 extra tests, 7 of 8 runs passed. The fix is raising the async-util timeout in `web/src/test/setup.ts` or reducing jsdom parallelism; ties to epic-4 retro item 16.

- source_plan: `_bmad-output/initiative-growmate/tickets/epic-stages-and-gold/tickets/story-a-learner-takes-bronze-and-sees-the-result-plan.md`
  summary: The full Playwright suite has 9 failures in specs story 3.1 did not touch (home-and-match ×4, registration-decisions, employee-accounts, group-assignment, registration-decision-notices, uj-3-and-course-publishing). Owner: Swami.
  evidence: The implementer reran `home-and-match` (4) and `registration-decisions` (1) without 3.1's changes, and they failed identically. Priya's Home Learning list comes back empty, and the navigation assertion predates story 2.8's Upskilling link. The other 4 were not rerun on the baseline but are the same kind of text assertion. Overlaps epic-4 retro item 16.

- source_plan: `_bmad-output/initiative-growmate/tickets/epic-stages-and-gold/tickets/story-a-learner-takes-bronze-and-sees-the-result-plan.md`
  summary: `web/src/features/matching/QuitDialog.tsx` failed `tsc -b` on main (TS2677 type predicate, from story 2.6), so `npm run build` and the e2e web image were red on main; story 3.1 carries a type-only fix.
  evidence: The implementer found `npm run build` red at af96089b, which shows CI is not gating builds (epic-4 retro item 15).

- source_plan: `_bmad-output/initiative-growmate/tickets/epic-stages-and-gold/tickets/story-passing-gold-makes-the-learner-a-mentor-plan.md`
  summary: `SubmitAttempt` (locks the submitter's user row, then FK-share-locks the Course) can deadlock with `SendRequest` (locks the requester, then the Course FOR UPDATE, then FK-share-locks the Mentor's user row) when a Mentor still learning the same Course submits a Stage while being requested.
  evidence: Medium, unverified at runtime. Found in the story 3.4 review by reading both lock orders. It dates from story 3.1's `stage_attempts.course_id` foreign key, and 3.4's grant adds no new lock. MySQL would abort one transaction with a deadlock error. A two-connection test on MySQL, or locking the Course in `SubmitAttempt` before the user, would settle it.

- source_plan: `_bmad-output/initiative-growmate/tickets/epic-stages-and-gold/tickets/story-uj-1-to-gold-the-lock-and-a-gold-mentor-s-accept-pass-end-to-plan.md`
  summary: The e2e Mentor-approval setup (`publishCourse`, a fixed `waitForTimeout(1100)`, then `approvedMentorOnCourse`) fails when the host clock jumps backwards between publish and sign-up, because the Mentor check lists only Courses published strictly before the account was created. Make the helper wait on the API's own clock, or fix WSL time sync. Owner: Swami.
  evidence: Story 3.6's four-spec run was green 2 of 5 times. Every failure was a 90 s timeout in `approvedMentorOnCourse`, with the Mentor's `created_at` (05:56:10) before the Course's `published_at` (05:56:11). A wall-clock monitor showed WSL time stepping back 2–4 s about every 30 s.
