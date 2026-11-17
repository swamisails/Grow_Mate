---
title: 'Employees see their Registration-decision notices and lists'
type: 'feature'
ticket: '8'
created: '2026-11-16'
status: done
baseline_revision: 'f2d71b01ee2ed2dd133662e208475e0b17febb84'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admin's Registration decisions (entry 7) are invisible to the Employee. There is no notice pipeline, no Notices page and no Home Mentor check card.

**Approach:** Epic 1, entry 8; covers R4 and R9 (AD-8, AD-11). The work has three parts:
- A new Notifications module with the one `SendNotice` pipeline and an Employee inbox.
- A Registration-decision notice, sent once each decision commits.
- A Home Mentor check card listing the Employee's approved and refused Courses separately.

## Boundaries & Constraints

**Always:**
- **Notifications module (AD-3, AD-11):**
  - The module owns Laravel's standard `notifications` table.
  - `Notifications\Actions\SendNotice::handle(int $recipientId, NoticeType $type, array $fields)` is the only writer. It sends through Laravel's database channel, deferred with `DB::afterCommit`, so a caller calls it inside its own transaction and a rolled-back caller sends nothing.
  - An Admin recipient is never written: `SendNotice` throws a `LogicException`.
  - `NoticeType` is a closed string-backed enum. This entry adds only `registration_decision`.
  - Each notice id is a UUIDv7 string.
- **Inbox:** `GET /api/v1/notices` returns `{data: [{id, type, occurred_at, ...type fields}]}`, newest `occurred_at` first, then by id descending.
  - `occurred_at` is the notice's creation time, as ISO-8601 UTC with `Z`.
  - The endpoint sits in the existing `can:browse` Employee group, so Admin gets a 403 and a guest a 401.
  - There is no read state, no count and no pagination.
- **The Registration-decision notice:** its type fields are `{course_title, outcome}`, and it carries no route.
  - `DecideRegistration` calls `SendNotice` inside its transaction, once per decision.
  - A 409 or 404 sends nothing.
- **Employee lists:** `GET /api/v1/registration-decisions` (Employee group) returns `{data: {named, approved: [{id, title}], refused: [{id, title}]}}`, with each list sorted by title. `named` is true when the Employee's Mentor check names any Course. An undecided Course is in neither list. Only `Mentors\Queries` answers this.
- **SPA:**
  - A Notices page at `/notices`, Employee-only. Its title is "Notices" and it has one card holding one list.
  - Each row shows its sentence, then the UTC date as "16 Nov 2026" in `meta`. The sentences are "You can now mentor [Course]." and "You weren't approved to mentor [Course]."
  - The empty state is "No notices."
  - The Employee top bar becomes Home · Courses · Notices, with a bell icon.
  - Home becomes a two-column `card-grid` holding Learning and a "Mentor check" card. The card has "Approved" and "Refused" lists and is shown only when `named` is true.
  - All wording lives in `copy.ts`. User text is rendered as text.

**Decision (2026-11-16):** the Home Mentor check card always shows both its "Approved" and "Refused" headings. An empty list shows "None." in `meta`, as its empty-state line.

**Never:** a notice to Admin; an unread count, badge, polling or links on notices; a route, date or comment on the Home card; time notices or the `TimeNoticeSource` contract (entry 2.2); other notice types. Don't touch the dirty `api/.env.example` or the untracked walkthrough folder.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Approve | Admin approves one of Sam's Courses | Sam has one `registration_decision` notice with `outcome: approved` | — |
| Refuse | Admin refuses one | Notice with `outcome: refused` | — |
| Refused decision | Second decision, or an unknown id | No notice | 409; 404 |
| Order | Two decisions within one second | Newest first, every time | — |
| Inbox empty | No notices | "No notices." | — |
| Inbox access | Guest; Admin | — | 401; 403 |
| Lists | 3 named: 1 approved, 1 refused, 1 undecided | approved [1], refused [1], `named: true` | — |
| Skipped | Skipped check | `named: false`; no card | — |
| Nothing decided | 2 named, none decided | Card shows both headings, each with "None." | — |
| Admin recipient | `SendNotice` with the Admin's id | Nothing stored | LogicException |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Mentors/Actions/DecideRegistration.php` -- add the `SendNotice` call inside the transaction, after the insert and grant. The Course title comes from `Courses\Queries\CourseTitles`. The comment at the return currently promises entry 8 there; update it.
- `api/app/Modules/Mentors/{ErrorCode.php,Exceptions/MentorRuleViolation.php}`, `Queries/RegistrationDecisions.php` -- the Admin-side patterns; the new Employee Query copies their join style.
- `api/app/Modules/Accounts/Models/User.php` -- already `Notifiable`. Notifications never imports it. Add `Accounts\Queries\EmployeeNotifiable::handle(int): ?object` (null for Admin or unknown) so `SendNotice` can send through the database channel. The inbox reads `notifications` by `notifiable_id`; only users are notifiable.
- `api/app/Modules/Courses/CoursesServiceProvider.php`, `api/bootstrap/providers.php` -- the provider pattern, if Notifications needs one (it shouldn't).
- `api/routes/api.php` -- the `can:browse,Course` group, where the Mentor check routes already sit; add `notices` and `registration-decisions` there.
- `api/database/migrations/` -- `2026_11_16_100000_create_notifications_table.php`, using Laravel's standard notifications schema.
- `api/tests/Feature/Mentors/{MentorsTestCase,RegistrationDecisionsTest}.php` -- helpers and `check()`. Use `Event`/`DB::afterCommit` behaviour under `RefreshDatabase`, which runs after-commit callbacks for the test transaction.
- `web/src/features/accounts/Home.tsx` -- Learning card only; the new card goes beside it. `web/src/app/roles.test.tsx` L80 asserts Home's Learning region.
- `web/src/features/mentors/CourseMentors.tsx` -- card plus `.list`/`.list-row` pattern and load states.
- `web/src/app/layout.tsx` `EmployeeLayout`, `icons.tsx` -- add the Notices link and a Material Symbols outlined `notifications` icon.
- `web/src/app/routes.ts` -- add `features/notifications/routes.ts`. `web/src/api/types/` -- add `notifications.ts`.
- `e2e/tests/registration-decisions.spec.ts` -- extend it or add `registration-decision-notices.spec.ts` with the same helpers. `mentor-check.spec.ts` for skip flows. `app-shell.spec.ts` may assert the Employee nav links.

## Tasks & Acceptance

**Execution:**
- [x] `api/database/migrations/2026_11_16_100000_create_notifications_table.php`, `api/app/Modules/Notifications/{NoticeType.php,Actions/SendNotice.php,Notices/EventNotice.php,Queries/Inbox.php}`, `api/app/Modules/Accounts/Queries/EmployeeNotifiable.php` -- the pipeline.
- [x] `api/app/Modules/Notifications/Http/{Controllers,Resources}/`, `api/routes/api.php` -- `GET /notices`.
- [x] `api/app/Modules/Mentors/Actions/DecideRegistration.php` -- send the notice.
- [x] `api/app/Modules/Mentors/Queries/EmployeeRegistrationDecisions.php`, a controller and resource, the route -- `GET /registration-decisions`.
- [x] `api/tests/Feature/Notifications/` and `api/tests/Feature/Mentors/EmployeeRegistrationDecisionsTest.php` -- every matrix row, no `route` key, same-second order.
- [x] `web/src/api/{notifications.ts,types/notifications.ts,mentors.ts,types/mentors.ts}`, `web/src/features/notifications/{Notices.tsx,routes.ts}`, `web/src/features/mentors/MentorCheckCard.tsx`, `web/src/features/accounts/Home.tsx`, `web/src/app/{layout.tsx,icons.tsx,routes.ts,copy.ts,styles.css}` -- the page, the card and the nav.
- [x] `web/src/features/notifications/Notices.test.tsx`, `web/src/features/mentors/MentorCheckCard.test.tsx` (+ the roles/App nav assertions) -- rows, dates, empty, error, the hidden card and the separated lists.
- [x] `e2e/tests/registration-decision-notices.spec.ts` -- the ticket's verify, including Admin having no Notices link and no notice.

**Acceptance Criteria:**
- Given Admin approved one of an Employee's Courses, refused another and left a third, when the Employee opens Notices and Home, then they see two notices, newest first, and Home lists one approved and one refused Course.
- Given `php artisan test`, Pint, `npm run lint`, `npm test`, `npm run build` and `./e2e/run.sh`, when they run, then all pass.

## Implementation Notes

- `SendNotice` also refuses (LogicException, nothing stored) a field set that isn't exactly `NoticeType::fields()`, so a hidden field such as a route can't ride along (AD-8), and an unknown recipient id, which `EmployeeNotifiable` reports as null like Admin.
- Notice ids are `Str::uuid7()` from the real clock (not `now()`), so they stay time-ordered across PHP-FPM workers even under a frozen test clock; `occurred_at` is the row's `created_at`, from `now()`.
- `copy.date()` formats dates with fixed month names in `copy.ts` rather than `Intl`, whose `en-GB` short month for September is "Sept".
- The e2e spec `registration-decision-notices.spec.ts` was written and lists under Playwright, but `./e2e/run.sh` was not run: Docker was down. `employee-accounts.spec.ts` now expects the Notices link.

## Plan Change Log

## Review Triage Log

Loop 1 (quick lens). Verdicts: 0 high, 0 medium, 5 low, 0 false.

| # | Location | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | Acceptance Criteria (`./e2e/run.sh`) | The new e2e spec and the changed `employee-accounts.spec.ts` assertions have never run | low | True: Docker was down. This is a gap in verification, not a code defect. No code change fixes it; it needs an e2e run once Docker is up, and that is reported to the human | rejected |
| 2 | `Notifications/Actions/SendNotice.php` + `Mentors/Actions/DecideRegistration.php` | A failure in the after-commit notice insert escapes `DB::transaction` as a 500 after the decision has committed, and the notice is lost | low | Real: Laravel runs after-commit callbacks after `getPdo()->commit()` with no try/catch, and `NotificationSender` rethrows. It needs the `notifications` insert to fail straight after a successful commit on the same connection, which is unlikely in everyday use. The fix is a catch-and-report guard, or an outbox | rejected |
| 3 | `tests/Feature/Notifications/RegistrationDecisionNoticesTest.php` | The "rolled back by a concurrent duplicate" test can't fail: the duplicate throws before `SendNotice` runs | low | Confirmed: in `DecideRegistration` the insert precedes the `sendNotice` call. The rollback path is covered by `SendNoticeTest::test_a_rolled_back_caller_sends_nothing`. Fix: rename to what it proves | patch |
| 4 | `e2e/tests/employee-accounts.spec.ts`, `registration-decision-notices.spec.ts` "skipped" test | `toHaveCount(0)` on the Mentor check region passes before the card's read resolves | low | Confirmed: `MentorCheckCard` returns null while pending, and Playwright's `toHaveCount(0)` passes immediately. Fix: await the SPA's own `/registration-decisions` response first | patch |
| 5 | `e2e/tests/registration-decision-notices.spec.ts` `utcToday()` | The expected date comes from the runner's wall clock rather than the API's `now()` | low | Confirmed: it flakes across UTC midnight, and it breaks under the AD-6 test clock (epic 2). Fix: derive the date from the API's `occurred_at` | patch |

## Design Notes

- **Course title is stored in the notice.** A published Course's title is frozen, so the notice is a complete fact, and the inbox reads no other module.
- **Order.** Timestamps have second precision, so two decisions in one second tie on `created_at`. UUIDv7 ids are time-ordered to the millisecond and break the tie.
- **The Home card while loading or failing renders nothing.** It may not apply to this Employee, and Learning still renders. This matches entry 6's "failed status read" choice.
- **Copy the UX docs leave open** (adjust at approval): card heading "Mentor check"; list headings "Approved" and "Refused".

## Verification

**Commands:**
- `cd api && php artisan test --compact && vendor/bin/pint --dirty --format agent` -- expected: green, no style diffs.
- `cd web && npm run lint && npm test && npm run build` -- expected: clean.
- `./e2e/run.sh` -- expected: the full suite passes, including the new spec.
