---
title: 'A Learner requests a Mentor and the Mentor Accepts'
type: 'feature'
ticket: '1'
created: '2026-11-13'
status: 'built'
baseline_revision: '06a0d057d34695d84c59ee1b116bbd688dadf5b6'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 2
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Learner can see Mentors on a Course and cannot ask one to guide them. Nothing records a Request, an Accept, or the bar that follows.

**Approach:** The Learner sends one open Request from the Mentors card. The Mentor Accepts it on Requests. Accept creates a Match. The Course page bar is grey "Not yet started" while open, and half blue "In progress" after Accept. A second Learner can be Accepted too.

## Boundaries & Constraints

**Always:**
- Store facts only: `sent_at`, `accepted_at`, match start. Request state and Progress status are derived, never columns.
- One open Request per Learner and Course. A second is 409 `MATCHING_REQUEST_ALREADY_OPEN`. The Request button shows only when that check passes, and a 409 shows the API `message` under the row.
- Accept is the only response. It sets `accepted_at` and creates one Match. There is no limit on how many Matches one Mentor has.
- The Requests sentence is "[Name] requested you to guide them with [Course]". The bar words are "Not yet started" and "In progress", with no numbers.
- `group_assignment_id` is stored and never returned. Admin gets 403 on these routes. A Mentor `route` is never shown.

**Never:** Day-3 and day-6, notices, Quit, Course Completed, Home, the Match screen, and the Upskilling list. Do not refuse a live Match, an existing Mentor, or a completed Course; entry 3 owns those. Do not accept a group or call `GrantMentor`. Do not change `PublishedCourses` or how Mentors are granted.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Send | Learner requests a listed Mentor; no open Request on that Course | Request stored; bar is grey "Not yet started"; buttons on that Course hide | No error expected |
| Duplicate | Same Learner and Course, Request still open | Nothing new stored; buttons stay hidden | 409 `MATCHING_REQUEST_ALREADY_OPEN` |
| Accept | The addressed Mentor Accepts | Match exists; bar is half blue "In progress"; that Mentor can Accept another Learner | No error expected |
| Stranger Accept | Another Employee Accepts | No Match | 404 |
| Not a listed Mentor | Mentor id is not a Mentor of that published Course | Nothing stored | 422 |
| No requests | Employee opens Requests | "No requests." | No error expected |

</frozen-after-approval>

## Code Map

- `web/src/features/mentors/CourseMentors.tsx` — names only. Add Request when a Matching read says the viewer may ask. `CourseMentorResource.php` stays `{id, name}`. Never add `can_request` or `route`.
- `web/src/features/courses/CoursePage.tsx` — Mentors card is in `.card-grid`. The bar comes from a Progress read, beside the description. A failed refresh keeps the page and any 409 message.
- `PublishedCourseController.php` and `CourseMentorsController.php` — do not call Matching or Progress. Each controller calls one query in its own module.
- `web/src/app/layout.tsx` — add Requests beside Home and Courses.
- `web/src/features/matching/Requests.tsx` — while one Accept is in flight, every Accept button is disabled. A list response from an earlier Accept is ignored, so an accepted Request cannot come back.
- `GrantMentor.php` — do not call or change. `DatabaseSeeder.php` stays Accounts, Courses, Mentors. Do not seed Requests.
- `api/routes/api.php` — send, list, accept, eligibility, and progress sit in the `can:browse,Course` group.
- `e2e/tests/course-mentors.spec.ts` — expects zero buttons for Rafi on Python Basics. This story adds Request.

## Tasks & Acceptance

**Execution:**
- [ ] `api/database/migrations/2026_11_14_000000_create_matching_tables.php` — `group_assignments` (id only, unused); `requests` (`learner_id`, `mentor_id`, `course_id`, nullable `group_assignment_id`, `sent_at`, nullable `accepted_at`); `matches` (`request_id` unique, `started_at`). No `open_course_id` and no status column. One open Request is the eligibility check inside the send transaction, not a column.
- [ ] `api/app/Modules/Accounts/Queries/LockUser.php`, `api/app/Modules/Courses/Queries/LockCourse.php` — each locks its own row by id. `SendRequest` calls those. It does not use `DB::table` on `users` or `courses`, and it does not import those Models.
- [ ] `api/app/Modules/Matching/Actions/SendRequest.php`, `AcceptRequest.php`, `Queries/LearnerEligibility.php`, `Queries/RequestState.php`, `ErrorCode.php`, `Exceptions/MatchingRuleViolation.php`, `api/database/factories/RequestFactory.php`, `MentorMatchFactory.php` — eligibility is only "open Request already exists", derived from `accepted_at`. Accept writes `accepted_at` and one Match for an ungrouped Request addressed to the caller.
- [ ] `api/app/Modules/Progress/Queries/ProgressStatus.php`, `Http/Controllers/CourseProgressController.php` — read-only: open Request → `not_yet_started`; accepted → `in_progress`; otherwise nothing. `GET /api/v1/courses/{course}/progress` returns that status. No table, and not a field on the published Course.
- [ ] `api/app/Modules/Matching/Http/Controllers/`, `Http/Resources/`, `api/routes/api.php` — `POST /api/v1/courses/{course}/requests` (`mentor_id`); `GET /api/v1/courses/{course}/request-eligibility` (`can_request`); `GET /api/v1/requests`; `POST /api/v1/requests/{request}/accept`. Each controller calls one Matching action or query. Never return `group_assignment_id` or `route`.
- [ ] `api/tests/Feature/Matching/SendRequestTest.php`, `AcceptRequestTest.php` — one test per I/O row. No session is 401. Admin is 403.
- [ ] `web/src/features/mentors/CourseMentors.tsx`, `web/src/features/courses/CoursePage.tsx`, `web/src/features/matching/Requests.tsx`, `routes.ts`, `web/src/app/routes.ts`, `layout.tsx`, `copy.ts`, `web/src/api/types/matching.ts` — button, bar, Requests page, top-bar link. Wording only from `copy.ts`. If the progress or eligibility read fails after a send or a 409, leave the Course page up and keep the 409 message under the row. On Requests, disable every Accept button until that Accept and its list refresh finish, and ignore a list response that started earlier.
- [ ] `e2e/tests/request-and-accept.spec.ts`, `e2e/tests/course-mentors.spec.ts` — Priya requests Rafi, Rafi Accepts, the bar changes, and Rafi Accepts a second Learner. Mentors spec allows the button and still shows no route.

**Acceptance Criteria:**
- Given Priya on Python Basics, when she requests Rafi, then she sees a grey "Not yet started" bar and Rafi sees "Priya Nair requested you to guide them with Python Basics" on Requests.
- Given that Request, when Rafi Accepts, then Priya's bar is half blue "In progress", and Rafi can Accept a second Learner.
- Given a Mentor `route` or a group id, when any of these responses are read, then neither appears.
- Given the commands in Verification, when they run, then they pass.

## Implementation Notes

See the Plan Change Log. Do not repeat the known-bad state.

## Plan Change Log

- Trigger: review loop 1. `open_course_id` stored open state; `SendRequest` queried `users` and `courses`; Mentors and Courses controllers called Matching and Progress; a failed refresh after send replaced the Course page and dropped the 409 message.
- Amended: Code Map and tasks. Uniqueness is the eligibility check under the owner-query locks. `can_request` and progress are their own reads. A failed refresh keeps the page and the message.
- Known-bad state avoided: a second copy of "open", a reverse module call, and a generic error in place of the bar or the 409 message.
- KEEP: 409 `MATCHING_REQUEST_ALREADY_OPEN`; 422 when the person is not a Mentor of that published Course; 404 for a stranger, a grouped Request, or one already accepted; no Match in those cases; a second Learner can be Accepted; no `GrantMentor`; responses never include `route` or `group_assignment_id`; bar words and the Requests sentence stay; after Accept the button returns; guest 401 and Admin 403; `DatabaseSeeder` does not seed Requests; factories for `Request` and `MentorMatch`.

- Trigger: review loop 2. `Requests.tsx` `accept` leaves the other Accept buttons enabled and lets an older `listRequests()` replace the newer list.
- Amended: Code Map and the web task. One Accept at a time, and only the latest list refresh is applied.
- Known-bad state avoided: an accepted Request reappears, and Accepting it again shows "Something went wrong. Try again." after the Match already exists.
- KEEP: everything in the loop 1 entry, plus owner-query locks, no `open_course_id`, eligibility and progress as their own reads, and a failed Course-page refresh keeping the page and the 409 message.

## Review Triage Log

- medium — `open_course_id` is a stored copy of open state. Accept writes it null in the same save as `accepted_at`, so the 409-versus-button drift does not happen on this path. The column still breaks the rule that request state is derived. bad_plan. The tasks listed the columns and left MySQL uniqueness unspecified.
- medium — `SendRequest` uses `DB::table` on `users` and `courses`. `CourseMentorsController` calls `LearnerEligibility` and `PublishedCourseController` calls `ProgressStatus`. AD-3 says other modules read through owner queries, a controller calls one query, and Courses does not depend on Progress or Mentors on Matching. bad_plan. The tasks told those controllers to attach the other modules' fields.
- medium — `CoursePage` `onRequested` sets the page to error when the course read fails, which unmounts the Mentors card. `reload` failure in `requestMentor` also drops `ConflictMessage`. A stored Request or a 409 then shows the generic error instead of the bar or the API message. bad_plan. The tasks said to refresh and did not say a failed refresh must keep the page.
- low — `Request` and `MentorMatch` have no factories. `api/AGENTS.md` says a new model gets one, and the other models have one. patch. Moot: this loop re-derives the code. The change log tells the next build to add the factories.
- medium — `Requests.tsx` `accept` disables only the clicked row, then replaces the whole list with that call's `listRequests()` result. Two Accept clicks overlap, and the earlier reload can finish last and put an already-accepted request back. A click on that row is a 404 and the page shows the generic error. The Course page's read counter does not cover this list. patch.
- medium — `Requests.tsx` `accept` disables only the clicked button, then `setState` with whichever `listRequests()` returns last. A slower refresh from the first Accept can put an already-accepted Request back. The next Accept is the 404 path and shows the generic error, while the Match already exists. bad_plan. The task said to list and Accept, and did not say an earlier refresh must not win.

## Design Notes

`LearnerEligibility` is only the duplicate-open check, read from `accepted_at`. Entry 3 adds the rest. After Accept this story leaves the button; entry 3 hides it for a live Match. Eligibility and progress are separate reads so Mentors and Courses do not call Matching or Progress.

## Verification

**Commands:**
- `cd api && php artisan test --compact && vendor/bin/pint --dirty --format agent` — green, including Matching.
- `cd web && npm run lint && npm test && npm run build` — clean.
- `./e2e/run.sh` — pass, including `request-and-accept.spec.ts`.
