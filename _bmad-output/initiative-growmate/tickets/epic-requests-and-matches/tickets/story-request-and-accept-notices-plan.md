---
title: 'Request and Accept notices'
type: feature
ticket: '4'
created: '2026-11-17'
status: built
baseline_revision: '4221a4f018e460341270cb0213c3f5d9b3cbb0df'
route: full
route_source: auto
risk: low
review: quick
review_source: pinned
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Mentor is not told when a Learner requests them, and a Learner is not told when that Mentor Accepts. Admin must not receive either notice.

**Approach:** Each successful action stores one notice through the existing notice pipeline, and only after that action commits. The Mentor reads "{Learner} requested you to guide them with {Course}". The Learner reads "{Mentor} is your mentor for {Course}." A refused send or Accept stores nothing.

## Boundaries & Constraints

**Always:**
- `SendRequest` stores one notice for the Mentor after the Request commits. `AcceptRequest` stores one notice for the Learner after the Match commits. A rolled-back action stores nothing.
- The Mentor sentence is the Requests-row sentence, with the Learner's account name and the Course title. The Learner sentence is "{Mentor} is your mentor for {Course}." with the Mentor's account name, the Course title, and the period.
- A notice carries that name and that title and nothing else. Admin is never a recipient. One successful send stores one notice; one successful Accept stores one more.
- The Learner's notice for Priya and Rafi on Python Basics reads "Rafi Haddad is your mentor for Python Basics."

**Never:** Storing the day-3 or day-6 notices, the Quit note, the Bronze notice, the Match screen, or group assignment. Do not change the Requests row, eligibility, or the clock. Do not reveal a Mentor `route` or `group_assignment_id`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Send | Priya requests Rafi for Python Basics | Rafi has one notice: "Priya Nair requested you to guide them with Python Basics". Priya does not | No error expected |
| Accept | Rafi Accepts that Request | Priya has "Rafi Haddad is your mentor for Python Basics." Rafi does not gain that notice | No error expected |
| Refused send | A second open Request, or a mentor who is not listed | The notice count does not grow | 409 or 422, and nothing new is stored |
| Refused Accept | Cancelled, stranger, already accepted, or grouped | No Accept notice and no Match | 404 |
| Admin | The same send and Accept | No notice is stored for Admin | Admin still cannot open Notices |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Notifications/Actions/SendNotice.php` — L28–48 is the only writer. Call it inside the caller's transaction: L48 stores on commit, and a throw before that stores nothing. L30–32 still refuses `request_reminder_day3` and `request_cancelled_day6`.
- `api/app/Modules/Notifications/NoticeType.php` — L11–32. Add `request_sent` and `request_accepted`, each with fields `person_name` and `course_title` only. `NoticeResource` already spreads those fields. `Inbox` already returns stored rows.
- `api/app/Modules/Matching/Actions/SendRequest.php` — L35–60 creates the Request inside the transaction. After that create, call `SendNotice` for `mentorId`. `AcceptRequest.php` L25–45 creates the Match the same way; call `SendNotice` for the Request's `learner_id`. Names come from `UserNames` (account `name`). Titles come from `CourseTitles`.
- `web/src/app/copy.ts` — L110 is the Requests sentence, with no period. Reuse it for `request_sent`. Add the Accept sentence under `notices`. `Notices.tsx` L11–23 switches on `type`; add the two cases. `web/src/api/types/notifications.ts` lists the closed types.
- Do not change `LearnerEligibility`, `RequestTimeNotices`, the clock, Quit, or Course Completed. `DecideRegistration` is the pattern and stays as it is.

## Tasks & Acceptance

**Execution:**
- [x] `NoticeType.php`, `web/src/api/types/notifications.ts` — the two stored types and their two fields. Day-3 and day-6 stay derived.
- [x] `SendRequest.php`, `AcceptRequest.php` — one `SendNotice` call inside each transaction, after the write. A refusal throws first, so it stores nothing.
- [x] `copy.ts`, `Notices.tsx` — the Mentor notice reuses the Requests sentence. The Learner notice is the new sentence, period included.
- [x] `SendRequestTest.php`, `AcceptRequestTest.php`, `Notices.test.tsx`, `e2e/tests/request-and-accept.spec.ts` — one test per matrix row. A notice body has no `route` and no `group_assignment_id`.

**Acceptance Criteria:**
- Given the commands in Verification, when they run, then they pass.
- Given a Mentor `route` or a group id, when either notice is read, then neither appears.

## Implementation Notes

## Plan Change Log

## Review Triage Log

- Quick review. high 0, medium 0, low 0, false 0, maybe-false 0. The reviewer reported no findings.

## Design Notes

`SendNotice` is called inside the action transaction and writes in `DB::afterCommit`, which is how a notice is sent after the action commits. `person_name` is the account name string, not a user id. This entry stores one Learner's name; it does not build a group Request.

## Verification

**Commands:**
- `cd api && php artisan test --compact && vendor/bin/pint --dirty --format agent` — green, including the new notice tests.
- `cd web && npm run lint && npm test && npm run build` — clean.
- `./e2e/run.sh` — pass, including the request-and-accept notice.
