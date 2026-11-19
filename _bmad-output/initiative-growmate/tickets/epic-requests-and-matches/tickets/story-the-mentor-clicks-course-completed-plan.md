---
title: 'The Mentor clicks Course Completed'
type: 'feature'
ticket: '7'
created: '2026-11-19'
status: 'in-progress'
baseline_revision: 'b69cfe81741a7ce6d1ad962806d6e8f1ef202848'
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

**Problem:** A Mentor cannot yet mark a Learner ready. The Match screen has only Quit, there is no Course Completed action, and no notice tells the Learner that Bronze is open.

**Approach:** Add a Mentor-only Course Completed action, behind a confirmation. It ends the Match with end reason `course_completed`, sends the Learner the notice "Bronze is open for [Course].", and leaves the Learner In progress. The existing Request refusal then applies to that Learner on that Course. The Bronze Stage itself is epic 3.

## Boundaries & Constraints

**Always:** Only the Mentor of the Match may complete it. A Learner, a non-party, an ended or missing Match, an Admin or an unauthenticated caller is refused, and a Learner or non-party answers the same 404 as every other Match refusal. Confirmation text: "Mark [Learner] ready for Bronze? This ends the match." The Mentor sees Course Completed as the primary action and Quit Course as secondary; the Learner sees only Quit Course. The end, the notice and the Match lock happen in one transaction. All copy lives in `app/copy.ts`. The Learner's bar stays half blue, In progress. No stored data beyond `ended_at` and `end_reason`.

**Never:** Build the Bronze Stage, Assessments or Stage availability (epic 3). No new migration. Do not change LearnerEligibility, QuitMatch behaviour, RequestState time rules, SendNotice field-exactness or the existing Confirmation behaviour. No notice to the Mentor or Admin. No Upskilling list (2.8).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mentor completes | Live Match, Mentor confirms | 204; Match ended `course_completed`; gone from both Homes and Match screen; Learner gets "Bronze is open for [Course]."; Learner bar stays In progress | No error expected |
| Learner calls it | Learner of a live Match | Refused, nothing changes | 404 |
| Stranger, ended or missing Match | Other user, ended Match or bad id | Refused, nothing changes | 404 |
| Double call | Second Complete on the same Match | Refused, exactly one notice | 404 |
| Request again | Learner after Course Completed requests any Mentor of that Course | Refused with `MATCHING_COURSE_ALREADY_COMPLETED` | existing 409 |
| Admin or signed out | No employee session | Refused | existing 401 or 403 |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Matching/Actions/QuitMatch.php` -- pattern to copy: transaction, `lockForUpdate`, 404s, SendNotice with `UserNames` and `CourseTitles`.
- `api/app/Modules/Matching/Http/Controllers/QuitMatchController.php` -- invokable controller pattern; name the HTTP request parameter `$http`.
- `api/routes/api.php` (line ~73, `can:employee` group, import ~line 23) -- add `POST matches/{match}/course-completed` with `->where('match','[0-9]{1,18}')`.
- `api/app/Modules/Matching/Models/MatchEndReason.php`, `Models/MentorMatch.php` -- `CourseCompleted` and the end columns already exist; no change.
- `api/app/Modules/Notifications/NoticeType.php` -- add `BronzeAvailable = 'bronze_available'` with fields `['course_title']`.
- `api/app/Modules/Matching/Queries/PartyMatch.php`, `Http/Resources/PartyMatchResource.php` -- add a viewer-role flag so the web can show Course Completed to the Mentor only (e.g. `can_complete_course`).
- `api/app/Modules/Matching/Queries/LearnerEligibility.php`, `Queries/HomeLists.php`, `Progress/Queries/ProgressStatus.php` -- already refuse, hide ended Matches and read In progress; do not change, only test.
- `api/database/factories/MentorMatchFactory.php` -- `courseCompleted()` state exists.
- `web/src/features/matching/Match.tsx`, `QuitDialog.tsx` -- Quit pattern; add the Course Completed button and confirmation, 404 shows Not found, success goes to `/home`.
- `web/src/app/Confirmation.tsx` -- reuse as is (props: title, message, confirmLabel, onCancel, onConfirm); guard a double click in the caller.
- `web/src/app/copy.ts`, `web/src/api/matching.ts`, `web/src/api/types/matching.ts`, `web/src/api/types/notifications.ts`, `web/src/features/notifications/Notices.tsx` -- strings, `completeCourse(id)`, types, and the Bronze notice sentence.
- Tests: `api/tests/Feature/Matching/QuitMatchTest.php` (copy), `SendRequestTest.php`, `web/src/features/matching/Match.test.tsx`, `web/src/features/notifications/Notices.test.tsx`.

## Tasks & Acceptance

**Execution:**
- [ ] `Matching/Actions/CompleteCourse.php`, controller, route -- Mentor-only end with `course_completed` and the Learner's notice in one transaction
- [ ] `Notifications/NoticeType.php` -- add `BronzeAvailable`
- [ ] `PartyMatch` query and resource -- expose the viewer's Mentor role
- [ ] web Match screen, confirmation, copy, API client, types, Notices -- UI per EXPERIENCE.md
- [ ] `api/tests/Feature/Matching/CompleteCourseTest.php` and web tests -- cover every I/O row

**Acceptance Criteria:**
- Given a live Match, when the Mentor confirms Course Completed, then the Match is gone for both, the Learner has the Bronze notice, and the Learner's bar stays In progress.
- Given Course Completed, when the Learner opens the Course page, then no Request button is available for that Course.
- Given a Learner, then the Match screen shows no Course Completed button and the API refuses the action.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

Course Completed and Quit share one shape: an action that ends the Match and notifies the other party. Quit stores who and why; Course Completed stores nothing extra. A Match ended `course_completed` already reads In progress in ProgressStatus, so Completed (green) waits for epic 3's Gold pass.

## Verification

**Commands:** (Windows. Prepend PHP to PATH first: `C:\Users\LENOVO\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.5_Microsoft.Winget.Source_8wekyb3d8bbwe`. phpunit uses sqlite in memory, so run it with `-d extension=pdo_sqlite -d extension=sqlite3`. No MySQL is needed. On web, a plain `npm test` fails here because `./Router` resolves to `router.ts`; run vitest with a temporary config that fixes the resolution, and delete it afterwards. Do not touch git: no commits, no branches, no pushes. The working tree has unrelated changes you must leave alone.)
- `php -d extension=pdo_sqlite -d extension=sqlite3 artisan test --filter=Matching` (from `api/`) -- expected: all pass
- `npx vitest run` (from `web/`, with the temporary config) -- expected: all pass

**Manual checks (if no CLI):**
- Confirm as Mentor on the local stack; the Learner's notice shows.
