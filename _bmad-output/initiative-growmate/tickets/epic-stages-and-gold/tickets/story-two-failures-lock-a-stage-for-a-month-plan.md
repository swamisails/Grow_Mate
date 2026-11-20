---
title: 'Two failures Lock a Stage for a month'
type: 'feature'
ticket: '2'
created: '2026-11-20'
status: 'built'
baseline_revision: '0eca1a8dd9c3d814be137764526c45dd3187152d'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After 3.1, a Learner can fail Bronze any number of times. The Retake rule (two attempts, then a fixed one-month Lock, then two again, repeating) does not exist, so nothing stops unlimited guessing.

**Approach:** Derive the Retake rule and the Lock inside `StageAvailability` from the stored attempts against `now()`. Report a Locked Stage as `locked` with its `locked_until`, and refuse attempts while it is Locked. Show "Locked until [date]" with no button on the Stages card. Re-check under the existing Learner row lock in the submit transaction, so two simultaneous last attempts record one.

## Boundaries & Constraints

**Always:**
- The Lock ends at `second_failure.submitted_at->addMonthNoOverflow()` (AD-5): 31 Jan gives 28 or 29 Feb.
- Locked holds while `now() < locked_until`; from `locked_until` on, the Stage is available with two fresh attempts.
- Attempts are walked in `id` order per Learner, Course and Stage. Every second failure in a cycle starts a Lock, and the cycle resets after it. A pass ends the walk as `passed`.
- The Lock is derived, never stored, and nothing can configure the month.
- Attempts and Locks carry no Match reference, so a Quit or a new Match changes nothing.
- All time comes from `now()`, never SQL time.
- Dates are returned as ISO-8601 UTC, and the SPA shows the UTC calendar date through `copy.date`.
- A Locked submit or read is a 409 `ASSESSMENTS_STAGE_LOCKED`.
- The in-transaction availability check runs after `LockUser`.

**Never:**
- No Silver or Gold availability (entry 3), no Gold effects (entry 4).
- No attempt counter, countdown or "attempts left" anywhere.
- No notice for a Lock.
- No scheduled job.
- Do not change scoring, the taking-read shape, `CourseCompleted` or the stage_attempts schema.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| One failure | 1 failed Bronze attempt | Bronze `available`; "Take Bronze" | No error expected |
| Second failure Locks | 2nd failure at 2027-01-10 10:00Z | Bronze `locked`, `locked_until` 2027-02-10T10:00:00Z; card "Locked until 10 Feb 2027", no button | No error expected |
| Minute before end | now = locked_until − 1 min | Still `locked`; read and submit refused, nothing stored | 409 `ASSESSMENTS_STAGE_LOCKED` |
| Lock ends | now = locked_until | `available`; two attempts allowed | No error expected |
| Repeats | 2 more failures after the Lock | Locked again, one month after the 4th failure | No error expected |
| Month overflow | 2nd failure 2027-01-31 | `locked_until` 2027-02-28 (2028-01-31 gives 2028-02-29) | No error expected |
| Pass after one fail | fail, then pass | `passed` | No error expected |
| Simultaneous last attempt | 1 failure, then two concurrent failing submits (MySQL) | One 201 stored, the other refused | 409 `ASSESSMENTS_STAGE_LOCKED` |
| Quit or new Match | Locked, then Learner's Match quit or a new one | Still Locked (no Match reference) | No error expected |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Assessments/Queries/StageAvailability.php` -- 3.1's single computation. Extend `handle()` to fetch this Learner's attempts on the Course (ordered by `id`), walk the cycle for Bronze, and return `{level, state, locked_until?}`. Extend `assertAvailable()` to throw `StageLocked`. Keep the shape a list. Entry 3 reuses the per-Stage walk, so write it as a private method that takes one Stage's attempts.
- `api/app/Modules/Assessments/ErrorCode.php`, `Exceptions/AssessmentRuleViolation.php` -- add `StageLocked = 'ASSESSMENTS_STAGE_LOCKED'`, with the message "This stage is locked for now.".
- `api/app/Modules/Assessments/Actions/SubmitAttempt.php` -- already does a pre-check, then `LockUser` and `assertAvailable` inside `DB::transaction`. Change nothing there except where the new code requires it. The in-transaction re-check is what makes the concurrent case record one.
- `api/app/Modules/Assessments/Http/Resources/StageStateResource.php` -- add `locked_until` (ISO `Z`) only when the state is `locked`.
- `api/database/factories/StageAttemptFactory.php` -- `failed()` exists. Set `submitted_at` explicitly in tests.
- `api/tests/Feature/Assessments/*` -- the existing helpers (`publishedCourse`, `match`, `answers`, `assertHidesAnswersAndScores`). Use `$this->travelTo()` for time.
- `web/src/api/types/assessments.ts` -- `StageState` becomes a union adding `{level, state: 'locked', locked_until: string}`.
- `web/src/features/assessments/StagesCard.tsx` -- add the Locked row: `meta` text `copy.assessments.lockedUntil(copy.date(locked_until))` with no link. `web/src/app/copy.ts:93` `copy.date` gives "10 Feb 2027".
- `web/src/features/assessments/AssessmentPage.tsx` -- a Locked read or submit is a 409 and already shows the API message. No change expected; cover it with a test.
- `e2e/helpers/clock.ts` (`setClock`/`clearClock` sign the page out; always `clearClock` in `finally`), `e2e/tests/support/helpers.ts` (`apiRequest`, `signIn`, `publishCourse`, `decide`, `newSignedUpEmployee`), `e2e/tests/take-bronze.spec.ts` (the setup steps up to Course Completed, to copy).

## Tasks & Acceptance

**Execution:**
- [x] `Assessments/{ErrorCode.php,Exceptions/AssessmentRuleViolation.php}` -- add `ASSESSMENTS_STAGE_LOCKED`.
- [x] `Assessments/Queries/StageAvailability.php` -- the Retake walk and the Lock; `assertAvailable` refuses Locked.
- [x] `Assessments/Http/Resources/StageStateResource.php` -- `locked_until` for Locked only.
- [x] `api/tests/Feature/Assessments/RetakeRuleTest.php` -- every API row of the I/O matrix with `travelTo`, including both month-overflow dates, two Lock cycles, a Locked read refused, and a Quit plus new Match leaving the Lock in place.
- [x] `web/src/api/types/assessments.ts`, `copy.ts`, `StagesCard.tsx` and its tests -- the Locked row, and no button.
- [x] `web/src/features/assessments/AssessmentPage.test.tsx` -- a Locked 409 on read shows the API message.
- [x] `e2e/tests/bronze-lock.spec.ts` -- set up in real time (Course, approved Mentor, Learner, Course Completed), then `setClock('2027-01-31T10:00:00Z')`, sign in again, fail Bronze once through the UI, and fire two failing submits at once with `apiRequest` in `Promise.all`. Expect exactly one 201 and one 409 `ASSESSMENTS_STAGE_LOCKED`, and the card showing "Locked until 28 Feb 2027" with no button. At 09:59Z on 28 Feb it is still Locked and the API refuses; at 10:00Z "Take Bronze" is back. `clearClock` in `finally`.

**Acceptance Criteria:**
- Given a Locked Bronze, when the Learner opens the Course page, then the Bronze row reads "Locked until [UTC date]" with no button, and nothing shows attempt counts.
- Given the Lock has ended, when the Learner fails twice more, then Bronze is Locked again until one month after the newer second failure.
- Given the e2e stack on MySQL, when two failing submits race on the last attempt, then exactly one is stored.

## Implementation Notes

- Implementation done by subagent (uncommitted on `story/3-2-retake-lock`): ErrorCode `StageLocked`, the `walk()` in StageAvailability, `locked_until` in StageStateResource, RetakeRuleTest (7 tests), the web Locked row with tests, and `e2e/tests/bronze-lock.spec.ts`. The diff was read and matches the plan, and every I/O row has a covering test.
- Verified 2026-11-20: API 279/280 (only the known RateLimitTest fails); Assessments 31/31; web lint and build green; `src/features/assessments` 18/18.
- PAUSED 2026-11-20, before review. Still open from step 3: (a) the e2e rerun `./e2e/run.sh tests/bronze-lock.spec.ts tests/take-bronze.spec.ts`. The first rerun had 3 passed and 1 failed (take-bronze `toHaveURL`, 15.9 min) while vitest ran at the same time, so it is likely load, not a regression. Rerun it with nothing else running, twice, to check the race test isn't flaky. (b) The full `npx vitest run`, alone. Then do step 4 (quick review), then step 5 (commit). If e2e behaves oddly, a run killed mid-spec may have left the test clock frozen; the next bronze-lock run's `clearClock`, or `DELETE /api/v1/testing/clock` on the e2e stack, resets it.

- RESUMED 2026-11-20: `./e2e/run.sh tests/bronze-lock.spec.ts tests/take-bronze.spec.ts` ran alone twice and passed both times (4 passed in 1.5 min, then 4 passed in 1.2 min). The first attempt failed before Playwright started, on a transient Docker credential-helper error (WSL vsock) while pulling `composer:2`. A manual `docker pull` fixed it. Full `npx vitest run` alone: 169/169. Quick review: 3 findings, all rejected (see the triage log).

## Plan Change Log

## Review Triage Log

| # | Lens | Location | Finding | Verdict | Route | Evidence |
|---|------|----------|---------|---------|-------|----------|
| 1 | quick | `web/src/features/assessments/StagesCard.test.tsx` "UTC calendar date" test | Only discriminates UTC vs local getters when the runner TZ is ahead of UTC; nothing pins TZ | low | rejected | True: no TZ in `package.json`/`vite.config.ts`, no CI in repo. The dev machine is IST, so the test does check something there. Pinning TZ is test-wide config, not a direct correction. |
| 2 | quick | `e2e/tests/bronze-lock.spec.ts` race step | `[201, 409]` passes through the pre-transaction check if the requests don't overlap, so the in-transaction re-check isn't proven | low | rejected | True: `SubmitAttempt` pre-checks before `LockUser`. The outcome AC ("exactly one stored") still holds either way. Proving overlap needs a test-only delay hook, which is added complexity. |
| 3 | quick | plan Implementation Notes | e2e rerun and full vitest are still open | false | rejected | Not a code defect. It's the verification this resume is running (see Implementation Notes). |

## Design Notes

The walk is per Stage, over one query of the Learner's attempts on the Course:

```php
$failures = 0; $lockedUntil = null;
foreach ($attempts as $a) {                 // ordered by id
    if ($a->passed) return ['state' => 'passed'];
    if (++$failures === 2) { $lockedUntil = $a->submitted_at->copy()->addMonthNoOverflow(); $failures = 0; }
}
return $lockedUntil && now()->lt($lockedUntil) ? locked($lockedUntil) : available();
```

The Lock blocks submits, so no attempt ever lands inside a Lock. The walk therefore needs no "attempt during Lock" branch. With the Learner row lock, the second concurrent submit's re-check sees the first one's committed row. The read after `LockUser` takes a fresh InnoDB snapshot, so its check refuses.

## Verification

**Commands:**
- `cd api && php artisan test` -- expected: all pass except the known `RateLimitTest::test_behind_the_web_proxy_each_browser_address_has_its_own_limit`.
- `cd web && npm run lint && npm test && npm run build` -- expected: all pass (rerun once if a known load-flaky test from deferred-work fails in a file this story did not touch).
- `./e2e/run.sh tests/bronze-lock.spec.ts tests/take-bronze.spec.ts` -- expected: green.
