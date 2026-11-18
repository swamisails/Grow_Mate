---
title: 'Home and the Match screen'
type: feature
ticket: '5'
created: '2026-11-17'
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

**Problem:** After Accept, Home still says the Learner is not learning a course, and neither party can open the Match. The Mentor has no Mentoring card.

**Approach:** Home's Learning card lists each Course where the viewer has a Progress status, with its bar. In progress links to the Match. Not yet started links to the Course. The Mentoring card lists the viewer's live Matches as Mentor and is absent when there are none. The Match screen shows the other person's name, the Course, and the bar, with no actions.

## Boundaries & Constraints

**Always:**
- A Learning row is one Course with a status. The Course title is the link. `in_progress` opens `/matches/{id}` and the bar is half blue, "In progress". `not_yet_started` opens the Course page and the bar is grey, "Not yet started".
- A Mentoring row is one live Match where the viewer is the Mentor. It reads "{Learner} — {Course}" and opens the same Match. No row, no card.
- The Match page title is the Course. The screen shows the other person's account name, the Course title, and that Learner's bar. Both parties open it. Anyone else gets the not-found page.
- A cancelled Request leaves no Learning row. The Mentor check card stays as it is.

**Never:** Quit Course, Course Completed, the Upskilling list, chat, helper text, or an end column. Do not change eligibility, the clock, or the Requests row. Do not reveal a Mentor `route` or `group_assignment_id`. Admin has no Match screen.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pending | Priya has requested Rafi, not yet Accepted | Learning shows Python Basics, grey bar, linking to the Course. Rafi has no Mentoring card | No error expected |
| After Accept | Rafi has Accepted | Priya's row is half blue and opens the Match. Rafi's Mentoring card lists "Priya Nair — Python Basics" and opens the same Match | No error expected |
| Match screen | Either party opens that Match | The other person's name, Python Basics, and the half-blue bar. No buttons | No error expected |
| Not a party | A stranger opens that Match | The not-found page | 404 |
| Cancelled | The Request is at sent + 144h and was never Accepted | Priya's Learning card is empty again | No Match, and no error expected |
| Admin | Admin opens Home's match data or a Match | No Match screen | 403 |

</frozen-after-approval>

## Code Map

- `web/src/features/accounts/Home.tsx` — L19–26 is always the empty Learning line. List Learning when the viewer has a status, and keep that empty line, with its Courses link, when they do not. Render Mentoring only when `mentoring` is non-empty. Leave `MentorCheckCard`.
- `web/src/features/progress/ProgressBar.tsx` — L13–24 already draws grey and half blue. Reuse it on Learning and on the Match screen. Do not add Quit.
- `api/app/Modules/Progress/Queries/ProgressStatus.php` — L17–25 is the only status. Pending and reminded are `not_yet_started`; accepted is `in_progress`; cancelled or none is null. Do not change it.
- `matches` has `id`, `request_id`, and `started_at` only (`MentorMatch.php` L22–29). A Match row is live. There is no `ended_at` on this branch. Home and the screen read Match rows joined to `requests` for the two people and the Course. Names come from `UserNames`, titles from `CourseTitles`.
- Add `GET /api/v1/home` and `GET /api/v1/matches/{id}` inside the employee group in `api/routes/api.php` L49–68. Home returns `learning` (`course_id`, `course_title`, `status`, `match_id` or null) and `mentoring` (`id`, `person_name`, `course_title`). The Match returns `person_name`, `course_title`, and `status`. A missing Match, or a viewer who is neither party, is 404. Guest stays 401 and Admin stays 403 by the existing middleware.
- `web/src/features/matching/routes.ts` is only `/requests`. Add `/matches/:id`. The page title is the Course. No Quit and no Course Completed.
- Do not change `AcceptRequest`, `RequestState`, `LearnerEligibility`, or the clock.

## Tasks & Acceptance

**Execution:**
- [x] Home and Match queries, resources, controllers, and `api/routes/api.php` — one Learning row per Course with a status, one Mentoring row per Match the viewer mentors, and one Match read for either party.
- [x] `Home.tsx`, a Match page, `routes.ts`, and `copy.ts` — the two cards and the screen. Mentoring is omitted when empty. Learning keeps its empty sentence.
- [x] `api/tests/Feature/Matching/` and `e2e/tests/` — one test per matrix row. A Home or Match body has no `route` and no `group_assignment_id`.

**Acceptance Criteria:**
- Given the commands in Verification, when they run, then they pass.
- Given a Mentor `route` or a group id, when Home or a Match is read, then neither appears.

## Implementation Notes

## Plan Change Log

## Review Triage Log

- Quick review. high 0, medium 0, low 0, false 0, maybe-false 0. The reviewer reported no findings.

## Design Notes

Learning is sorted by Course title. Mentoring is sorted by the Learner's name, then the Course title. `match_id` is null while the status is `not_yet_started`, so that row links to `/courses/{course_id}`. An `in_progress` row links to `/matches/{match_id}`. This branch has no ended Match: the screen exists only for a Match row, and a later entry that ends a Match removes it from these lists by there no longer being a live row to read.

## Verification

**Commands:**
- `cd api && php artisan test --compact && vendor/bin/pint --dirty --format agent` — green, including the Home and Match tests.
- `cd web && npm run lint && npm test && npm run build` — clean.
- `./e2e/run.sh` — pass, including Priya's Home, Rafi's Mentoring card, and the shared Match screen.
