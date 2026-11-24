---
title: 'UJ-1 to Gold, the Lock and a Gold Mentor''s Accept pass end to end'
type: 'feature'
ticket: '6'
created: '2026-11-24'
status: 'built'
baseline_revision: '29424a9b5dfac3880c013461304c3e979e8fc33f'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'none'
review_source: 'pinned'
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 3's journeys are only proven in pieces:
- `take-bronze` covers Bronze.
- `bronze-lock` covers Bronze's Lock and reopening.
- `gold-pass` passes Bronze and Silver through the API.

Nothing yet runs UJ-1 step 4 through the UI (Bronze, Silver failed once and retaken at once, then Gold), shows a Lock on a later Stage keeping the next Stage hidden, or shows a new Gold Mentor Accepting a Request (SM-2, epic R7).

**Approach:** Add one Playwright spec with two tests, run on the seeded e2e stack. Both use fresh Employees and a run-tagged Course.
1. UJ-1 through the UI to Gold and Completed, then another Employee Requests the new Mentor, who Accepts.
2. A Silver Lock under the test clock: Gold stays hidden while Silver is Locked, and Take Silver comes back when the Lock ends.

## Boundaries & Constraints

**Always:**
- Mirror the existing epic-3 specs: header comment, `test.slow()`, `test.step`, `page.emulateMedia({ colorScheme: 'light' })`, other actors through `newPage`/`newSignedUpEmployee`, and sessions closed at the end.
- Use accessible roles and names only.
- Every Course comes from `publishCourse`, and every Employee from `newEmployee`/`newSignedUpEmployee`.
- Every `setClock` is paired with `clearClock` in `finally`.
- Use the shared helpers from story 3.5 (`openCourse`, `approvedMentorOnCourse`, `toCourseCompleted`).
- Add a shared helper only when two specs need it.
- Use `hidesSecrets` on the API responses it applies to.

**Never:**
- Change production code, seed data, `run.sh` or `playwright.config.ts`.
- Touch the seeded Priya, Rafi or Imani Matches.
- Repeat what `bronze-lock` already proves: the race, the minute before the end, the month overflow.
- Add retries or sleeps beyond the existing `waitForTimeout(1100)` Mentor-approval pattern.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| UJ-1 through the UI | After Course Completed: Bronze answered "Yes"; Silver "No", then "Yes" at once; Gold "Yes" | "Passed.", "Not passed.", "Passed.", "Passed."; the Silver retake is offered straight after the fail; the bar reads "Progress: Completed" on the Course page and Home | no error |
| New Mentor listed | Another Employee opens the Course | The Learner is in the Mentors list with a Request button | no error |
| Gold Mentor Accepts (SM-2) | That Employee Requests the new Mentor, who Accepts on Requests | Accept 201; the Requester's bar reads In progress; the new Mentor's Home Mentoring lists the Requester | no error |
| Silver Lock hides Gold | Bronze passed, clock at 2027-03-10T10:00Z, Silver failed twice | Stages `[bronze passed, silver locked 2027-04-10T10:00:00Z]`; card "SilverLocked until 10 Apr 2027", no link; Gold not shown | Gold read 409 `ASSESSMENTS_STAGE_UNAVAILABLE` |
| Silver Lock ends | Clock at 2027-04-10T10:00Z | Take Silver is back; Gold still not shown until Silver is passed | no error |

</frozen-after-approval>

## Code Map

- `e2e/tests/support/helpers.ts`. Story 3.5 added `openCourse`, `approvedMentorOnCourse` and `toCourseCompleted`. Also use `newEmployee`, `newSignedUpEmployee` (returns `{page, name, email, close}`), `publishCourse` (one question "Question?" with options Yes (correct) and No, Pass mark 70 on all three Stages), `apiRequest`, `hidesSecrets`, `waitForGet`, `signIn` and `adminSignIn`.
- `e2e/tests/gold-pass.spec.ts:22`, local `passThroughApi(page, courseId, level)`. The new Lock test also needs it, so move it to `helpers.ts` as `passStageThroughApi` and import it in `gold-pass`. The body stays unchanged.
- `e2e/tests/take-bronze.spec.ts:109-146` shows how to take a Stage in the UI:
  - the `Take <Level>` link in region `Stages`;
  - the heading `${course} — <Level>`;
  - the group `1. Question?` with radios Yes and No;
  - the `Submit answers` button and the attempts POST response wait;
  - `getByRole('status')` reading "Passed." or "Not passed.";
  - the `Back to ${course}` link.

  Put it in a local `takeInUi(page, courseId, course, level, answer, result)` in the new spec.
- `e2e/tests/bronze-lock.spec.ts:30-167`:
  - setting the clock with `setClock`/`clearClock` from `e2e/helpers/clock.ts`;
  - `signInAgain` (the clock signs the page out);
  - card text `<Level>Locked until <d Mon yyyy>`, with no link or button.
- `e2e/tests/gold-pass.spec.ts`:
  - Completed bar: `getByRole('img', { name: 'Progress: Completed' })` on the Course page and on Home's Learning region;
  - Mentors list check: another Employee opens the Course and finds the Learner's name in region `Mentors`.
- Request and Accept steps are the body of `toCourseCompleted` in `helpers.ts`. The Learner's Mentors row has a `Request` button. The Mentor uses nav `Requests`, then the listitem filtered by the Requester's name, then `Accept` (wait for `/requests/{id}/accept` 201). Mentor Home has region `Mentoring` with a link named for the Learner. Learner bar: `Progress: In progress`.
- `e2e/playwright.config.ts` -- `workers: 1`; a new spec joins the `chromium` project automatically.
- New file `e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts`.

## Tasks & Acceptance

**Execution:**
- [ ] `e2e/tests/support/helpers.ts`, `e2e/tests/gold-pass.spec.ts` -- move `passThroughApi` to the shared `passStageThroughApi`.
- [ ] `e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts` -- test 1: UJ-1 through the UI to Completed, the Learner listed as a Mentor, and a third Employee Requests them and they Accept.
- [ ] Same spec -- test 2: a Silver Lock under the clock hides Gold, then Take Silver returns at `locked_until`, with `clearClock` in `finally`.

**Acceptance Criteria:**
- Given the new spec, then each row of the I/O matrix has a step that asserts it.
- Given `./e2e/run.sh tests/uj-1-to-gold-and-the-gold-mentor.spec.ts tests/gold-pass.spec.ts`, then both specs pass.

## Implementation Notes

- Done by a subagent. `passThroughApi` moved to `helpers.ts` as `passStageThroughApi`, with its body unchanged. The new spec has local `takeInUi`, `failStageThroughApi` and `signInAgain`. Every I/O row has an asserting step.
- `tsc --noEmit --strict --noUnusedLocals` over the changed specs and `helpers.ts` (in a scratchpad copy of `e2e/`): clean.
- The new spec alone was green in 1 of 1 runs. The four-spec Verification command was fully green in 2 of 5 runs (7 passed). The other runs each failed one or both new tests, every time with a 90 s timeout in the shared `approvedMentorOnCourse`, before any new step ran. The four existing specs passed in every run.
- Cause: WSL wall time steps back 2–4 s about every 30 s. When that happens between `publishCourse` and the Mentor's sign-up, the Course is "published after" the account and is missing from the Mentor check. This is an environment issue, not the new code. It is recorded in deferred-work.md.
- 2026-11-24: the human chose to commit as is, with the flakiness deferred, and without the step-04 review lens (`review: none`). The orchestrator read the full diff before committing.

## Plan Change Log

## Review Triage Log

## Verification

**Commands:**
- `./e2e/run.sh tests/uj-1-to-gold-and-the-gold-mentor.spec.ts tests/gold-pass.spec.ts tests/bronze-lock.spec.ts tests/take-bronze.spec.ts` -- expected: all green (the 2 `request-clock` tests also run). Run it alone. If Docker fails with "error getting credentials", `docker pull` the image and retry.
- In a scratchpad copy of `e2e/` with `npm ci`: `npx tsc --noEmit --strict --noUnusedLocals` over the changed specs and `helpers.ts` -- expected: clean (`e2e/` has no tsconfig of its own).
