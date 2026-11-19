---
title: 'Either party Quits a Match'
type: 'feature'
ticket: '6'
created: '2026-11-18'
status: 'in-progress'
baseline_revision: '0ef317aa04645c7fba06e11db0131c95ad0a9dec'
route: 'full'
route_source: 'auto'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A live Match can only end today by schema; nothing writes `ended_at`, reads ignore ended Matches, and there is no Quit Course action, Quit dialog, Quit note or red Quit bar.

**Approach:** Add a Quit action on the Match screen for both parties. It ends the Match at once, stores who quit and the reason on the Match, sends the other party a Quit note, and makes the Learner's status Quit until a new Request is sent. Ended Matches disappear from every read.

## Boundaries & Constraints

**Always:** Reason required, 1–500 chars after trim; both parties may quit, no approval. Reason stored on the Match (quit_by_id, quit_reason) and shown only in the other party's notice, rendered as text. Quit note wording: "[Name] quit [Course]." with the reason quoted below. Quit bar is red with the word "Quit" and nothing else (C9); the bar is the same whoever quit. A non-party or ended Match answers 404. All copy lives in `app/copy.ts`. Admin never sees Matches or notices.

**Never:** Change LearnerEligibility, AcceptRequest, RequestState time rules, SendNotice field-exactness, or Confirmation.tsx behaviour. No Course Completed (2.7), Upskilling list (2.8) or Bronze unlock. No reason shown on Match history, Course page or lists.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mentor quits | Live Match, reason "Moving teams, sorry" | Match ended; Learner gets note quoting reason; Learner bar red "Quit"; Match gone from both Homes; Learner can request again | No error expected |
| Learner quits | Live Match, valid reason | Same red bar for the Learner; Mentor gets the note | No error expected |
| Blank or 501 chars | reason "" / whitespace / 501 chars | Refused, nothing changes | 422 on `reason` |
| Not a party / ended / missing | Other user or already ended | 404, nothing changes | 404 |
| Quit then new Request | Learner has Quit status, sends Request | Status becomes Not yet started | n/a |
| Quit, new Request, Cancel | as above, day 6 passes | No status | n/a |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Matching/Models/MentorMatch.php`, `Models/MatchEndReason.php` -- Match model and end-reason enum; add casts/fillables for the new columns.
- `api/database/migrations/2026_11_16_141403_add_end_to_matches_table.php` -- existing `ended_at`, `end_reason`; do NOT edit, add a new migration.
- `api/database/factories/MentorMatchFactory.php` -- add `quit()` state beside `courseCompleted()`.
- `api/app/Modules/Matching/Actions/AcceptRequest.php` -- pattern: transaction, `lockForUpdate`, 404 for non-party, SendNotice with `UserNames`/`CourseTitles`.
- `api/app/Modules/Matching/Http/Controllers/AcceptRequestController.php`, `Http/Requests/SendCourseRequest.php` -- controller and form-request patterns.
- `api/routes/api.php` (~55-75, `can:employee` group) -- add `POST matches/{match}/quit`.
- `api/app/Modules/Matching/Queries/PartyMatch.php`, `Queries/HomeLists.php` -- ignore `ended_at` today; must 404 / exclude ended Matches.
- `api/app/Modules/Progress/Queries/ProgressStatus.php` -- derives status from `RequestState`; add `quit` (open Request > live Match > quit > none).
- `api/app/Modules/Notifications/NoticeType.php`, `Http/Resources/NoticeResource.php` -- add `MatchQuit` with fields person_name, course_title, reason.
- `web/src/features/matching/Match.tsx` (+ test, routes.ts), `features/progress/ProgressBar.tsx`, `app/styles.css`, `app/tokens.css` (`--color-error`), `app/Confirmation.tsx` (pattern only), `app/copy.ts`, `api/matching.ts`, `api/types/{matching,progress,notifications}.ts`, `features/notifications/Notices.tsx` -- web side.
- `api/tests/Feature/Matching/MatchingTestCase.php`, `AcceptRequestTest.php`, `HomeAndMatchTest.php`; `web/src/test/api.ts` -- test patterns and helpers.

## Tasks & Acceptance

**Execution:**
- [ ] `api/database/migrations/<new>_add_quit_to_matches_table.php` -- add nullable `quit_by_id` (FK users) and `quit_reason` (string 500) -- AD-4 stores who quit and why
- [ ] `Matching/Actions/QuitMatch.php` + controller + form request + route -- validate, end Match, store quit data, notify the other party in one transaction
- [ ] `Notifications/NoticeType.php` -- add `MatchQuit` -- the Quit note
- [ ] `Matching/Queries/PartyMatch.php`, `HomeLists.php`, `Progress/Queries/ProgressStatus.php` -- hide ended Matches; add `quit` status
- [ ] `web` Match screen, Quit dialog, ProgressBar `quit`, Notices, copy, types -- UI per EXPERIENCE.md
- [ ] API feature tests and Vitest tests -- cover every I/O row

**Acceptance Criteria:**
- Given a live Match, when either party quits with a valid reason, then the Match ends, the other party's notice shows the reason, and the Learner's bar is red "Quit".
- Given a Quit Learner, when they open the Course page, then the Request buttons are back.
- Given any quit, then no screen other than the other party's notice shows the reason.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

Status precedence: open Request, then live Match, then quit Match, then none. Quit applies only until a new Request is sent.

## Verification

**Commands:** (Windows. Prepend PHP to PATH first: `C:\Users\LENOVO\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.5_Microsoft.Winget.Source_8wekyb3d8bbwe`; `composer` is a .bat in that folder. Local MySQL runs on 127.0.0.1:3307, root/root, and `api/.env` exists. Use a separate test database, never grow_mate data you cannot reseed. Do not touch git: no commits, no branches, no pushes. The working tree has unrelated changes you must leave alone.)
- `php artisan test --filter=Matching` (from `api/`) -- expected: all pass
- `npm test` (from `web/`) -- expected: all pass

**Manual checks (if no CLI):**
- Quit as Mentor on the local stack; the Learner's notice and red bar show.
