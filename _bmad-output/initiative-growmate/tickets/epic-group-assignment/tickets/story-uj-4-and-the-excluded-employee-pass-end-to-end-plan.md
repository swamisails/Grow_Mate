---
title: 'UJ-4 and the excluded Employee pass end to end'
type: 'chore'
ticket: '5'
created: '2026-11-18'
status: 'built'
baseline_revision: '453b93e1e8e04a97611ee6503e69f6946585290b'
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

**Problem:** Epic 4 has no closing proof that UJ-4 and its two failure paths work together on the deployed stack. The failure paths are the refused Employee and an R7-refused Learner.

**Approach:** Add one Playwright spec that runs EXPERIENCE.md Flow 4 end to end on the seeded e2e stack:
- Noor publishes a Course through the editor, and Sam, refused it at registration, is excluded.
- Five Learners are assigned to Imani, who Accepts them once.
- Noor never sees an Accepted state.
- An R7-refused Learner gets only the generic message.

No product code changes.

## Boundaries & Constraints

**Always:**
- Every Course and person in the spec is new and carries the run's suffix (`newEmployee`). The chosen Employee is a fresh "Imani …" (`first: 'Imani'`). The seeded Imani, Priya and Rafi are never used, so other specs' seeded state stays as it is.
- Noor publishes "SQL Fundamentals <id>" through the editor (`courseEditor` helpers and the Publish dialog, as in `uj-3-and-course-publishing.spec.ts` L24–80). Sam signs up after it is published, names it at the Mentor check, and Noor refuses it on Registration decisions.
- Every API body the spec reads goes through `hidesSecrets`: no `group_assignment_id` and no Mentor route.
- The spec asserts only through the UI and the SPA's own responses, apart from one direct API call: the refused-chosen-Employee POST.

**Never:**
- Product code changes.
- Editing epic 2's specs, including the 5 known failures in `home-and-match.spec.ts` and `uj-3-and-course-publishing.spec.ts`.
- The test clock (day 3 and day 6 are covered by the API tests).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sam excluded | Noor picks SQL Fundamentals on Group assignment | The Chosen Employee select has no Sam option. A direct POST with Sam creates nothing | 409 `MATCHING_MENTOR_NOT_ELIGIBLE` |
| Assign | Noor assigns five Learners to Imani | The "Assignment created" card lists the five. No Learner has a notice. Imani sees one row naming the five with one Accept, and has five `request_sent` notices | — |
| Accept | Imani clicks Accept once | Each Learner has exactly one notice, "Imani … is your mentor for SQL Fundamentals ….", and an `in_progress` Home row. Imani is in the Course's Mentors list. Imani's Requests is empty | — |
| No Accepted state | Noor reopens Group assignment after the Accept | Only the empty form. No "Assignment created" card, no list, no Accepted wording | — |
| R7-refused Learner | Noor assigns one of the five (now in a live Match) plus a fresh Learner to a fresh Employee | The summary line shows, and only that Learner carries "This learner can't be assigned to this course.". The fresh Employee's Requests stays empty | 409 `MATCHING_LEARNER_NOT_ASSIGNABLE` |

</frozen-after-approval>

## Code Map

- `e2e/tests/group-assignment.spec.ts`: story 4.1's spec, the pattern to follow. It has local `hidesSecrets` (L8) and `waitForGet` (L28), the per-person `newPage` sessions, and the Requests, Notices, Home and Mentors checks.
- `e2e/tests/uj-3-and-course-publishing.spec.ts`:
  - L24–80: editor publish with `createCourse`, `fillStage` and `save`, then the Publish dialog.
  - L89–100: Sam's Mentor check, ticking a checkbox by Course title and submitting.
  - L104–116: Registration decisions with `decide(admin, row, 'Refuse', 'Refused')`.
  - It uses `test.slow()` for a long journey.
- `e2e/tests/support/helpers.ts`: `admin`, `newEmployee(label, {first, nameWithId})`, `signUp`, `signIn`, `adminSignIn`, `apiRequest`, `newPage`, `publishCourse`, `decide`.
- `e2e/playwright.config.ts`: the `chromium` project runs every spec except the clock spec.
- UI copy to assert:
  - Admin nav "Group assignment"; card "Assign learners"; selects "Course" and "Chosen Employee"; legend "Learners"; button "Assign"; card "Assignment created".
  - Summary "Nothing was assigned. Some learners can't be assigned to this course."
  - Per-Learner "This learner can't be assigned to this course."
  - Accept notice "{Mentor} is your mentor for {Course}."
- Mentors list rows now include a "Request" button. That's why UJ-3 L158 fails, so match rows with `toContainText` or by name, not an exact `toHaveText`.

## Tasks & Acceptance

**Execution:**
- [ ] `e2e/tests/support/helpers.ts`: move `hidesSecrets` and `waitForGet` here, exported unchanged, and import them in `group-assignment.spec.ts`. Epic 2's specs keep their own copies.
- [ ] `e2e/tests/uj-4-and-the-excluded-employee.spec.ts`: one test with `test.slow()` and one `test.step` per matrix row, in matrix order after a setup step (editor publish, sign-ups, Sam's Mentor check and refusal).

**Acceptance Criteria:**
- Given the e2e stack, when `./e2e/run.sh` runs, then the new spec and `group-assignment.spec.ts` pass, and the only failures are the 5 known ones.
- Given the diff, when it is read, then no file outside `e2e/` changes.

## Implementation Notes

- Branch `story/4-5-uj4-e2e` is cut from `story/4-4-refactor-sweep` (`453b93e`).
- Why the 5 known e2e failures are out of scope: they are epic 2 specs gone stale.
  - `uj-3…:158` expects a Mentors row without the Request button that 2.1 added.
  - `home-and-match` L114, L132, L161 and L191 expect Priya to already have a Python Basics Match.

## Plan Change Log

## Review Triage Log

- Quick review, pass 1: high 0, medium 1, low 1, false 1, maybe-false 0.
  - low, patch: the new `hidesSecrets` JSDoc said it checks "whether an assignment was accepted" and left out the `gold_pass` and `registration_approval` checks. Reworded to match the body, which is unchanged.
  - false: the "No Accepted state" step's courses wait could catch the Courses page's read. Both pages read the same `GET /api/v1/admin/courses`, so `hidesSecrets` checks an identical body either way, and the assertions that follow auto-wait on the UI.
  - medium, defer: the uncommitted `api/.env.example` edit sits in the working tree. It is the user's pre-existing change, kept out of this commit (epic 1 retro item 8).

## Verification

**Commands:**
- `./e2e/run.sh`: `uj-4-and-the-excluded-employee.spec.ts` and `group-assignment.spec.ts` pass; only the 5 known failures remain.
