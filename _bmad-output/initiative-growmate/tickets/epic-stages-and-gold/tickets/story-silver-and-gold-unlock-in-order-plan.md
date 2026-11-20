---
title: 'Silver and Gold unlock in order'
type: 'feature'
ticket: '3'
created: '2026-11-20'
status: 'built'
baseline_revision: 'de031ee9400a011605a212c06f90882db28c9269'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After 3.2, only Bronze is ever reached. Silver and Gold can't be taken, so no Learner can get past Bronze.

**Approach:** Extend `StageAvailability` to list the Stages in order: Bronze, then Silver once Bronze is passed, then Gold once Silver is passed. Each listed Stage keeps 3.2's Retake walk. The list stops at the first Stage that is `available` or `locked`, so later Stages aren't reported and are refused as unavailable. Progress stays In progress through the Stages, with no change to Progress.

## Boundaries & Constraints

**Always:**
- `StageAvailability` stays the only computation of availability (AD-4). The card, the taking read and submit all follow from it.
- Each Stage runs its own Retake walk over its own attempts (3.2's `walk`, unchanged). A Lock on one Stage never touches another Stage's attempts.
- A Stage that isn't reached is not listed, and reading or submitting it is a 409 `ASSESSMENTS_STAGE_UNAVAILABLE`.
- Order is fixed: Bronze, Silver, Gold (`StageLevel` order). A pass on a later Stage never opens anything while an earlier Stage is unpassed.

**Never:**
- No Gold-pass effects (entry 4): no Mentor grant, no Completed status, no change to `ProgressStatus`.
- No attempt counter, no "next Stage" teaser, no notice.
- Don't change the walk's Retake rule, scoring, the taking-read shape, the stage_attempts schema, or the SPA's Stage block behaviour (it already renders any level).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bronze passed | Bronze pass | `[bronze passed, silver available]`; card "Take Silver", no Gold | Gold read/submit 409 `ASSESSMENTS_STAGE_UNAVAILABLE` |
| Silver failed once | Bronze pass, 1 Silver fail | Silver `available` | No error expected |
| Silver Locked | Bronze pass, 2 Silver fails | `[bronze passed, silver locked + locked_until]`; Gold not listed | Silver 409 `ASSESSMENTS_STAGE_LOCKED`; Gold 409 `ASSESSMENTS_STAGE_UNAVAILABLE` |
| Silver passed | Bronze pass, Silver pass | `[bronze passed, silver passed, gold available]` | No error expected |
| Gold Locked | Bronze, Silver pass, 2 Gold fails | Gold `locked` with its own `locked_until` | Gold 409 `ASSESSMENTS_STAGE_LOCKED` |
| All passed | all three passed | three `passed` | Gold 409 `ASSESSMENTS_STAGE_ALREADY_PASSED` |
| Stray later pass | Silver pass row, Bronze unpassed | `[bronze available]` only | Silver 409 `ASSESSMENTS_STAGE_UNAVAILABLE` |
| Bar | Course Completed, then any of the above | progress `in_progress` | No error expected |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Assessments/Queries/StageAvailability.php` -- `handle()` today returns only Bronze. Loop over `StageLevel::cases()` with `CourseStageIds`' map and the already-grouped attempts, appending `['level' => …] + walk(...)`. Stop after the first non-`passed` entry, or at a missing Stage id. `assertAvailable()` and `walk()` need no change. Update the class docblock ("Silver and Gold come in a later entry").
- `api/tests/Feature/Assessments/StageAvailabilityTest.php:48` -- `test_after_a_bronze_pass_…` expects `[bronze passed]` only. It must now expect Silver `available` too. `:63` (stray Silver pass) stays as is.
- `api/tests/Feature/Assessments/ShowAssessmentTest.php:67` and `SubmitAttemptTest.php:109` -- "silver and gold unavailable after a bronze pass". Rewrite so that after a Bronze pass Silver is open (read 200 / submit 201) and Gold is 409 `ASSESSMENTS_STAGE_UNAVAILABLE`.
- `api/tests/Feature/Assessments/AssessmentsTestCase.php` -- helpers `publishedCourse` (all three Stages, one `*Yes`/`No` question at Pass mark 70), `stage`, `match`, `answers`. `StageAttemptFactory` defaults to Bronze and takes `stage_id`; `failed()` exists.
- `api/tests/Feature/Assessments/RetakeRuleTest.php` -- Bronze-only. Its `assertStages` helper asserts a one-row list, which still holds because no test there passes Bronze.
- Progress -- `ProgressStatus` returns `in_progress` after Course Completed and never reads attempts. Assert it via `GET /api/v1/courses/{id}/progress` → `{"data":{"status":"in_progress"}}`. No code change.
- `web/src/features/assessments/StagesCard.tsx` -- already renders any level and state. `StagesCard.test.tsx:90` covers Bronze passed + Silver available. Add one case: Bronze passed, Silver locked, no Gold row and no link.
- `e2e/tests/take-bronze.spec.ts:157-166` -- after the Bronze pass it expects stages `[bronze passed]`, card `BronzePassed` and no links. Update it to Silver `available` with a "Take Silver" link, still no Gold, and Bronze still refused.

## Tasks & Acceptance

**Execution:**
- [x] `api/app/Modules/Assessments/Queries/StageAvailability.php` -- list the Stages in order through the walk, stopping at the first unpassed one.
- [x] `api/tests/Feature/Assessments/StageOrderTest.php` (new) -- every API row of the I/O matrix via `/stages`, the taking read and submit, including Silver's Lock leaving Bronze passed and Gold hidden (using `travelTo` for the end of the Lock), and the progress read staying `in_progress`.
- [x] `api/tests/Feature/Assessments/{StageAvailabilityTest,ShowAssessmentTest,SubmitAttemptTest}.php` -- update the three Bronze-only expectations above.
- [x] `web/src/features/assessments/StagesCard.test.tsx` -- the Locked-Silver-hides-Gold case.
- [x] `e2e/tests/take-bronze.spec.ts` -- the after-pass step expects Take Silver and no Gold.

**Acceptance Criteria:**
- Given a Learner who passed Bronze, when they open the Course page, then they see Bronze "Passed" and "Take Silver", and no Gold.
- Given Silver is Locked, when the Lock ends, then "Take Silver" returns and Gold is still hidden until Silver is passed.
- Given any point in the Stages, when the Learner views their bar, then it shows In progress.

## Implementation Notes

- `StageAvailability::handle()` loops `StageLevel::cases()`, appends `['level' => …] + walk(...)` per Stage, and breaks after the first non-`passed` entry or a missing Stage id. The early return when Bronze has no Stage id is kept so no attempts query runs for it. `walk()` and `assertAvailable()` are unchanged.
- `StageOrderTest` also covers a stray Gold pass row while Silver is unpassed, and stored passes before Course Completed (nothing listed).

## Plan Change Log

- 2026-11-20: The Code Map said `RetakeRuleTest`'s one-row `assertStages` still holds. It doesn't: `test_two_more_failures_after_the_lock_…` and `test_a_pass_after_one_failure_is_passed` pass Bronze, so Silver `available` now follows. The helper became variadic (`array ...$stages`) and those two calls expect `[bronze passed, silver available]`. Likewise `SubmitAttemptTest::test_a_pass_is_stored_…` (line 40) reads `/stages` after a Bronze pass and now expects Silver too.

## Review Triage Log

| # | Lens | Location | Finding | Verdict | Route | Evidence |
|---|------|----------|---------|---------|-------|----------|
| 1 | quick | `e2e/tests/take-bronze.spec.ts:15-18` | Header still says "Bronze only", and line 17 is about 130 characters, unwrapped | low | patch | Confirmed at lines 15–17: the spec now asserts Take Silver, no Gold and a refused Gold read. The fix is a comment-only rewording and rewrap, sent back to the implementer. |

## Verification

**Commands:**
- `cd api && php artisan test` -- expected: all pass except the known `RateLimitTest::test_behind_the_web_proxy_each_browser_address_has_its_own_limit`.
- `cd web && npm run lint && npx vitest run && npm run build` -- expected: all pass.
- `./e2e/run.sh tests/take-bronze.spec.ts tests/bronze-lock.spec.ts` -- expected: green. Run it alone. If Docker fails with "error getting credentials", `docker pull` the image and retry.
