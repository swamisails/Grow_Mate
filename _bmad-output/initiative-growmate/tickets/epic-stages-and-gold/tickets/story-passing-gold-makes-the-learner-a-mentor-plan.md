---
title: 'Passing Gold makes the Learner a Mentor'
type: 'feature'
ticket: '4'
created: '2026-11-20'
status: 'built'
baseline_revision: '480ce1ad49a0e9b45e752197ccd989a3ba5c1e41'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-growmate/ux-growmate/DESIGN.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After 3.3, a Learner can pass Gold but nothing follows. They don't become a Mentor, and their bar stays In progress, so the loop the initiative exists to prove never closes.

**Approach:** On a Gold pass, `SubmitAttempt` calls `GrantMentor` with route Gold pass in the same transaction. This is a no-op if they're already a Mentor there. `ProgressStatus` gains `completed`: after Course Completed, the status is `completed` once Gold is passed and `in_progress` before that, even when an earlier Match was quit (R6). The bar renders Completed as full green. Home, the Course page and the Upskilling list follow from `ProgressStatus`.

## Boundaries & Constraints

**Always:**
- `GrantMentor` stays the only writer of `mentor_routes` (AD-7), and `ProgressStatus` stays the only computation of Progress (AD-4). Completed is derived from stored attempts and never stored.
- A grant happens only when a passed Gold attempt is stored, in the same transaction.
- The result still reads "Passed." exactly as for Bronze. The bar is fully filled with `--color-status-completed` and the word "Completed" beside it, with no numbers (C9).

**Never:**
- No notice of any kind, and no badge, certificate, points or Mentor route shown anywhere (C6, C8).
- Don't change an existing Mentor's route: the first route stands.
- Don't change the walk, scoring, the stage_attempts or mentor_routes schema, or the Match screen.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Gold pass | Bronze and Silver passed, Gold submitted correct | 201 `{passed:true}`; `mentor_routes` row `gold_pass`; progress `completed`; listed in `GET /courses/{id}/mentors` | No error expected |
| Gold fail | Gold submitted wrong | No grant; progress `in_progress` | No error expected |
| Already a Mentor | Approved at registration for this Course, then passes Gold | Route stays `registration_approval`; progress `completed` | No error expected |
| Silver or Bronze pass | Passes below Gold | No grant; `in_progress` | No error expected |
| Quit earlier | Quit Match 1, Match 2 Course Completed | `in_progress` through the Stages, `completed` after Gold | No error expected |
| Upskilling | Gold passed | Learner not on the Upskilling list | No error expected |
| No notice | Gold pass | No `notifications` row is written | No error expected |
| Request the new Mentor | Another Employee requests the new Mentor on this Course | 201, Request created | No error expected |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Assessments/Actions/SubmitAttempt.php` -- inside the existing `DB::transaction`, after creating the attempt: if `$level === StageLevel::Gold` and it passed, call `GrantMentor::handle($learnerId, $courseId, Route::GoldPass)`. The lock order stays user then course, matching `AcceptRequest` (`LockUser` already runs first). Assessments → Mentors is an allowed dependency (AD-3). Update the docblock.
- `api/app/Modules/Mentors/Actions/GrantMentor.php`, `Models/Route.php` (`Route::GoldPass` exists) -- reuse, no change.
- `api/app/Modules/Progress/Queries/ProgressStatus.php` -- inject `Matching\Queries\CourseCompleted` and `Assessments\Queries\StageAvailability`. Check first: if Course Completed, return `completed` when `StageAvailability::handle()`'s last entry is `gold`/`passed`, else `in_progress`. The existing logic follows unchanged. After Course Completed, `LearnerEligibility` refuses new Requests (`CourseAlreadyCompleted`), so no later Request can outrank this. Update the return type and docblock to include `'completed'`.
- `api/app/Modules/Progress/Http/Resources/CourseProgressResource.php`, `Matching/Queries/HomeLists.php`, `Matching/Queries/PartyMatch.php`, `Matching/Http/Resources/{HomeResource,PartyMatchResource}.php` -- widen the docblock status unions with `'completed'`. No logic change: HomeLists sets `match_id` only for `in_progress`, and `UpskillingList` already keeps only `in_progress`.
- `api/tests/Feature/Assessments/AssessmentsTestCase.php` -- reuse `publishedCourse`, `match`, `answers`, `employee`, `stage`, plus `StageAttemptFactory` for the earlier passes.
- `web/src/api/types/progress.ts:3`, `web/src/api/types/matching.ts:43,63` -- add `'completed'` to the status unions.
- `web/src/features/progress/ProgressBar.tsx` -- add `completed` to `words` (`copy.progress.completed`) and `modifiers` (`'completed'`). Update the docblock.
- `web/src/app/copy.ts:179` -- `completed: 'Completed'`.
- `web/src/app/styles.css` after `.progress__fill--in-progress` -- `.progress__fill--completed { width: 100%; background: var(--color-status-completed); }`. The tokens already exist in both themes.
- `web/src/features/progress/ProgressBar.test.tsx` -- follow its existing per-state cases.
- `e2e/tests/take-bronze.spec.ts` and `bronze-lock.spec.ts` -- patterns for a run-tagged Course, a registration-approved Mentor, Request, Accept, Course Completed, `apiRequest` and `openCourse`. Seeded Employees and demo Courses are never used.

## Tasks & Acceptance

**Execution:**
- [x] `api/app/Modules/Assessments/Actions/SubmitAttempt.php` -- grant on a Gold pass.
- [x] `api/app/Modules/Progress/Queries/ProgressStatus.php` and the status docblocks above -- add `completed` and the Course Completed branch.
- [x] `api/tests/Feature/Assessments/GoldPassTest.php` (new) -- every row of the I/O matrix via the HTTP API: the progress read, `/mentors`, the Upskilling list, Home's learning row (`status: completed`, `match_id: null`), `mentor_routes.route`, the notifications count, and a Request from another Employee.
- [x] `web/src/api/types/*`, `ProgressBar.tsx`, `copy.ts`, `styles.css`, `ProgressBar.test.tsx` -- the Completed bar and its test (accessible name "Progress: Completed").
- [x] `e2e/tests/gold-pass.spec.ts` (new) -- a Learner after Course Completed passes Bronze and Silver through `apiRequest` and Gold through the UI. Check: "Passed.", a Completed bar on the Course page and Home, absent from `/upskilling`, and listed in the Course's Mentors list for another signed-in Employee.

**Acceptance Criteria:**
- Given Priya passed Bronze and Silver, when she passes Gold, then she sees "Passed.", her bar reads "Completed" in full green on Home and the Course page, and she leaves the Upskilling list.
- Given Priya passed Gold, when another Employee opens the Course page, then Priya is in the Mentors list with no route or badge shown.
- Given an Employee approved as a Mentor while learning, when they pass Gold, then they are Completed and their route stays Registration approval.

## Review Triage Log

Quick lens: 4 findings. 3 low (patch), 1 false.

| # | Lens | Location | Finding | Verdict | Route | Evidence |
|---|------|----------|---------|---------|-------|----------|
| 1 | quick | `api/app/Modules/Assessments/Actions/SubmitAttempt.php` (lock-order comment) | The comment claims user → Course "can't deadlock", but `SendRequest` (requester X, Course X, then FK S on the Mentor's user row) deadlocks with a Gold submit by that Mentor (own row X, FK S on the Course) | low | patch | Confirmed in `SendRequest::handle`. The hazard predates this change (the `stage_attempts` FK, story 3.1), and the grant adds no new lock. The comment is reworded to drop the guarantee. The hazard itself is deferred. |
| 1b | quick | `SubmitAttempt` vs `SendRequest` lock order | A Mentor still learning the same Course who submits a Stage while being requested can deadlock (MySQL aborts one transaction) | medium | defer | Pre-existing since 3.1. Recorded in deferred-work.md. |
| 2 | quick | `api/app/Modules/Progress/Queries/ProgressStatus.php` docblock | "(R6)" cites the Mentors list in the code's initiative numbering; the Progress rule is R20 | low | patch | `CourseMentors.php:11` uses R6 for the Mentors list, and `SubmitAttempt` uses R19. The plan's "(R6)" is epic-local numbering and stays. |
| 3 | quick | `ProgressStatus.php` final branch | `accepted && ! $quitAny ? 'in_progress' : null` is unreachable as `in_progress` now: Matches end only by `quit` or `course_completed`, and the latter returns early | low | patch | `MatchEndReason` has only those two cases. The fix is a deletion and a comment rewrite. |
| 4 | quick | `SubmitAttempt.php` `use Mentors\Models\Route` | Imports another module's Model (AD-3) | false | reject | `Route` is the enum in `GrantMentor::handle`'s own signature, so calling the owner's Action requires it. `AcceptRequest` does the same. No table read or Model query crosses modules. |

## Design Notes

Completed is read from `StageAvailability` (Gold listed as `passed`) rather than from a raw query for a Gold pass. That way a stray Gold row behind an unpassed Silver never shows Completed, and the bar can never disagree with the Stages card.

## Verification

**Commands:**
- `cd api && php artisan test` -- expected: all pass except the known `RateLimitTest::test_behind_the_web_proxy_each_browser_address_has_its_own_limit`.
- `cd web && npm run lint && npx vitest run && npm run build` -- expected: all pass.
- `./e2e/run.sh tests/gold-pass.spec.ts tests/take-bronze.spec.ts tests/bronze-lock.spec.ts` -- expected: green. Run it alone. If Docker fails with "error getting credentials", `docker pull` the image and retry.
