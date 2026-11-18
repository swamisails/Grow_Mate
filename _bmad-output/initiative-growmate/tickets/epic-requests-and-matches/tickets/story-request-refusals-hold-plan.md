---
title: 'Request refusals hold'
type: feature
ticket: '3'
created: '2026-11-16'
status: built
baseline_revision: '89479c07947d8d6b0769216b7d5c1fe9acc8fa70'
route: full
route_source: auto
risk: medium
review: quick
review_source: pinned
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Learner can send another Request after a live Match, after Course Completed, or while they are already a Mentor of that Course. The Course page still offers Request in those cases.

**Approach:** One eligibility check inside the send transaction refuses each case with its own Matching code. The Request buttons stay hidden unless that check says the viewer may ask. A Cancelled Request still does not block. Course Completed is seeded for an API test; the click that ends a Match waits for a later entry.

## Boundaries & Constraints

**Always:**
- `LearnerEligibility` is the only R7 check. `SendRequest` calls it inside the transaction, after the learner and course row locks.
- Check order: an unexpired open Request, then a live Match, then Course Completed, then the Learner is a Mentor of the Course. The first hit is the only refusal.
- Codes and messages: `MATCHING_REQUEST_ALREADY_OPEN` "You already have an open request for this course."; `MATCHING_MATCH_LIVE` "You already have a match for this course."; `MATCHING_COURSE_ALREADY_COMPLETED` "Course Completed was already clicked for you on this course."; `MATCHING_ALREADY_MENTOR` "You are already a mentor for this course."
- A live Match is a Match with no end. Course Completed is a Match whose end reason is `course_completed`. A Cancelled Request, and an ended Match that is not Course Completed, do not block.
- The Course page shows Request only when `can_request` is true. A 409 shows the API message under that Mentor's row.
- Two sends for one Learner and Course store one Request. No unique column stands in for the lock.

**Never:** The Course Completed or Quit buttons, the Match screen, group assignment, `GrantMentor`, or the admin codes `MATCHING_LEARNER_NOT_ASSIGNABLE` and `MATCHING_MENTOR_NOT_ELIGIBLE`. Do not store a status column. A Mentor `route` and `group_assignment_id` stay hidden.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pending Request | Open Request, not yet 144h | No Request button. Nothing new stored | 409 `MATCHING_REQUEST_ALREADY_OPEN` |
| Live Match | Accepted Request, Match has no end | No Request button. Bar stays "In progress" | 409 `MATCHING_MATCH_LIVE` |
| Course Completed | Seeded Match ended with `course_completed` | API says the Learner may not request | 409 `MATCHING_COURSE_ALREADY_COMPLETED` |
| Already a Mentor | Learner has a Mentor grant for the Course | No Request button | 409 `MATCHING_ALREADY_MENTOR` |
| Cancelled Request | Unaccepted, now at sent + 144h | Request button returns. A new Request is stored | No error expected |
| Two sends | Two sends for one Learner and Course | One Request row | The second is 409 `MATCHING_REQUEST_ALREADY_OPEN` |
| Not a listed Mentor | `mentor_id` is not a Mentor of the published Course | Nothing stored | 422 on `mentor_id` |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Matching/Queries/LearnerEligibility.php` — L18–31 allows a send unless an unexpired open Request exists, and locks those rows. Add the live Match, Course Completed, and already-a-Mentor cases here. `SendRequest.php` L36–51 already locks the learner and course, returns 422 for an unlisted Mentor, then calls `allows(..., lock: true)`. Keep that. Do not add a second check.
- `api/app/Modules/Matching/ErrorCode.php`, `Exceptions/MatchingRuleViolation.php` — add the three codes. The 409 body stays `{message, code}`.
- `api/app/Modules/Matching/Models/MentorMatch.php` and a new migration — `matches` has only `id`, `request_id`, `started_at`. Add nullable `ended_at` and `end_reason` (`quit` or `course_completed`). `AcceptRequest` still writes only `started_at`. A factory state seeds Course Completed. No action ends a Match here.
- `api/app/Modules/Mentors/Queries/IsCourseMentor.php` — reuse it for the Learner. `CourseMentors.tsx` already hides Request unless `can_request` is true and shows a 409 under the row. No reason field and no `copy.ts` sentences.
- `AcceptRequestTest` and `e2e/tests/request-and-accept.spec.ts` expect the button back after Accept. Those become the live-Match refusal. Leave `RequestTimeTest`'s day-6 `can_request: true` alone.
- Do not change `GrantMentor`, group assignment, Quit, or the Course Completed screen.

## Tasks & Acceptance

**Execution:**
- [x] `LearnerEligibility.php`, `ErrorCode.php`, `MatchingRuleViolation.php`, `SendRequest.php` — one locked check and the four codes. A Cancelled Request still allows a send.
- [x] New migration, `MentorMatch.php`, `MentorMatchFactory.php` — nullable end time and end reason. Accept does not set them. A factory state seeds `course_completed`.
- [x] `SendRequestTest.php`, `AcceptRequestTest.php` — one test per matrix row. Course Completed is API-only. Guest stays 401 and Admin stays 403. The second send stores one row.
- [x] `e2e/tests/request-and-accept.spec.ts` — after Accept the Request buttons are gone. A Learner who is a Mentor of the Course has no Request button.

**Acceptance Criteria:**
- Given the commands in Verification, when they run, then they pass.
- Given a Mentor `route` or a group id, when a refusal is read, then neither appears.

## Implementation Notes

`LearnerEligibility::refusal` is the one check, inside the send transaction after the learner and course locks. `allows` is that result being null, which the Course page reads as `can_request`. Accept still writes only `started_at`.

The clock spec used to Accept its leftover Request so a later spec could Request again. A live Match now blocks that, so e2e deletes the Request and its Match through `DELETE /api/v1/testing/requests/{id}`, registered only when `APP_ENV` is e2e. A Match ended with `quit` still allows a new Request. Nothing in this entry ends a Match through the product.

## Plan Change Log

## Review Triage Log

- Quick review. high 0, medium 0, low 0, false 0, maybe-false 0. The reviewer reported no findings.

## Design Notes

A live Match is `ended_at` null. Course Completed is `end_reason = course_completed`. Any other ended Match does not block. The check locks the Learner's open Request rows, as it does today, inside the send transaction after the learner and course locks. SQLite tests prove the second send by calling send twice; they do not add a unique column.

## Verification

**Commands:**
- `cd api && php artisan test --compact && vendor/bin/pint --dirty --format agent` — green, including the new refusal tests.
- `cd web && npm run lint && npm test && npm run build` — clean.
- `./e2e/run.sh` — pass, including the updated request-and-accept spec.
