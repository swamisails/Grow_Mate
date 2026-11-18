---
title: 'Group assignment refusals'
type: 'feature'
ticket: '3'
created: '2026-11-18'
status: 'built'
baseline_revision: '8e7c08dc087d9a79bbb2630d5a481edf825025ae'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-growmate/ux-growmate/mockups/epic4-group-assignment.html']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Group assignment accepts anyone today. Admin can choose an Employee who was refused that Course at registration, can tick the chosen Employee as a Learner, and can assign a Learner whom R7 would refuse.

**Approach:**
- A refused Employee isn't offered as the chosen Employee, and the API refuses one sent directly.
- The API refuses a chosen Employee ticked as a Learner.
- If any Learner fails the shared eligibility check, nothing is created. Each failing Learner is marked with one generic message that reveals no reason (AD-12).

## Boundaries & Constraints

**Always:**
- A refused chosen Employee gets a 409 with code `MATCHING_MENTOR_NOT_ELIGIBLE`, message "This employee can't be chosen for this course.", and `errors.mentor_id`.
- The form gets a new admin read, `GET /api/v1/admin/courses/{course}/refused-employees` (Mentors), which returns `{data: [{id}]}`. Once a Course is picked, the Chosen Employee select drops those Employees and clears a selection that became refused.
- A chosen Employee in `learner_ids` gets a 422 on `learner_ids` with "The chosen employee can't also be a learner."
- `AssignGroup` calls `LearnerEligibility::refusal(learner, course, lock: true)` for every Learner, inside its transaction, after its existing locks. If any Learner fails:
  - 409 with code `MATCHING_LEARNER_NOT_ASSIGNABLE`;
  - message "Nothing was assigned. Some learners can't be assigned to this course.";
  - `errors["learner_ids.<i>"] = ["This learner can't be assigned to this course."]` for each failing index `i` of the submitted list, and no other keys.
  Every R7 reason (open Request, live Match, Course Completed, already Mentor) gives exactly this response.
- The form shows that 409's message as the summary line at the top of the card (`role="status"`). Each failing Learner gets the per-Learner message under its checkbox, linked with `aria-describedby`. A `MATCHING_MENTOR_NOT_ELIGIBLE` 409 shows under the Chosen Employee select and re-reads the refused list.
- Any refusal creates nothing: no assignment, no Request, no notice. The check order is shape (422), Employees (422), draft (409), chosen Employee (409), then Learners (409).

**Never:**
- A reason, an R7 code, Request or Match state, or the refused list's reasons in any Admin response.
- Changing `SendRequest` or `LearnerEligibility`.
- An e2e journey for Sam (story 4.5 owns it).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Refused chosen | Sam was refused SQL Fundamentals; Admin chooses Sam | Nothing is created | 409 `MATCHING_MENTOR_NOT_ELIGIBLE`, `errors.mentor_id` |
| Refused read | Admin reads the refused list for SQL Fundamentals | `[{id: Sam}]`; an approved Employee isn't listed | Employee → 403 |
| Self | `mentor_id` is also in `learner_ids` | Nothing is created | 422 on `learner_ids` |
| Live Match | Learner 2 of 3 has a live Match on the Course | Nothing is created; only `learner_ids.1` is marked; the body names no reason | 409 `MATCHING_LEARNER_NOT_ASSIGNABLE` |
| Each R7 reason | An open Request, Course Completed, or already a Mentor | The same body as Live Match | 409 |
| Own first | A Learner sends their own Request, then Admin assigns them | One Request | 409 `MATCHING_LEARNER_NOT_ASSIGNABLE` |
| Assign first | Admin assigns, then the Learner sends their own Request | One Request | 409 `MATCHING_REQUEST_ALREADY_OPEN` |
| No learners | `learner_ids: []` | Nothing is created | 422 (unchanged) |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Matching/Actions/AssignGroup.php`:
  - L46–60: the Employee 422s.
  - L63–73: locks Learners, then the Course, then the draft 409.
  - Insert the chosen-Employee check and then the Learner checks after L73, before L75 (`$sentAt`).
- `api/app/Modules/Matching/Http/Requests/AssignGroupRequest.php`: add the self check, either `learner_ids.*` → `different:mentor_id` or an `after()` hook, so the 422 lands on `learner_ids` (the form folds `learner_ids.N` into it).
- `api/app/Modules/Matching/Exceptions/MatchingRuleViolation.php`:
  - Today it renders `{message, code}` with 409 and maps code to message in its constructor.
  - Add an optional `array<string, list<string>> $errors` that `render()` includes when it isn't empty, and match arms for the two new codes.
  - `ErrorCode.php` gets `MentorNotEligible` and `LearnerNotAssignable`.
- `api/app/Modules/Matching/Queries/LearnerEligibility.php`: `refusal(int, int, bool $lock): ?ErrorCode`. Call it as it is; don't change it.
- Mentors:
  - `Models/RegistrationDecision` (`user_id`, `course_id`, `outcome`: `Outcome::Refused`).
  - Add `Queries/RefusedForCourse::handle(int $courseId): list<int>`. Matching calls it (allowed: Matching → Mentors). It also feeds the new controller and resource.
  - Pattern: `RegistrationDecisions` and `ApproveRegistrationController`. Route: the admin group in `api/routes/api.php`, with `->where('course', '[0-9]{1,18}')`.
- `web/src/features/matching/GroupAssignment.tsx`:
  - `handleSubmit` around L137 and the `useConflict` / `ConflictMessage` usage.
  - `formErrors` (L23) folds `learner_ids.N`. Per-Learner marks need the index mapped back to `chosen[i]`'s id.
  - The `learners` / `employees` options are around L120.
  - `ApiError` (`web/src/api/client.ts`) carries `code` and `errors`.
- `web/src/api/mentors.ts` and `types/mentors.ts` — add `listRefusedEmployees(courseId)`.
- Tests: `api/tests/Feature/Matching/GroupAssignmentTest.php` (helpers `assign()`, `assertNothingCreated()`), `MatchingTestCase` (`grant`, `employee`, `publishedCourse`), `Mentors/RegistrationDecisionsTest` (how a refusal is stored), `web/src/features/matching/GroupAssignment.test.tsx`.

## Tasks & Acceptance

**Execution:**
- [x] API:
  - `ErrorCode` and `MatchingRuleViolation`: two codes and the `errors` support.
  - `AssignGroupRequest`: the self check.
  - `AssignGroup`: the chosen-Employee check (via `RefusedForCourse`), then every Learner's eligibility, collecting the failing indexes before throwing.
- [x] `Mentors/Queries/RefusedForCourse`, plus `RefusedEmployeesController`, a resource and the admin route.
- [x] `GroupAssignmentTest` and a new `Mentors/RefusedEmployeesTest`: one test per matrix row, each asserting nothing was created and that the body has exactly `message`, `code` and `errors`.
- [x] Web:
  - The API call and type for the refused list.
  - `GroupAssignment.tsx`: read the refused list when the Course changes, filter and clear the Chosen Employee, show the summary line and per-Learner marks, and the chosen-Employee 409.
  - `copy.ts`: none of these strings are needed there, since the API's messages are shown as they are.
- [x] `GroupAssignment.test.tsx`: refused Employee not offered, the per-Learner 409 marks with the summary, and the chosen-Employee 409.

**Acceptance Criteria:**
- Given any refused Assign, when the database is read, then there is no new assignment, Request or notice.
- Given the commands in Verification, when they run, then they pass, apart from the known rate-limit test and the 5 known e2e failures.

## Implementation Notes

- Branch `story/4-3-group-refusals` is cut from `story/4-2-group-accept` (`8e7c08d`).

## Plan Change Log

## Review Triage Log

- Quick review, pass 1: high 0, medium 3, low 1, false 0, maybe-false 0. There are no unmet acceptance criteria.
  - medium, patch: the summary `role="status"` paragraph is hidden by `.group-assignment__summary:empty { display: none }`, so it joins the accessibility tree with its text already in place and screen readers may not announce it. `ConflictMessage` (forms.ts L87) keeps its region rendered for exactly this reason. Fix: collapse its spacing instead of hiding it.
  - low, patch: after a `MATCHING_MENTOR_NOT_ELIGIBLE` 409, `errors.mentor_id` is reset only on submit, so the message and `aria-invalid` stay under the select after a different Employee or Course is picked. Fix: drop `mentor_id` from the errors on either change.
  - medium, defer: story 4.1's created card has the same hidden live region (`.group-assignment > [role='status']:empty { display: none }`, styles.css around L760). It predates this change.
  - medium, defer: the uncommitted `api/.env.example` edit, as under 4.1 and 4.2 (epic 1 retro item 8).

## Design Notes

The 409 for Learners uses the submitted list's indexes (`learner_ids.<i>`), as Laravel's own array validation does. The form can map them back with the list it sent, and the API never echoes a user id with a refusal. The Employee checks run before the eligibility checks, so a bad id never reaches `LearnerEligibility`.

## Verification

**Commands:**
- `cd api && php artisan test --compact && vendor/bin/pint --dirty --format agent`: green apart from the known rate-limit test.
- `cd web && npm run lint && npm test && npm run build`: clean.
- `./e2e/run.sh`: no new failures; `group-assignment.spec.ts` passes.
