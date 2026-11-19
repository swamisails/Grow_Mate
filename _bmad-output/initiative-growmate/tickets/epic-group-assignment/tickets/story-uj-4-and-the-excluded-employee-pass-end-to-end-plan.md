---
title: 'UJ-4 and the excluded Employee pass end to end'
type: 'chore'
ticket: '5'
created: '2026-11-19'
status: 'built'
baseline_revision: '0ef317aa04645c7fba06e11db0131c95ad0a9dec'
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

**Problem:** Epic 4's "Done when" asks for UJ-4 to be verified end to end on the deployed app. That means Noor staffing a Course through one Group assignment and Imani's single Accept, plus two failure paths: the excluded Employee (Sam) and an R7-refused Learner. Today only `group-assignment.spec.ts` covers a three-Learner Accept. Neither failure path has an e2e test.

**Approach:**
- Add one closing spec that runs UJ-4 (Flow 4) as a single serial journey of `test.step`s on the seeded e2e stack, shaped like epic 1's `uj-3-and-course-publishing.spec.ts`.
- Lift the epic-4 helpers it shares with `group-assignment.spec.ts` into `support/helpers.ts`, so no new copies appear.

## Boundaries & Constraints

**Always:**
- Fresh data per run:
  - Courses and Employees carry the run's id.
  - The chosen Employee and Learners are signed up as `Imani <id>`, etc.
  - Seeded Employees and demo Courses are never named, assigned or decided, so other specs stay as seeded.
- Publish through the `publishCourse` API helper. Editor publishing (Flow 4 steps 1–3) is already covered by the uj-3 spec.
- Assert what each person sees in the UI. Run `hidesSecrets` on every API body the journey reads.
- Mark the test `test.slow()`.

**Never:**
- Any change to `api/` or `web/`. If the journey exposes a product bug, stop and report it rather than patching the product.
- Touching epic 2's `hidesSecrets` copies or the three existing `waitForTimeout(1100)` sleeps. Those are epic 1 retro items 4 and 5.
- Staging the uncommitted `api/.env.example` edit or the walkthrough-story-4-1 folder.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sam excluded | Course published, then Sam signs up and names it at the Mentor check. Noor refuses it on Registration decisions. | Group assignment's Chosen Employee select doesn't offer Sam once the Course is picked. Sam is still listed as a Learner option. | A direct `POST /api/v1/admin/group-assignments` with Sam as `mentor_id` gives 409 `MATCHING_MENTOR_NOT_ELIGIBLE` and creates nothing |
| UJ-4 Assign | Noor picks the Course, Imani and five Learners, then Assign | The created card lists the five, and the form resets | No error expected |
| Before Accept | Five pending Requests | Imani sees one row naming all five, with one Accept, plus five `request_sent` notices. Each Learner has no notice and no Request button on the Course. | No error expected |
| One Accept | Imani clicks Accept once | Imani's Requests list is empty. Each of the five sees only "Imani … is your mentor for <Course>." and an in-progress Match on Home, with five distinct `match_id`s. Imani is in the Course's Mentors list. | No error expected |
| Noor after Accept | Noor reloads Group assignment | No created card, no history, and no "Accepted" text anywhere | No error expected |
| R7-refused Learner | Noor assigns [a Learner with a live Match, Sam] to Imani | Summary "Nothing was assigned. Some learners can't be assigned to this course." Only the matched Learner gets "This learner can't be assigned to this course." and Sam gets no mark. The body is exactly `{message, code, errors}`. | 409 `MATCHING_LEARNER_NOT_ASSIGNABLE`. Imani's Requests stay empty and Sam has no `request_sent` notice. |

</frozen-after-approval>

## Code Map

- `e2e/tests/uj-3-and-course-publishing.spec.ts`: the model for the closing journey: `test.slow()`, named `test.step`s, a Mentor check, then `decide()` to refuse. The `waitForTimeout(1100)` at L86 is there because a Course can be named only if it was published strictly before the account was created, to the second.
- `e2e/tests/group-assignment.spec.ts`:
  - L8–30 hold `hidesSecrets`, `newSignedUpEmployee` and `waitForGet`. Move them; nothing else in the file changes.
  - L32–181 have the locators to reuse: the `Assign learners` region, the `Learners` group, the `Assignment created` region, the group row sentence `A, B, C, D and E requested you…`, and `.notice-row__sentence`.
- `e2e/tests/support/helpers.ts`: has `adminSignIn`, `newEmployee`, `newPage`, `signUp`, `signIn`, `publishCourse`, `apiRequest` and `decide`. These receive the three lifted helpers.
- `web/src/features/matching/GroupAssignment.tsx` (read only):
  - The summary is a `role="status"` paragraph in the form.
  - Each per-Learner mark is a `.group-assignment__mark` linked to its checkbox with `aria-describedby`. Use `toHaveAccessibleDescription`.
  - The Chosen Employee select drops refused ids after `GET /api/v1/admin/courses/{id}/refused-employees`. Wait for that read before asserting the options.
- `e2e/playwright.config.ts`: the chromium project collects the new spec automatically. No config change.

## Tasks & Acceptance

**Execution:**
- [x] `e2e/tests/support/helpers.ts`: add the exported `hidesSecrets`, `newSignedUpEmployee(browser, label, first)` and `waitForGet(page, path)`, lifted verbatim from `group-assignment.spec.ts`. This stops another copy appearing.
- [x] `e2e/tests/group-assignment.spec.ts`: delete the three local definitions and import them. No assertion changes.
- [x] `e2e/tests/uj-4-and-the-excluded-employee.spec.ts`: one test with steps in matrix order:
  1. publish;
  2. Sam signs up and names the Course, and Noor refuses it;
  3. Sam isn't offered, and the direct POST gets a 409;
  4. Assign five;
  5. Imani's block and notices, and the Learners' silence;
  6. one Accept;
  7. the five Learners' Accept line and Matches, and Imani in Mentors;
  8. Noor sees no Accepted state;
  9. the R7 refusal.

  Close every context at the end.

**Acceptance Criteria:**
- Given `./e2e/run.sh tests/uj-4-and-the-excluded-employee.spec.ts tests/group-assignment.spec.ts` on a fresh reseed, when it runs, then both specs pass. Paths are relative to the container's `/e2e`.
- Given a full `./e2e/run.sh`, when it runs, then the only failures are the five already failing on the baseline (`home-and-match.spec.ts` ×4, `uj-3-and-course-publishing.spec.ts` ×1).

## Implementation Notes

- The three helpers moved verbatim into `support/helpers.ts`, each with a one-line doc comment. `group-assignment.spec.ts` imports them, trims its unused imports, and changes no assertion.
- The new spec adds a fourth `waitForTimeout(1100)` (after publish, before Sam signs up), on the uj-3 model. Epic 1 retro item 5 now covers four sleeps.
- The direct POST naming Sam sends the same five Learners that step 4 then assigns successfully. If it had created Requests, step 4 would get `MATCHING_REQUEST_ALREADY_OPEN`.
- Verified: the two specs pass on a fresh reseed (UJ-4 in 21 s, group-assignment in 15 s). The full `./e2e/run.sh` gave 48 passed and 5 failed, the same five as the baseline (47 passed, 5 failed).
- Left out as planned: `api/.env.example`, the walkthrough-story-4-1 folder, epic 2's `hidesSecrets` copies.

## Plan Change Log

## Review Triage Log

- Quick review, pass 1: high 0, medium 1, low 3, false 1, maybe-false 0. Every acceptance criterion is met.
  - medium, patch: step 7 checked the in-progress Match on Home only in the `/api/v1/home` body and never on screen, against the Always rule "assert what each person sees in the UI". `Home.tsx` renders a `/matches/{id}` link and a `ProgressBar`, so a broken row would still have passed. Fix: assert the row's link and the `Progress: In progress` image.
  - low, patch: step 8 covered "no history" only through the absence of "Accepted" text, so a history list without that word would pass. Fix: assert `main` holds no list after the reload. This is a one-line direct assertion.
  - low, rejected (its fix edits this plan): the Implementation Note names the wrong error code. `AssignGroup` L89–97 maps every Learner refusal, including an open Request, to `MATCHING_LEARNER_NOT_ASSIGNABLE`. The test is still sound, because step 4 asserts 201.
  - false: "six contexts leak when a step fails". After any failing test, Playwright tears down the worker process and its browser, so nothing it opened reaches a later test. `workers: 1` doesn't change that.
  - low, rejected: `idOf` throws a TypeError rather than an assertion message if a name is missing. `/admin/employees` returns one unpaginated array, so this is unlikely to occur, and the fix adds a guard.

## Design Notes

The chosen Employee in the R7 step is Imani again, and the fresh Learner is Sam. Sam refused as a Mentor is still a valid Learner, so only the matched Learner is marked. That one Assign shows that refusal is per Learner and all or nothing, with no extra sign-up. "Nothing created" is checked through what people see: Imani's Requests stay empty, and Sam's notices hold only the Registration refusal.

## Verification

**Commands:**
- `./e2e/run.sh tests/uj-4-and-the-excluded-employee.spec.ts tests/group-assignment.spec.ts`: expected 2 passed. The e2e package has no type check; Playwright transpiles only.
- `./e2e/run.sh`: expected no failures beyond the five on the baseline.
