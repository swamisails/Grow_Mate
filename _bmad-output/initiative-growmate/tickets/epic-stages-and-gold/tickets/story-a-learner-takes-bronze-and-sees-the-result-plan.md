---
title: 'A Learner takes Bronze and sees the result'
type: 'feature'
ticket: '1'
created: '2026-11-20'
status: 'built'
baseline_revision: 'af96089b4d17b61cbc1f3db42dff9282de38df15'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md', '{project-root}/_bmad-output/initiative-growmate/ux-growmate/mockups/epic3-assessments.html']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After a Mentor clicks Course Completed, the Learner is told "Bronze is open for [Course]." but there is nowhere to take it: no Stages on the Course page, no Assessment to answer and no scoring.

**Approach:** Tracer bullet through a new Assessments module. A `stage_attempts` table, a `StageAvailability` query (Bronze only, after Course Completed), the AD-14 taking read in Courses with no correct option, a submit that scores once and stores the Pass mark used, a Stages card on the Course page, the Assessment form, the plain result, and an empty Assessments seeder at its AD-17 slot.

## Boundaries & Constraints

**Always:** A pass is correct × 100 ≥ Pass mark × questions, in integers with no rounding, judged once at submission. Store the correct count, the question count, the Pass mark used and `passed`. Attempts are keyed by Learner, Course and Stage with **no Match reference**. No response, taking or result, ever carries which option is correct, a score or a count. Questions and options appear in authored `position` order. The result says only "Passed." or "Not passed.". The Stages card renders only Stages the API reports. Rule refusals are 409 with `ASSESSMENTS_*` codes. Endpoints sit in the `can:employee` group, so Admin gets 403. All time comes from `now()`. All copy lives in `web/src/app/copy.ts`.

**Never:** No Retake count or Lock (entry 2), no Silver or Gold availability (entry 3), no Gold effects and no Completed status (entry 4). No notices for any result. No score, counter, timer or marker anywhere. Do not change `LearnerEligibility`, `ProgressStatus`, `CompleteCourse` or the authoring read.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Before Course Completed | Learner with a live Match, no Match, or a Quit Match | Stages list empty; no Stages card | No error expected |
| Bronze open | Match ended `course_completed` | Stages `[{level: bronze, state: available}]`; card shows "Take Bronze" | No error expected |
| Pass | 1 of 1 correct, Pass mark 70 | 201 `{passed: true}`; attempt stored; "Passed."; card then shows Bronze "Passed" | No error expected |
| Fail on the boundary | 2 of 3 correct, Pass mark 67 (200 < 201) | 201 `{passed: false}`; "Not passed." | No error expected |
| Unavailable | Read or submit before Course Completed | Refused, nothing stored | 409 `ASSESSMENTS_STAGE_UNAVAILABLE` |
| Already passed | Read or submit after a Bronze pass | Refused, nothing stored | 409 `ASSESSMENTS_STAGE_ALREADY_PASSED` |
| Bad answers | Missing question, extra question, or an option of another question | Refused, nothing stored | 422 |
| Silver or Gold in 3.1 | Any Learner | Not available | 409 `ASSESSMENTS_STAGE_UNAVAILABLE` |
| Admin or signed out | Any Assessments endpoint | Refused | 403 / 401 |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Matching/Queries/LearnerEligibility.php:77-89` -- private `hasMatch(live:false)` is the Course Completed check. Copy its join into a new public `Matching/Queries/CourseCompleted.php`, and leave LearnerEligibility untouched.
- `api/app/Modules/Courses/Queries/CourseForAuthoring.php` -- the authoring read. Add `StageForTaking` beside it: published Course only (reuse `PublishedCourse` for the 404), `Stage` with `questions.options` in `position` order, selecting no `is_correct`.
- `api/app/Modules/Courses/Models/{Stage,Question,Option,StageLevel}.php` -- `stages(course_id, level, pass_mark)`, `questions(stage_id, position, text)`, `options(question_id, position, text, is_correct)`. No Assessment model; the Stage is the Assessment.
- `api/app/Modules/Matching/{ErrorCode.php,Exceptions/MatchingRuleViolation.php}` -- copy this pattern as `Assessments/ErrorCode.php` and `Exceptions/AssessmentRuleViolation.php` (409 `{message, code}`).
- `api/app/Modules/Matching/Actions/CompleteCourse.php`, `Http/Controllers/*` -- patterns for the Action (one `DB::transaction`), the invokable controller and the JsonResource.
- `api/app/Modules/Accounts/Queries/LockUser.php` -- lock the Learner's row in the submit transaction so two submits serialise. Entry 2 adds the attempt-count check.
- `api/routes/api.php:62-85` -- the `can:employee` group. Add `GET courses/{course}/stages`, `GET courses/{course}/stages/{stage}/assessment` and `POST courses/{course}/stages/{stage}/attempts`, with `course` `[0-9]{1,18}` and `stage` `bronze|silver|gold`.
- `api/database/migrations/` -- new `2026_11_20_000000_create_stage_attempts_table.php`: user, course and stage FKs, `correct_count`, `question_count`, `pass_mark`, `passed`, `submitted_at`, index on (learner_id, course_id).
- `api/database/seeders/DatabaseSeeder.php:21-25` -- append the `AssessmentsSeeder` after `MentorsSeeder`. No Matching seeder exists; keep the AD-17 docblock.
- `api/tests/Feature/Matching/CompleteCourseTest.php`, `MatchingTestCase` -- test patterns. `MentorMatchFactory::courseCompleted()` exists. `CourseFactory` has no published state, so use `['published_at'=>now()]` and add questions with `QuestionFactory`/`OptionFactory::correct()`.
- `web/src/features/courses/CoursePage.tsx:97` -- `card-grid`. Add `<StagesCard courseId>` after the Description card.
- `web/src/features/courses/routes.ts:9` -- add `/courses/:id/stages/:stage` (employee) to a new `features/assessments/routes.ts`, joined in `web/src/app/routes.ts`.
- `web/src/api/client.ts`, `web/src/api/matching.ts` -- the client function pattern. `web/src/app/forms.ts:66-90` provides `useConflict`/`ConflictMessage` for 409 (always-rendered live region).
- `web/src/features/courses/CourseEditor.tsx:306-340` -- the radio fieldset precedent. `PageStates.tsx` provides `Loading`/`NotFound`, and `PageHeader.tsx` the header.
- `web/src/features/matching/Match.test.tsx:7-33` -- Employee test setup (hand-stubbed `/me`, `/mentor-check`).
- `e2e/tests/uj-4-and-the-excluded-employee.spec.ts`, `e2e/tests/support/helpers.ts` -- spec pattern and helpers (`publishCourse` sets 1 question with "Yes" correct and Pass mark 70; `decide`, `newSignedUpEmployee`, `apiRequest`).

## Tasks & Acceptance

**Execution:**
- [x] `api/database/migrations/..._create_stage_attempts_table.php`, `Assessments/Models/StageAttempt.php`, `database/factories/StageAttemptFactory.php` -- the table and model.
- [x] `Matching/Queries/CourseCompleted.php` -- public `handle(learnerId, courseId): bool`.
- [x] `Courses/Queries/StageForTaking.php` -- the taking read.
- [x] `Assessments/Queries/StageAvailability.php` -- returns reached Stages only: `[]` before Course Completed, otherwise Bronze as `available` or `passed`. This is the only place this state is computed.
- [x] `Assessments/{ErrorCode.php,Exceptions/AssessmentRuleViolation.php,Actions/SubmitAttempt.php}` -- validate the answers (one option per question, owned by that question), lock the Learner, re-check availability, score, then store.
- [x] `Assessments/Http/{Controllers,Requests,Resources}` and routes -- the stages list, the taking read (409 when not available), submit (201 `{passed}`).
- [x] `Assessments/Database/Seeders/AssessmentsSeeder.php` and `DatabaseSeeder.php` -- an empty seeder in its slot.
- [x] `api/tests/Feature/Assessments/*Test.php` -- every I/O row, plus a check that responses contain no `is_correct`, `correct_count`, `question_count` or `pass_mark` key, and that `stage_attempts` has no match column.
- [x] `web/src/api/{assessments.ts,types/assessments.ts}`, `copy.ts` -- client, types and strings.
- [x] `web/src/features/assessments/{StagesCard,AssessmentPage,routes}.tsx`, `CoursePage.tsx` -- the card, plus the form and result per EXPERIENCE.md.
- [x] `web/src/features/assessments/*.test.tsx` -- card states, Submit disabled until all are answered, Passed and Not passed, 409 message, 404 renders Not found.
- [x] `e2e/tests/take-bronze.spec.ts` -- a run-tagged Course, Mentor (approved at registration) and Learner. Before Course Completed no Stages card; after it Take Bronze leads to "Passed.", and the API responses carry no correct-option field.

**Acceptance Criteria:**
- Given Course Completed, when the Learner opens the Course page, then a Stages card shows Bronze with "Take Bronze", and no Silver or Gold.
- Given the Assessment page, when not every question has an answer, then Submit answers is disabled. Leaving the page uses no attempt.
- Given a submitted attempt, when the result shows, then it reads exactly "Passed." or "Not passed." with a link back to the Course, and the Course page then shows Bronze "Passed" (or still "Take Bronze" after a fail).

## Implementation Notes

- AD-3 kept: Assessments reads Courses and Matching only through their Queries. Besides `StageForTaking`, Courses gained two internal reads: `StageAnswerKey` (stage id, Pass mark, option ids and the correct option per question; used only for scoring, never returned) and `CourseStageIds` (level → stage id, so attempts key by Stage without reading `stages`).
- Submit order: 404 (published Course) → availability pre-check (409) → answer fit (422) → transaction: `LockUser`, availability re-check (409), score, insert. The pre-check means an unavailable Stage refuses with 409 before its question ids are matched, so nothing about it leaks through a 422. Shape errors (not a list, non-integer ids, a question twice) are the FormRequest's 422.
- 409 messages: `ASSESSMENTS_STAGE_UNAVAILABLE` "This stage isn't open to you.", `ASSESSMENTS_STAGE_ALREADY_PASSED` "You have already passed this stage.".
- SPA: the Stages card renders nothing until the read returns a non-empty list (also on a failed read). The Assessment page keeps an always-rendered `ConflictMessage`; a 409 on read or submit shows the API message and a "Back to the course" link, and a submit 409 re-reads the Stage. Added a `quiz` icon for the page-title tile.
- Outside the story: `web/src/features/matching/QuitDialog.tsx` failed `tsc -b` on the baseline (TS2677 type predicate), so `npm run build` was red before this story; fixed with a type-only change. `EmployeeCourses.test.tsx`'s catch-all stub answered `/stages` with a Course object, so it now answers `[]`.

- Review pass 1 patch: `StageForTaking` now returns a plain array and `AssessmentResource` maps it, so Assessments imports no Courses Models (the note above claimed AD-3 was kept, but the first cut had not kept it). Only the `StageLevel` enum crosses the boundary, as Matching does with the Mentors `Route` enum. The dead `.assessment__refusal:empty` rule is removed, and `read()` clears a stale refusal on success, with a new test.

## Plan Change Log

## Review Triage Log

### Pass 1 (quick lens): high 0, medium 1, low 4, false 0, maybe-false 0

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | `AssessmentResource` reads Courses' Eloquent `Stage`/`Question`/`Option`; Assessments imports `Courses\Models` (AD-3) | medium | patch | Confirmed: AD-3 says other modules never import another module's Models. Patched: `StageForTaking` returns a plain array and the resource maps it; the exact-JSON test passes unchanged. The `StageLevel` enum import stays, matching Matching's import of the Mentors `Route` enum (epic-4 retro item 19 already lists that AD-3 reconciliation). |
| 2 | `ShowAssessmentController` and `CourseStagesController` each call two Queries (AD-3 controller rule) | low | rejected | Confirmed (StageForTaking + assertAvailable; PublishedCourse + StageAvailability). There is no user harm and the 404-then-409 order is tested. The fix is a new Assessments query class, more than a direct correction, so it is rejected under the low rule. Worth folding into entry 5's refactor sweep. |
| 3 | Assessment result has no URL of its own (EXPERIENCE.md: "Every surface has its own URL") | low | rejected | Confirmed against EXPERIENCE.md:27/50. Back still works. A reload after a pass shows the accurate "You have already passed this stage." and the way back, and after a fail a fresh form, which the Retake rule allows. A reload-safe result URL needs a new latest-attempt API read, which is new public surface. Rejected under the low rule; raised with the human as a spec deviation. |
| 4 | `.assessment__refusal:empty` CSS rule is dead | low | patch | Confirmed: `ConflictMessage` renders only `field-error`. Patched: rule deleted. |
| 5 | A stale 409 refusal survives a successful re-read in `AssessmentPage` | low | patch | Confirmed: `read()` success never cleared `refusal`. Patched: `setRefusal(null)` on success, with a new test that fails without it. Submit re-enabling before the re-read only allows a second POST that the API refuses: harmless. |

Post-patch verification: API 272/273 (only the known `RateLimitTest` proxy test fails, as on baseline). Web lint and build are green. Web vitest passed 7 of 8 full runs; the one red run hit a load-timing failure in an untouched file (`CourseMentors`, `MentorCheckCard`); the baseline passed 3 of 3. Deferred with an owner (retro item 20).


## Design Notes

- The result is a state of the Assessment page (same URL), not its own route. A reload re-reads the Stage: after a pass, that gives the 409 message, which is correct.
- The taking read shape: `{course: {id, title}, level, questions: [{id, text, options: [{id, text}]}]}`. The submit body is `{answers: [{question_id, option_id}]}`. Both use ordered arrays, never maps.
- `StageAvailability` returns `[{level, state}]`. Entries 2 and 3 add `locked` with `locked_until`, plus later levels. Keep it a list for that reason.
- Score unit (AD-4 leaves it open): store `correct_count` and `question_count`. These are integer facts, and a percentage would need rounding.

## Verification

**Commands:**
- `cd api && php artisan test` -- expected: all pass except the known `RateLimitTest::test_behind_the_web_proxy_each_browser_address_has_its_own_limit` (red on baseline, epic-4 retro item 16).
- `cd web && npm run lint && npm test && npm run build` -- expected: all pass.
- `./e2e/run.sh tests/take-bronze.spec.ts` -- expected: green (needs Docker and the root `.env`).
