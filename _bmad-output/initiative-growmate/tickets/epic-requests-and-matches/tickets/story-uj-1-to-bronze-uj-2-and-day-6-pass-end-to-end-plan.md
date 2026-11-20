---
title: 'UJ-1 to Bronze, UJ-2 and day 6 pass end to end'
type: 'chore'
ticket: '10'
created: '2026-11-20'
status: 'in-progress'
baseline_revision: 'c80d523c766f765d198cd5ba73b46707a7e1a17e'
route: 'full'
route_source: 'auto'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 2 has no end-to-end proof for Course Completed with its Bronze notice, a Mentor Quit then a new Request (UJ-2), a Learner Quit, Quit then a new Request then a Cancel, or the Upskilling list. Day 3 and day 6 are already covered by `request-clock.spec.ts`.

**Approach:** Add Playwright specs on the seeded e2e stack that cover only what is missing. They use fresh Employees and a run-tagged Course so they never touch the seeded Priya, Rafi and Imani Matches that other specs rely on. Any test clock change is cleared afterwards.

## Boundaries & Constraints

**Always:** Mirror the structure of `uj-3-and-course-publishing.spec.ts` and `uj-4-and-the-excluded-employee.spec.ts`: a header comment, `test.slow()`, `test.step` blocks, `page.emulateMedia({ colorScheme: 'light' })`, other actors through `newPage` or `newSignedUpEmployee`, sessions closed at the end. Use accessible roles and names, as no test ids exist. Every Course is created with `publishCourse` and every Employee with `newEmployee` or `newSignedUpEmployee`, so names are unique per run. Any spec that calls `setClock` calls `clearClock` in a `finally` or `afterEach`. For the Upskilling table, assert on this run's own names only, since other specs' Matches also appear. Use `hidesSecrets` from `support/helpers.ts` on API responses it applies to.

**Never:** Change production code, existing specs (other than a shared helper being added), seed data or `run.sh`. Do not quit, complete or otherwise touch the seeded Priya-Rafi Match. Do not re-add the day-3 and day-6 reminders already covered in `request-clock.spec.ts`. Do not add retries or arbitrary sleeps beyond the existing `waitForTimeout(1100)` Mentor-approval pattern.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| UJ-1 to Course Completed | Learner Requests, Mentor Accepts, Mentor confirms Course Completed | Match gone for both; Learner has "Bronze is open for [Course]."; bar stays In progress; Learner has no Request button; Stages card shows Bronze available | no error |
| UJ-2 Mentor quits | Live Match, Mentor Quits with "Moving teams, sorry" | Learner's notice "[Mentor] quit [Course]." with the quoted reason; Learner's bar is Quit; Match gone from both Homes; Learner requests another Mentor | no error |
| Learner quits | Live Match, Learner Quits with a reason | Mentor gets the Quit note; Learner's bar is Quit, the same as when the Mentor quit | no error |
| Quit, Request, Cancel | Quit Learner sends a new Request, clock passes day 6 | Quit bar becomes Not yet started on the Request, then no bar and no status after the Cancel | no error |
| Upskilling | Learners In progress, Quit or Not yet started | Employee and Admin both see this run's In progress rows only, sorted, with no counts or actions | no error |
| Blank reason | Quit dialog, empty reason | Inline error, Match stays live | inline alert |

</frozen-after-approval>

## Code Map

- `e2e/tests/uj-3-and-course-publishing.spec.ts`, `e2e/tests/uj-4-and-the-excluded-employee.spec.ts` -- structure to mirror (header comment, `test.slow()`, `test.step`, sessions).
- `e2e/tests/take-bronze.spec.ts` -- run-tagged Course, Mentor approved through Admin after `waitForTimeout(1100)`, and the Course Completed flow to copy; it does not assert the Bronze notice.
- `e2e/tests/request-clock.spec.ts`, `e2e/helpers/clock.ts` -- `setClock`/`clearClock` usage; both clear cookies, so sign in again afterwards; day 3 and day 6 already covered.
- `e2e/tests/support/helpers.ts` -- `newEmployee`, `newSignedUpEmployee`, `publishCourse`, `decide`, `signIn`, `adminSignIn`, `newPage`, `apiRequest`, `hidesSecrets`, `waitForGet`.
- `e2e/tests/home-and-match.spec.ts`, `request-and-accept.spec.ts` -- depend on the seeded Priya-Rafi Match; never touch it.
- `e2e/playwright.config.ts` -- two projects, `workers: 1`; new specs run in the `chromium` project alphabetically after `clock`. Note the story 2.9 comment on the clock spec says it leaves a live Match, but `request-clock.spec.ts` deletes its Requests (and Matches) in `afterEach`; report this discrepancy in Implementation Notes and do NOT edit the config.
- Selectors (from `web/src/features/matching/Match.tsx`, `QuitDialog.tsx`, `notifications/Notices.tsx`, `progress/Upskilling.tsx`): Match page region named for the other person; bar `getByRole('img', { name: 'Progress: In progress' })`; buttons `Course Completed` (Mentor only) and `Quit Course`; dialog `Course Completed` and dialog `Quit Course` with `getByLabel('Reason')`; Notices region `Notices`, Quit note "[Name] quit [Course]." with the reason quoted in curly quotes, Bronze note "Bronze is open for [Course]."; nav link `Upskilling`, region `Upskilling` with a table (Name, Course, Status); empty "No one is in progress."; Mentors region with a `Request` button per row. `expectBar` is copied per file, not shared.
- `POST /api/v1/matches/{id}/quit` and `/course-completed`, `GET /api/v1/upskilling`, `GET .../request-eligibility`, `GET .../progress` -- wait on these with `waitForGet`/response waits.

## Tasks & Acceptance

**Execution:**
- [ ] `e2e/tests/uj-1-and-uj-2-quit-and-upskilling.spec.ts` (name may be split into two files) -- UJ-1 through Course Completed with the Bronze notice and the bar, UJ-2, the Learner-initiated Quit, Quit then a new Request then a Cancel with the clock, and the Upskilling list as Employee and Admin
- [ ] Reuse existing helpers; add a helper to `support/helpers.ts` only where two or more tests need it
- [ ] Confirm the specs are discovered and compile: `npx playwright test --list` from `e2e/` (install with `npm ci` there if `node_modules` is missing)

**Acceptance Criteria:**
- Given the specs, then each journey in the I/O matrix has at least one test that asserts its expected behavior.
- Given the specs, then none touches the seeded Priya, Rafi or Imani Matches and every `setClock` is paired with `clearClock`.
- Given `npx playwright test --list`, then the new tests are listed with no compile error.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

The story's own verify ("runs green against the seeded e2e stack") cannot be met on this machine because Docker is not installed. The implementer must say so, run only `--list`, and not claim a passing run.

## Verification

**Commands:** (Windows. Docker is not installed, so the stack cannot start and the suite cannot be run here. Do not touch git: no commits, no branches, no pushes. The working tree has unrelated changes you must leave alone.)
- `npm ci` in `e2e/` if `node_modules` is missing, then `npx playwright test --list` -- expected: the new tests are listed, no compile errors
- `npx tsc --noEmit` in `e2e/` if a tsconfig exists -- expected: no errors in the new files

**Manual checks (if no CLI):**
- Read each new test against the I/O matrix and the selectors listed in the Code Map.
