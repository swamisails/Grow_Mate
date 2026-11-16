---
title: 'Un-Accepted Requests are reminded on day 3 and Cancelled on day 6'
type: feature
ticket: '2'
created: '2026-11-15'
status: built
baseline_revision: 'bde8131b08c676b26af51c8c6afe869c6c7e6270'
route: full
route_source: auto
risk: high
review: quick
review_source: pinned
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** An unanswered Request never reminds anyone and never ends. Accept still works months later, and the Learner keeps a "Not yet started" bar.

**Approach:** Day 3 and day 6 are exactly 72 and 144 hours after `sent_at`, in UTC, derived on read. At 72 hours both parties get one reminder. At 144 hours the Request is Cancelled, both parties are told, the bar is gone, and Accept is refused. A test clock in `e2e` only moves time without waiting.

## Boundaries & Constraints

**Always:**
- Request state is derived from `sent_at`, `accepted_at`, and `now()`. It is never a column. Day-3 and day-6 notices are never stored.
- Before 72 hours the state is pending. From 72 hours until 144 hours it is reminded. At 144 hours, if still unaccepted, it is cancelled. An `accepted_at` is accepted, and it wins over a cancelled row for the same Learner and Course.
- A pending or reminded Request stays on Requests, and the bar stays grey "Not yet started". Course and Requests look the same on day 3 as on day 0.
- A cancelled Request leaves Requests, the bar is gone, and Accept is 404 with no Match. The Learner can request that Course again.
- A day-3 notice, once the reminder instant has been reached while the Request was still open, stays dated `sent_at` + 72 hours even after a later Accept or Cancel. A day-6 notice exists only for a cancelled Request and is dated `sent_at` + 144 hours.
- Notices use the four sentences below. Admin receives none. No response includes a Mentor `route` or `group_assignment_id`.
- The clock route and middleware exist only when `APP_ENV` is `e2e`. API tests move time with `$this->travel()`.

**Never:** Scheduled jobs, stored time notices, a day-3 change to the Course page or Requests, Quit, Course Completed, Home, the Match screen, group Cancel, Registration-decision notices, or the Mentor-check card. Do not call `GrantMentor`.

Sentences, from `copy.ts` only:
- Mentor, day 3: "Reminder: [Learner] requested you to guide them with [Course]."
- Learner, day 3: "Your request to [Mentor] for [Course] is still waiting."
- Learner, day 6: "Your request to [Mentor] for [Course] was cancelled. You can request a mentor again."
- Mentor, day 6: "[Learner]'s request for [Course] was cancelled."

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Before day 3 | Open Request, now = sent + 71h59m | No day-3 notice. Bar is "Not yet started". Request is listed. Accept works | No error expected |
| Day 3 | Same Request, now = sent + 72h | Both parties have the day-3 sentence, dated sent + 72h. Bar and Requests are unchanged. Accept works | No error expected |
| Just before day 6 | Same Request, now = sent + 143h59m | Still reminded. Accept works. No day-6 notice | No error expected |
| Day 6 | Same Request, now = sent + 144h | Day-6 sentence for both, dated sent + 144h. Day-3 sentence still there. Request is gone. Bar is gone. No Match | Accept is 404 |
| Accepted early | Accepted at sent + 1h, read at sent + 144h and at sent + 60d | Match still live. Bar is "In progress". No day-3 or day-6 notice | No error expected |
| Accepted after the reminder | Accepted at sent + 80h, read at sent + 144h | Day-3 notice stays. No day-6 notice. Match still live | No error expected |
| Admin | Admin reads notices, or is the subject of one | No notice, and no Notices link | 403 on the notices route |
| Clock off | `APP_ENV` is `local`, `production`, or `testing` | No clock route | POST is 404 |
| Clock on | `APP_ENV` is `e2e`; POST a frozen instant | The next request uses that instant | No error expected |

</frozen-after-approval>

## Code Map

Story 1.8 is on this branch. Its Notices page is the inbox. This story adds derived rows to it. Leave the uncommitted story 2.1 follow-ups in the worktree as they are.

- `api/app/Modules/Matching/Queries/RequestState.php` — today returns `open` or `accepted` from `accepted_at` only (L14–35) and does not read `sent_at`. Return `pending`, `reminded`, `cancelled`, or `accepted` from `sent_at`, `accepted_at`, and `now()`. Unexpired open still wins over accepted. No status column.
- `api/app/Modules/Matching/Queries/LearnerEligibility.php` — L19–29 treats every `accepted_at` null row as open, so a cancelled row would block a new Request. A row at or after `sent_at` + 144h is not open. Keep the existing lock.
- `api/app/Modules/Progress/Queries/ProgressStatus.php` — L20–24 maps `open` to `not_yet_started`. Map `pending` and `reminded` to `not_yet_started`, `accepted` to `in_progress`, and `cancelled` or none to null.
- `api/app/Modules/Matching/Actions/AcceptRequest.php` — L24–31 already 404s a grouped or accepted row and writes nothing. Also 404 when now is at or after `sent_at` + 144h.
- `api/app/Modules/Matching/Queries/IncomingRequests.php` — L25–28 lists ungrouped rows with `accepted_at` null. Drop rows at or after `sent_at` + 144h. Day 3 does not change this list or the Course page.
- `api/app/Modules/Notifications/Queries/Inbox.php` — L19–35 reads stored rows only. Merge Matching's derived rows and sort by `occurred_at` desc, then `id` desc. Do not write them.
- `api/app/Modules/Notifications/NoticeType.php` — add `request_reminder_day3` and `request_cancelled_day6`. Fields are `party` (`learner` or `mentor`), `person_name`, and `course_title`. `SendNotice` must refuse these two types so they cannot be stored.
- `web/src/features/notifications/Notices.tsx` `sentence` (L11–16), `web/src/api/types/notifications.ts`, and `web/src/app/copy.ts` — the SPA picks one of the four sentences from `type` and `party`. Names and the Course title are text.
- `api/bootstrap/app.php` and `api/routes/api.php` — `ApplyTestClock` and `POST /api/v1/testing/clock` only when `APP_ENV` is `e2e`, outside the employee group. The route stores one UTC instant. The middleware applies it with `Carbon::setTestNow` on the next request. `local`, `production`, and `testing` register neither. PHPUnit stays on `$this->travel()`.
- `e2e/helpers/clock.ts` and `e2e/tests/request-clock.spec.ts` — one `setClock` helper epic 3 can import. Copy the style of `e2e/tests/request-and-accept.spec.ts`.
- Do not change `GrantMentor`, `DecideRegistration`, `SendNotice`'s registration path, `MentorCheckCard`, `CourseMentors` Request rules, or the hiding of `route` and `group_assignment_id`.

## Tasks & Acceptance

**Execution:**
- [x] `RequestState.php`, `LearnerEligibility.php`, `ProgressStatus.php`, `IncomingRequests.php`, `AcceptRequest.php` — four states at 72h and 144h. Cancel drops the bar and the Requests row, Accept of it is 404 and stores nothing, and the Learner can request that Course again.
- [x] `ApplyTestClock`, `routes/api.php`, `bootstrap/app.php` — e2e-only clock. A frozen instant is still in force on the next request. Other environments have no route and no middleware.
- [x] `TimeNoticeSource` in Notifications, implemented in Matching from `RequestState` — day-3 and day-6 rows are computed, never inserted. Ids are `"<type>:<request_id>"`. Dates are the rule instants, not `now()`. `Inbox` merges them with stored notices.
- [x] `Notices.tsx`, `notifications.ts` types, `copy.ts` — the four sentences. Wording only from `copy.ts`.
- [x] `api/tests/Feature/Matching/` — one test per matrix row except clock-on. Guest is 401 and Admin is 403 on notices. `$this->travel()` only. Clock route is 404 under `testing`.
- [x] `e2e/helpers/clock.ts` and `e2e/tests/request-clock.spec.ts` — Priya requests Rafi; the clock walks 71h59m, 72h, and 144h; notices, the bar, and Requests follow the matrix; an Accept at 1h is still a Match at 144h.

**Acceptance Criteria:**
- Given the commands in Verification, when they run, then they pass.
- Given a Mentor `route` or a group id, when a notice or a clock response is read, then neither appears.

## Implementation Notes

## Plan Change Log

## Review Triage Log

- Quick review. high 0, medium 0, low 0, false 0, maybe-false 0. The reviewer reported no findings.

## Design Notes

State for one Learner and Course, first match wins: an unexpired row with `accepted_at` null (pending before 72h, reminded from 72h); else an accepted row; else a cancelled row; else nothing. A reminder was reached when `accepted_at` is null and now is at least `sent_at` + 72h, or when `accepted_at` is at least that instant. Cancel is only an unaccepted row at or after `sent_at` + 144h.

Each party gets their own derived row. `party` says which sentence to use, `person_name` is the other person, and `course_title` is the Course. The inbox already shows `occurred_at` as a UTC calendar date.

## Verification

**Commands:**
- `cd api && php artisan test --compact && vendor/bin/pint --dirty --format agent` — green, including the new clock and state tests.
- `cd web && npm run lint && npm test && npm run build` — clean.
- `./e2e/run.sh` — pass, including `request-clock.spec.ts`.
