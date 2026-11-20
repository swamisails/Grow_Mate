---
title: 'Epic 2 refactor sweep'
type: 'refactor'
ticket: '9'
created: '2026-11-19'
status: 'in-progress'
baseline_revision: 'af96089b4d17b61cbc1f3db42dff9282de38df15'
route: 'full'
route_source: 'auto'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 2 left small duplications and stale text behind. The deferred items come from the epic 1 and epic 4 retros, since the epic 2 plans themselves deferred nothing: one 698-line Matching test file, three copies of `hidesSecrets` in the e2e specs, repeated Matching test setup, and stale comments.

**Approach:** Cleanup only, with no behaviour change. Move and de-duplicate test code, reuse the one shared e2e helper, and correct the stale comments. Every test keeps its name and assertions, and the same tests pass as before.

## Boundaries & Constraints

**Always:** Behaviour-preserving. Test names, assertions and the count of tests stay the same, before and after (record the observed counts). Before swapping e2e `hidesSecrets` copies, verify they are identical to the helper in `e2e/tests/support/helpers.ts`. Comment-only edits change no code. Record observed pass and fail counts in Implementation Notes, not just "pass".

**Never:** Change production behaviour, error codes, locks, transaction order or response shapes. Do not touch `api/.env.example`. Do not extract the Request-plus-`RequestSent` creation shared by `AssignGroup` and `SendRequest`, or the web fetch-on-mount hooks, `SelectField`/`TextField`, or the Accept-loop hardening, the `learner_ids` cap, the Confirmation focus-return fix or concurrency hardening (each is a new story). Do not edit the existing migrations' code, only the stale comment text.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| API tests | Full phpunit run before and after | Same tests run, same results; only the known failures remain | n/a |
| Web tests | Full vitest run before and after | Same results | n/a |
| Split test file | GroupAssignmentTest split by Action | The same 24 tests exist, in new files, passing | n/a |

</frozen-after-approval>

## Code Map

- `api/tests/Feature/Matching/GroupAssignmentTest.php` (698 lines, 24 tests) -- split by Action into AssignGroup, group Accept, clock/request-time and refusals files; pure moves. Check no open branch edits it.
- `api/tests/Feature/Matching/MatchingTestCase.php` -- already holds `publishedCourse`, `employee`, `grant`; add shared `openRequest()` and a live/accepted Match helper.
- `api/tests/Feature/Matching/AcceptRequestTest.php:260`, `HomeAndMatchTest.php:176`, `UpskillingListTest.php:78`, `RequestTimeTest.php:272`, `CompleteCourseTest.php:91`, `QuitMatchTest.php:128`, `HomeAndMatchTest.php:191`, `UpskillingListTest.php:90` -- copies of `openRequest()` and the Match setup; switch to the shared helpers. Keep any variant that differs on purpose.
- `api/database/factories/CourseFactory.php` -- add a `published()` state where about 10 sites set `published_at => now()` by hand.
- `e2e/tests/home-and-match.spec.ts:12`, `request-and-accept.spec.ts:9`, `request-clock.spec.ts:16` -- local `hidesSecrets` copies; import the one in `e2e/tests/support/helpers.ts:132`.
- `web/src/api/matching.ts:45` (comment "A 409 means the Course isn't published"), `api/database/migrations/2026_11_14_000000_create_matching_tables.php:9-10` ("unused until a later entry"), `e2e/playwright.config.ts:18-19` (describes story 2.2's old Accept behaviour) -- stale comments; comment-only fixes. Read the real behaviour before rewording.

## Tasks & Acceptance

**Execution:**
- [ ] Record baseline: run phpunit (Matching, and the full suite) and vitest before any change; note counts
- [ ] `GroupAssignmentTest.php` -- split into files by Action, no test edited
- [ ] `MatchingTestCase.php` and the listed test files -- shared `openRequest()` and Match helpers; `CourseFactory::published()`
- [ ] the three e2e specs -- import the shared `hidesSecrets`
- [ ] the three stale comments -- correct them
- [ ] re-run the same suites and compare with the baseline

**Acceptance Criteria:**
- Given the baseline and the final run, then the same tests exist and give the same results, with no new failures.
- Given the diff, then no production code line changed except comments.
- Given the e2e specs, then none defines its own `hidesSecrets`.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

Items left for new stories: Request-plus-`RequestSent` creation shared by `AssignGroup` and `SendRequest`, the web fetch-on-mount hooks, `SelectField`/`TextField`, the Accept-loop eligibility re-check, the `learner_ids` cap, unknown Course returning 200 `[]`, the Confirmation focus-return fix, the e2e `waitForTimeout(1100)` and the `home-and-match` spec dependency.

## Verification

**Commands:** (Windows. Prepend PHP to PATH first: `C:\Users\LENOVO\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.5_Microsoft.Winget.Source_8wekyb3d8bbwe`. Run phpunit directly from `api/`: `php -d extension_dir=<that folder>\ext -d extension=pdo_sqlite -d extension=sqlite3 vendor/phpunit/phpunit/phpunit`, because `php artisan test` loses the flags. No MySQL is needed. On web, a plain `npm test` fails here because `./Router` resolves to `router.ts`; run vitest with a temporary config that fixes the resolution, and delete it afterwards. The Playwright e2e suite needs Docker, which is not installed here, so it cannot run; say so in Implementation Notes and check the three specs by `tsc` or by reading. Do not touch git: no commits, no branches, no pushes. The working tree has unrelated changes you must leave alone.)
- phpunit full run, before and after -- expected: identical results; only the known failures (`RateLimitTest` behind the proxy and the two production-seeder tests)
- `npx vitest run` (from `web/`, with the temporary config), before and after -- expected: identical results

**Manual checks (if no CLI):**
- Read the three e2e specs after the change; none defines `hidesSecrets`.
