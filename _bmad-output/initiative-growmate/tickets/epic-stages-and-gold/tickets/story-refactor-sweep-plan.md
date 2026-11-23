---
title: 'Refactor sweep (epic 3)'
type: 'refactor'
ticket: '5'
created: '2026-11-23'
status: 'built'
baseline_revision: '869b419546cde37f6c19c9c4369dda20468f8ef1'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 3 left two kinds of debt. First, two Assessments controllers each call two Queries, which breaks AD-3's "one Action or Query per controller" rule (story 3.1 review finding 2, sent to this sweep). Second, the epic's tests repeat their setup: three e2e specs carry the same `openCourse`, the same approved-Mentor setup and the same Request-to-Course-Completed step, and three API test files carry the same `completed()` and `submit()` helpers. Story 3.6's closing suite would copy the e2e setup a fourth time.

**Approach:** Cleanup only, with no behaviour change. Add one Assessments Query per controller to wrap the two calls in the same order. Lift the duplicated API test helpers into `AssessmentsTestCase`, and the duplicated e2e helpers into `e2e/tests/support/`. Every test keeps its name and assertions.

## Boundaries & Constraints

**Always:**
- Behaviour-preserving. Response bodies, status codes, error codes and the order "404 for an unpublished Course, then the 409 availability refusal" stay identical.
- Test names, assertions and test counts are the same before and after. Record the observed counts in Implementation Notes.
- e2e `test.step` names stay in the specs. Helpers hold only the step bodies.
- Before replacing a copy with the shared helper, diff the copy against it. A copy that differs on purpose (take-bronze's `openCourse` also runs `hidesAnswers`) keeps that difference, as a thin local wrapper.

**Never:**
- No change to production logic, locks, transaction order or response shapes in `SubmitAttempt`, `StageAvailability` or the Courses Queries.
- Out of scope, each a new story or left in deferred-work:
  - the `SubmitAttempt`/`SendRequest` deadlock (a concurrency change);
  - a reload-safe result URL (new API surface);
  - pinning the vitest time zone (test-wide config);
  - the 9 Playwright failures in other epics' specs.
- Don't touch `api/.env.example` or the uncommitted `.agents/`, `.claude/` and `skills-lock.json` changes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Stages list, draft Course | `GET /courses/{draft}/stages` | Same as before | 404 |
| Taking read, draft Course + unavailable Stage | `GET …/stages/silver/assessment` on a draft | 404, not 409 (order kept) | 404 |
| Taking read, unavailable Stage | published, before Course Completed | Same as before | 409 `ASSESSMENTS_STAGE_UNAVAILABLE` |
| API suite | Full phpunit before and after | Same tests, same results; only the known `RateLimitTest` proxy failure | n/a |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Assessments/Http/Controllers/CourseStagesController.php` -- calls `PublishedCourse::handle` then `StageAvailability::handle`. Move both into a new `Assessments/Queries/CourseStages.php` with `handle(learnerId, courseId): array` and the same `@throws NotFoundHttpException`. The controller then calls only that.
- `api/app/Modules/Assessments/Http/Controllers/ShowAssessmentController.php` -- calls `StageForTaking::handle` (404) then `StageAvailability::assertAvailable` (409). Move both into `Assessments/Queries/AssessmentForLearner.php`, keeping that order, returning StageForTaking's array. The controller still builds `StageLevel::from($stage)` and wraps the result in `AssessmentResource`.
- Leave alone: `SubmitAttemptController` (already one Action), `StageAvailability`, `SubmitAttempt`, the Courses Queries, routes.
- `api/tests/Feature/Assessments/AssessmentsTestCase.php` -- add protected `completed(): array{Course, User}`, plus `submit(User, Course, StageLevel, bool $pass): TestResponse` and `read(User, Course, StageLevel): TestResponse`.
- Those helpers have identical private copies in `RetakeRuleTest.php:159`, `StageOrderTest.php:186/195/203` and `GoldPassTest.php:155`. Delete the copies. `RetakeRuleTest`'s `failBronze`/`passBronze`/`read(learner, course)` become calls to the shared `submit`/`read` with Bronze. `GoldPassTest::completedWithBronzeAndSilver` may call `completed()`.
- Keep local, because they differ on purpose: the two `assertStages` variants (variadic vs list plus the hides check), `strayPass`, `assertInProgress`, `assertProgress`.
- `e2e/tests/support/helpers.ts` -- add three exports:
  - `openCourse(page, courseId, title)`: identical copies in `bronze-lock.spec.ts:25` and `gold-pass.spec.ts:22`.
  - `approvedMentorOnCourse(adminPage, mentorPage, mentor, course)`: the publish-wait-signup-decide body repeated in all three epic-3 specs.
  - `toCourseCompleted(learnerPage, mentorPage, {courseId, course, mentorName, learnerName})`: the Request, Accept, Course Completed body in `bronze-lock` and `gold-pass`.

  Diff `take-bronze.spec.ts`'s versions before swapping. Its `openCourse` keeps a local wrapper that adds `hidesAnswers(body)`. Use the shared bodies only where they match.

## Tasks & Acceptance

**Execution:**
- [x] Record the baseline: `cd api && php artisan test --compact` (full) and `php artisan test --compact tests/Feature/Assessments`; note the counts.
- [x] `Assessments/Queries/CourseStages.php`, `AssessmentForLearner.php` and the two controllers -- one Query per controller, order kept.
- [x] `AssessmentsTestCase.php` and the three test files -- shared `completed`/`submit`/`read`; no test name or assertion changes.
- [x] `e2e/tests/support/helpers.ts` and the three epic-3 specs -- shared `openCourse`, `approvedMentorOnCourse`, `toCourseCompleted`.
- [x] Run `vendor/bin/pint --dirty --format agent`, `cd e2e && npx tsc --noEmit` (or the repo's e2e lint), and re-run the suites; compare with the baseline.

**Acceptance Criteria:**
- Given the sweep, when the Assessments API tests run, then the same test names pass with the same count as the baseline.
- Given any Assessments controller, when it is read, then it calls exactly one Action or Query.
- Given the three epic-3 e2e specs, when they run on the e2e stack, then they pass, and none defines its own copy of a shared helper.

## Implementation Notes

- Baseline (869b419 + no sweep changes): full API suite 296 tests, 295 passed, 3292 assertions; the one failure is the known `RateLimitTest::test_behind_the_web_proxy_each_browser_address_has_its_own_limit`. `tests/Feature/Assessments`: 47 tests, 47 passed, 441 assertions. After the sweep: identical counts, and `php artisan test --list-tests` gives the same 298-line sorted list before and after.
- `CourseStages` and `AssessmentForLearner` keep the call order: `PublishedCourse` then `StageAvailability::handle`; `StageForTaking` (404) then `assertAvailable` (409).
- `RetakeRuleTest`'s private `read(learner, course)` could not coexist with the shared protected `read(User, Course, StageLevel)` (PHP signature/visibility clash), so its calls now pass `StageLevel::Bronze`; `failBronze`/`passBronze` became `submit(..., StageLevel::Bronze, false|true)`. Same requests, same assertions.
- e2e: `approvedMentorOnCourse` holds only the "Mentor names the Course … Noor approves it" step body. The publish step stays in each spec (it is its own `test.step`). take-bronze keeps its own three Request / Accept / Course Completed steps, because they carry extra assertions in between, so `toCourseCompleted` is used only by bronze-lock and gold-pass. take-bronze's `openCourse` is a thin wrapper over the shared one plus `hidesAnswers(body)`; the hides check now runs after the Mentors-card wait instead of before it (same assertions).
- Verification after the sweep: `web` lint and build pass; `./e2e/run.sh tests/take-bronze.spec.ts tests/bronze-lock.spec.ts tests/gold-pass.spec.ts` gives 5 passed (the 3 epic-3 specs plus the 2 `[clock]` project request-clock tests the config always pulls in).
- e2e has no tsconfig or local node_modules; typechecked in a scratch copy with `npm ci` + `tsc --noEmit --strict --noUnusedLocals` over the specs and helpers: clean.

## Plan Change Log

## Review Triage Log

### Pass 1 (quick lens): high 0, medium 0, low 1, false 0, maybe-false 0

| # | Lens | Location | Finding | Verdict | Route | Evidence / action |
|---|------|----------|---------|---------|-------|-------------------|
| 1 | quick | `e2e/tests/support/helpers.ts` `openCourse` | The extraction dropped take-bronze's comment explaining why the Mentors-card wait exists; without it the wait looks removable, and `toHaveCount(0)` on the Stages region would then pass on a slow page | low | patch | Confirmed: the comment was deleted from `take-bronze.spec.ts` and not carried into the helper. Patched: the comment is restored above the Mentors-card wait. It is comment-only, so the API, web and e2e results from before the patch still stand (e2e: 5 passed, including all three epic-3 specs). |

## Verification

**Commands:**
- `cd api && php artisan test --compact` -- expected: same count as baseline, all pass except the known `RateLimitTest::test_behind_the_web_proxy_each_browser_address_has_its_own_limit`.
- `cd web && npm run lint && npm run build` -- expected: pass (no web change; confirms nothing broke).
- `./e2e/run.sh tests/take-bronze.spec.ts tests/bronze-lock.spec.ts tests/gold-pass.spec.ts` -- expected: green. Run it alone. If Docker fails with "error getting credentials", `docker pull` the image and retry.
