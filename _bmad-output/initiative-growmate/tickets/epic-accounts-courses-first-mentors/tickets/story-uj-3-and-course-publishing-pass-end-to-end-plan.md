---
title: 'UJ-3 and Course publishing pass end to end'
type: 'chore'
ticket: '10'
created: '2026-11-16'
status: 'built'
baseline_revision: '7efed6446b823d50b351b7e267ba4d5679e313f5'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Each epic-1 story has its own e2e spec, but nothing walks the epic's outcome as one journey. That journey is Admin publishing a Course and an Employee becoming its Mentor through registration (Flow 4 steps 1–3, then Flow 3 / UJ-3).

**Approach:** Epic 1, entry 10; covers R10. Add one closing Playwright spec, run on the seeded e2e stack. It drives the journey through the UI the way a person would. API calls are used only where they set up data or prove a refusal.

## Boundaries & Constraints

**Always:**
- **One spec, `e2e/tests/uj-3-and-course-publishing.spec.ts`, as a single serial journey:**
  1. **Noor (Admin) publishes a Course through the editor (Flow 4 steps 1–3):**
     - New Course, then a title and description, then Save.
     - Fill Bronze, Silver and Gold, each with its questions, options, the correct option and a Pass mark. Publish stays disabled until all three Stages are complete.
     - Click Publish and confirm "Published courses can't be edited."
     - The editor turns read-only with a "Published" tag, and Admin Courses shows it as Published.
  2. **Two more uniquely titled Courses** are published through the API helper (`publishCourse`), so Sam has three to name.
  3. **Sam signs up (Flow 3):** at step 2 he ticks all three Courses, then clicks Submit and lands on Home.
     - Before signing up, the spec waits until the Courses were published strictly before the account (second precision).
  4. **Noor decides on Registration decisions:** she approves two of Sam's rows and refuses one, confirming "This decision is final." for each. Each row then shows its tag.
  5. **Sam signs in again:**
     - Notices lists exactly three notices, newest first: the sentence for each decision, in reverse order of the decisions.
     - Home's Mentor check card lists the two approved Courses under Approved and the refused one under Refused.
  6. **A demo Employee** (seeded Priya Nair, with the demo password) opens each Course page:
     - The two approved Courses list Sam under Mentors.
     - The refused one doesn't, and shows "No mentors for this course yet."
- **Isolation:** every Course and Employee in the spec carries a unique run suffix. The demo Courses (Python Basics, Git Essentials) are never named or decided, so other specs' exact Mentor lists stay as seeded.
- **Shared helpers:** the spec uses `e2e/tests/support/helpers.ts`.
  - The editor helpers it needs from `course-drafts.spec.ts` (`createCourse`, the Stage and question locators, `fillStage`, `save`) move into a shared support module, and `course-drafts.spec.ts` imports them.
  - The row-based `decide` from `registration-decisions.spec.ts` moves there too, and both specs use it.
  - Moved helpers keep their exact steps.
- **The full suite passes** with `./e2e/run.sh`.

**Never:** app code changes (API or web), a new assertion that loosens an existing one, the e2e test clock (AD-6, epic 2), or touching the dirty `api/.env.example` or the untracked walkthrough folder.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Incomplete Course | Bronze and Silver filled, Gold empty | Publish disabled | — |
| Publish | All three Stages filled, Publish, then confirm | Read-only, "Published" tag; visible on Employee Courses | — |
| Mentor check | Sam ticks 3, then Submit | Home; the step never shows again | — |
| Decisions | Approve, Approve, Refuse, each confirmed | Tags Approved, Approved, Refused | — |
| Notices | Sam opens Notices | 3 sentences, newest first | — |
| Home lists | Sam opens Home | Approved: 2, Refused: 1 | — |
| Mentor lists | Demo Employee opens each Course | Sam on the 2 approved; empty state on the refused one | — |

</frozen-after-approval>

## Code Map

- `e2e/tests/support/helpers.ts` -- `admin`, `employeePassword`, `newEmployee`, `signUp`, `signIn` (`goto`, `url` options), `signOut`, `adminSignIn`, `apiRequest`, `newPage`, `publishCourse` (returns the id) and `decisionsRead`. Reuse these; don't copy them.
- `e2e/tests/course-drafts.spec.ts` L1–81 -- `createCourse`, `stage`, `question`, `fillStage`, `expectStage`, `save`, plus the `StageSpec`/`QuestionSpec` types. Move what the journey needs into `e2e/tests/support/courseEditor.ts` (it isn't a `*.spec.ts`, so it isn't collected) and import it back.
- `e2e/tests/course-publishing.spec.ts` -- the Publish flow, the keyboard-confirmation dialog and the read-only and "Published" checks to mirror.
- `e2e/tests/registration-decisions.spec.ts` L8–17 -- the row-based `decide(admin, row, action, tag)`, which checks the dialog text, the Cancel and action buttons, and the tag. `registration-decision-notices.spec.ts` L9 has a name and title variant that can call the shared one.
- `e2e/tests/registration-decision-notices.spec.ts` -- the Notices and Home card assertions, and `utcDate` from `occurred_at`. `mentor-check.spec.ts` -- the step-2 checkbox group "Courses you can mentor".
- `e2e/tests/course-mentors.spec.ts` -- demo Employee `priya.nair@example.com` / `demo-password`, `openCourse`, and the Mentors region "Mentors". It asserts Git Essentials is empty and Python Basics' exact list, so the journey must not touch either.
- `e2e/playwright.config.ts` -- `workers: 1`, not fully parallel. One `run.sh` reseeds once for all specs.
- **Running the stack:** Docker is up. From the repo root, run `set -a && . /tmp/claude-1000/-home-swami-Practice-GROW-MATE/bc99668a-b40f-4319-a331-7c0dc5c3d0c3/scratchpad/e2e.env && set +a && ./e2e/run.sh --reporter=line` (append a spec path to run one spec). That env file was rebuilt from the e2e containers; never copy it into the repo.

## Tasks & Acceptance

**Execution:**
- [x] `e2e/tests/support/courseEditor.ts`, `e2e/tests/course-drafts.spec.ts` -- move the editor helpers.
- [x] `e2e/tests/support/helpers.ts` (or `support/decisions.ts`), `e2e/tests/registration-decisions.spec.ts`, `e2e/tests/registration-decision-notices.spec.ts` -- share `decide`.
- [x] `e2e/tests/uj-3-and-course-publishing.spec.ts` -- the journey, covering every matrix row.

**Acceptance Criteria:**
- Given the seeded e2e stack, when `./e2e/run.sh` runs, then every spec passes, the new journey included, and the other specs pass as they did on the baseline (40).

## Implementation Notes

## Plan Change Log

## Review Triage Log

Loop 1 (quick lens). Verdicts: 0 high, 1 medium, 1 low, 0 false.

| # | Location | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | `e2e/tests/uj-3-and-course-publishing.spec.ts` | The journey is close to Playwright's default 30 s test timeout | medium | Measured 27.6 s, 27.1 s and 24.1 s with `--repeat-each=3`, and `playwright.config.ts` sets no `timeout`. A slower host fails it. Fix: mark this test slow | patch |
| 2 | `e2e/tests/support/helpers.ts` `decide` | The parameter `admin` shadows the exported `admin` credentials constant in the same file | low | Confirmed. It came in with the move into `helpers.ts`. Fix: rename the parameter | patch |

## Design Notes

- **Courses published before signup.** A Course can be named only if it was published strictly before the account was created, to the second (entry 6). Wait about 1.1 s after the last publish before Sam signs up, as `registration-decisions.spec.ts` does.
- **Why two Courses come through the API.** The journey is about publishing one Course through the editor and one Employee's registration. Authoring three Courses by hand would only repeat step 1.

## Verification

**Commands:**
- `./e2e/run.sh --reporter=line` (with the env file, as above) -- expected: 41 or more passed, 0 failed.
- A strict TypeScript check over `e2e/tests/**/*.ts` (`--strict --noUnusedLocals`, as the 1.9 sweep ran it) -- expected: no errors.
