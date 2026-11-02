# Review — adversary lens

- **Spine:** `architecture-growmate.md` (draft, 2026-11-02)
- **Lens:** construct two units one level down (epics 1–4) that each obey every AD to the letter yet build incompatibly.
- **Verdict:** The spine is not yet safe to build on. Group assignment is the weakest area: its owner, its admin route, its Accept path and its R7 reuse all have holes. Notices, the e2e clock and the Progress, Pass mark and Bronze seams each allow two compliant builds that can't fit together. 17 pairs: 7 High, 8 Medium, 2 Low.

Severity scale:
- **High:** the two builds can't both ship, or a C-constraint breaks at runtime.
- **Medium:** rework or merge pain, or a latent data defect.
- **Low:** cosmetic, or limited to one place.

---

## High

### A1. `group_assignments` has no legal home
- **Epic 4, build X.** Puts `group_assignments`, `CreateGroupAssignment` and `POST /api/v1/admin/group-assignments` in `Matching`. The capability map row "R10–R11 → Matching (group_assignments)" and the ERD label "(Matching)" support this.
- **Epic 4, build Y (or a second story in epic 4).** Reads AD-9, "Matching exposes no admin routes, which enforces C4". So it creates a `GroupAssignments` module that owns the table and the admin route, and has it call `Matching` Actions.
- **Why they clash.** Build X breaks AD-9 literally. Build Y leaves `requests.group_assignment_id` (a `Matching` table) with a foreign key to another module's table. That module is not in the AD-3 graph, and `Matching` would have to read it to do the whole-group Accept, so the dependency becomes a cycle. Each build can cite the spine. They also produce different module trees, migrations and route files.
- **Fix: new AD-13, "Group assignment ownership".**
  - `Matching` owns `group_assignments` and the nullable `requests.group_assignment_id`. Epic 2 creates both columns as nullable, so epic 4 adds no migration to `requests`.
  - The admin endpoint lives in a separate `Http/Admin` controller of `Matching`. It may call only `Matching\Actions\CreateGroupAssignment`.
  - Reword AD-9 to say: "Matching exposes no admin route that reads Requests or Matches; its only admin route is `POST /admin/group-assignments`, which returns no Request, Match or eligibility detail."

### A2. Two whole-group Accept paths, and a non-Mentor who can't see the group
- **Epic 2.**
  - Builds `POST /requests/{id}/accept` → `AcceptRequest`, one Request at a time (R8).
  - Builds the "Requests to me" screen under `features/matching`. It shows it only to users for whom `Mentors\Queries` reports at least one Course, because R8 says "A Mentor sees each pending Request".
- **Epic 4.** AD-8 forbids exposing `group_assignment_id` to Employees, so it cannot add `POST /group-assignments/{id}/accept`. It therefore either:
  - (a) changes `AcceptRequest` so that accepting any group Request accepts all its pending siblings and calls `GrantMentor`; or
  - (b) adds `AcceptGroup` keyed by Request id.
- **Why they clash.**
  - R10 says the chosen Employee "needn't already be a Mentor", so with epic 2's screen gating that person never sees the group Requests or an Accept button.
  - Fix (a) changes the semantics of an epic-2 Action from inside a parallel epic. Fix (b) gives two Accept paths, each with its own Accept-notice and grant logic.
  - Either way, R8's "each pending Request … and an Accept button", combined with one Accept removing N rows, shows the group origin the AD-8 field rule was meant to hide.
- **Fix: tighten AD-8 and add an AD on Accept.**
  - `AcceptRequest` is the only Accept path. If the Request has a `group_assignment_id`, it accepts every pending sibling in the same transaction, creates one Match each, calls `GrantMentor(group_assignment_accepted)` and sends one Accept notice per Learner.
  - The incoming-Requests endpoint and screen are available to every Employee, whether or not they are a Mentor.
  - Epic 2 builds the sibling branch, behind the nullable column. Epic 4 only creates groups.
  - Record the R8/R11 presentation question (one line per Request, or one line for the group) as an open product decision. Neither epic should settle it alone.

### A3. Notices: Laravel UUID rows against derived rows against AD-10's integer ids
- **Epic 1.** Follows AD-11 and uses Laravel's database notification channel, which stores the stock `notifications` table: a UUID `id`, `type` set to the FQCN, a `data` JSON column and `read_at`.
  - `GET /notifications` returns `{id:"9f1c…", type:"App\\…\\RegistrationDecided", data:{course_title, decision}, read_at, created_at}`.
  - `PATCH /notifications/{uuid}/read` marks one as read.
- **Epic 2.** Follows AD-11 and implements `TimeNoticeSource` from `RequestState`. Derived notices have no row, so it returns `{id:"req-12-day3", kind:"request_reminder", text:"…", date:"…Z"}`.
- **Epics 2 and 4 disagree on where the notice classes live.**
  - Epic 2 puts `Matching/Notifications/RequestSent.php` in its module and calls `$user->notify()` directly. That obeys "stored through Laravel's database notification channel".
  - Epic 4 calls a `Notifications` Action so that `Notifications` "is the only sender".
- **Why they clash.**
  - AD-10 says ids are integers, but the stock table uses UUIDs, and derived notices have no id at all.
  - The two kinds disagree on `type`/`kind`, `created_at`/`date`, and pre-rendered text against `data`.
  - Read/unread for derived notices is "Deferred, internal to Notifications", but epic 1's mark-read endpoint can't address them.
  - The SPA `Notice` type can't describe both kinds, and sorting the merged inbox is undefined.
- **Fix: tighten AD-11 with a Notice contract.**
  - `Notifications\Actions\SendNotice(recipient_id, NoticeType, payload)` is the only way to store a notice. No module calls `notify()` itself.
  - `NoticeType` is a closed enum in `Notifications` that mirrors R22: `request_new`, `request_accepted`, `request_reminder_day3`, `request_cancelled_day6`, `match_quit`, `bronze_available`, `registration_decided`.
  - The payload holds only primitive snapshots: names, the Course title and the Quit reason. It never holds a route or a group id.
  - The single Resource shape is `{ id: string, type: NoticeType, occurred_at: ISO-Z, read: bool, payload: {…} }`, where `id` is the UUID or the deterministic `"{type}:{request_id}:{user_id}"`.
  - The inbox is ordered by `occurred_at` descending, then by `id`.
  - Add an AD-10 exception: notice ids are strings.
  - Decide now whether the API or the SPA renders the notice sentence. The API should, so the SPA can't word R8/R22 text differently.

### A4. The e2e clock can't work as written under PHP-FPM, and a frozen clock against an advancing one breaks ordering
- **Epic 1 harness.** `POST /testing/clock` calls `Carbon::setTestNow($t)`, as AD-6 says. Under PHP-FPM that lasts only for that one request, so epic 1 has to persist it somehow. It stores an absolute frozen instant in the cache and applies it in middleware.
- **Epic 3.** Writes the Lock e2e as "fail, fail, then set the clock to +1 month". Its API tests use `travel()`, which keeps time moving.
- **Epic 2.** Persists the clock as an offset from real time. The spine allows either reading.
- **Why they clash.**
  - With a frozen clock, both failures carry the same `attempted_at`. "Second failure" ordered by timestamp is then a tie, and `StageAvailability` may pick the wrong row.
  - Day-3 and day-6 tests that assume time is moving pass with an offset clock and fail with a frozen one.
  - The literal rule, "calls `Carbon::setTestNow`", is not implementable across requests at all.
- **Fix: tighten AD-6.**
  - The endpoint stores an absolute frozen instant in the cache under one key, and `DELETE` resets it.
  - One global middleware, plus the console kernel, applies it to every request and command.
  - Every fact is ordered by `id`, never by timestamp. Note this in AD-4.

### A5. Upskilling list against `ProgressStatus`: two derivations
- **Epic 2.**
  - Builds `Progress\Queries\ProgressStatus(learner, course)` per pair, as AD-4 shows.
  - Because the per-pair function can't be listed efficiently, it builds the Upskilling list as a separate SQL query in `Progress`: matches that are live or ended with `course_completed`. That still counts as "a Progress query", as AD-4 asks.
- **Epic 3.** Adds Completed to `ProgressStatus` only, with the check "Gold attempt passed → completed".
- **Why they clash.** Gold-passed Learners stay on the Upskilling list as In progress, so R21 and R20 disagree. Both epics can say they used "the one function".
- **Fix: tighten AD-4.**
  - `ProgressStatus` is one set-based query returning `(user_id, course_id, status)` rows. The per-pair lookup and the Upskilling list both filter it.
  - Fix the precedence in the AD: `completed` > `in_progress` > `quit` > `not_yet_started` > none, with the latest fact winning between `quit` and `not_yet_started`.
  - Fix the wire values: `not_yet_started | in_progress | completed | quit | null`.
  - `Assessments` exposes `Queries\GoldPassed` as a set query for `Progress` to join.

### A6. Pass mark and question edits after attempts: Completed without a Mentor, and answer leakage
- **Epic 1.**
  - Authors Assessments in `Courses` and allows edits after publish, since R5 says nothing against it.
  - Its question Resource and its `Courses\Queries\StageQuestions` include `is_correct`, because Admin needs it.
- **Epic 3.**
  - Following AD-4, "each attempt and its score", it stores only `score_percent`. It derives pass as `score >= current pass_mark` inside `StageAvailability`, and calls `GrantMentor` only at submit time.
  - It reuses `Courses\Queries\StageQuestions` to serve the Assessment to the Learner.
- **Why they clash.**
  - Suppose Admin lowers Gold's Pass mark after a failure. `ProgressStatus` turns the Learner Completed and `StageAvailability` shows Gold as passed, but `mentor_routes` has no row, so R19 breaks.
  - If Admin deletes an option, cascades remove attempt answers, which breaks C10.
  - The Learner-facing payload carries `is_correct`, which gives the answers away.
- **Fix: new AD-14, "Published assessment content is frozen".**
  - After publish, Stages, questions, options and Pass marks are immutable. Return 409 `COURSE_PUBLISHED_IMMUTABLE`.
  - A Stage attempt stores the facts `score_percent`, `pass_mark_percent` and `passed`.
  - `Courses` exposes two Queries: an authoring Query (admin, with correctness) and `QuestionsForTaking` (without correctness). Only `Courses\Queries\ScoreAnswers` sees correctness when scoring.

### A7. R7 refusals reused by Group assignment: duplicated logic, and a C4 leak through the codes
- **Epic 2.**
  - Writes the R7 checks inline in `SendRequest`, with distinct codes: `REQUEST_ALREADY_OPEN`, `MATCH_LIVE`, `COURSE_ALREADY_COMPLETED` and `ALREADY_MENTOR`.
  - `SendRequest` also checks that the recipient is a listed Mentor and dispatches the new-Request notice.
- **Epic 4.**
  - Can't call `SendRequest`, because the chosen Employee is often not a Mentor, which would give `MENTOR_NOT_LISTED`. So it reimplements the R7 checks in `CreateGroupAssignment`.
  - To meet "blocked from selection" without the SPA deriving anything (AD-2), it adds `GET /admin/courses/{id}/assignable-learners`, returning each excluded Learner with the R7 `code`.
- **Why they clash.**
  - There are two copies of R7. For example, epic 2 later tightens "live Match" and epic 4 doesn't follow.
  - The distinct codes tell Admin which Learners have a pending Request or a live Match on a Course. That is a view into Requests and Matches, which breaks C4, and nothing in the spine forbids it.
  - AD-10's 409 holds a single `code`, so there is no defined way to refuse one Learner out of five.
  - There is also a race. `SendRequest` and `CreateGroupAssignment` can both pass the "no open Request" check at the same moment. AD-4 forbids a stored "pending" flag, so no unique index can stop it.
- **Fix: new AD-15.**
  - `Matching\Queries\LearnerEligibility(learner, course): ?ErrorCode` is the only implementation of R7. `SendRequest` and `CreateGroupAssignment` both call it, inside a transaction that locks the Learner's `users` row with `SELECT … FOR UPDATE`.
  - Admin-facing responses collapse every R7 reason into one code, `LEARNER_NOT_ASSIGNABLE`, which carries no reason.
  - The assignable list returns only eligible ids.
  - A group with any ineligible Learner gets a 422 with `errors["learner_ids.N"]`.

---

## Medium

### A8. Bronze availability has two owners before `Assessments` exists
- **Epic 2.** Must deliver "Course Completed … makes Bronze available" and the Bronze-available notice. AD-3's graph forbids `Matching → Assessments`, and epic 3 hasn't built `Assessments` yet. So it adds `bronze_available` to the Match/Course resource from `Matching`, or a `GET /courses/{id}/stages` in `Matching`.
- **Epic 3.** Creates the `Assessments` module with `StageAvailability` and its own `GET /courses/{id}/stages`.
- **Why they clash.** There are two sources of truth for "Bronze is available", which is what AD-4 names `Assessments\Queries\StageAvailability`. There are also two endpoints and two SPA renderings.
- **Fix: tighten AD-4.** Epic 2 creates the `Assessments` module skeleton, holding the `Bronze` branch of `StageAvailability` and `GET /api/v1/courses/{id}/stages`. Epic 3 extends that skeleton. Add a "module creation" column to the capability map.

### A9. Embedding Progress in other Resources creates cycles
- **Epic 2.** Embeds `progress_status` in `MatchResource` for the R12 bar by calling `Progress\Queries` from `Matching\Http`. That creates a `Matching → Progress` edge and a cycle.
- **Epic 2, Course page.** Embeds `mentors` in `CourseResource` (`Courses → Mentors`), which is also a cycle.
- **Epic 3.** Leaves the Resources alone and has the SPA call `GET /progress?course_id=`.
- **Why they clash.** The same bar is fetched two ways. AD-3 says nothing on whether the `Http/` layer is bound by the graph.
- **Fix: tighten AD-3.**
  - Either the graph binds `Actions/` and `Queries/` only, and an `Http` controller may compose Queries from any module into one response;
  - or `Progress` owns `GET /progress` and no other Resource embeds a status.
  - Pick one.

### A10. Parallel edits to the `ErrorCode` enum (epics 3 and 4)
- **Epic 3.** Adds `case NotEligible = 'NOT_ELIGIBLE'` for "Stage not available".
- **Epic 4.** Adds `case NotEligible = 'NOT_ELIGIBLE'` for "Learner not assignable".
- **Why they clash.** The merge keeps one case, and the SPA's `switch(code)` gives one of them the wrong meaning. Case-naming and value-style drift is also allowed, for example `RequestAlreadyOpen` against `REQUEST_ALREADY_OPEN`.
- **Fix: tighten AD-10.**
  - Each code is prefixed by its owning module (`MATCHING_`, `ASSESSMENTS_`, `GROUP_`, `COURSES_`), and the case name equals the value.
  - Cases are kept in one line each, sorted alphabetically.
  - Epic 2 pre-registers the R7 codes, and epic 1 the Courses codes.
  - The 409 body may carry `meta` for rule dates. For example, `ASSESSMENTS_STAGE_LOCKED` carries `meta.locked_until`, so the SPA doesn't compute it (AD-2).

### A11. Parallel edits to `web/src/api/types.ts` (epics 3 and 4)
- **Epic 3.** Edits `ProgressStatus` to add `'completed'` and adds `Stage` and `StageAttempt`.
- **Epic 4.** Adds `GroupAssignment` and an `AdminMentor` type with `route`. It may also add `group_assignment_id?` to `Request` for an admin view.
- **Why they clash.** Both edit one file in the same release window. One type (`Request`) also serves both the Employee and the Admin Resource, which invites a leak into Employee code under AD-8.
- **Fix: tighten AD-10.**
  - Types live in `web/src/api/types/<module>.ts`, with a barrel `index.ts` that only re-exports.
  - An Admin Resource gets its own `Admin*` type and is never a widening of the Employee type.

### A12. SPA route layout and the shared Course page
- **Epic 2.** Puts the Mentor list and the Request button into `features/courses/CoursePage.tsx` at `/courses/:id`, and puts Matches at `/matches/:id`.
- **Epic 3.** Puts Stages at `/assessments/:stageId` and adds a panel to `CoursePage.tsx`.
- **Epic 4.** Adds "Assign group" to the admin Course page and edits the same `App.tsx` router as epic 3.
- **Why they clash.** Nothing names where admin screens live (`/admin/*`?) or who owns `CoursePage`. Two parallel epics then edit one page and one router file. AD-1 and AD-2 only constrain how data flows.
- **Fix: new SPA layout convention or AD.**
  - Employee routes sit at `/…` and Admin routes at `/admin/…`.
  - Each feature exports a `routes.ts`, composed in one generated or append-only `routes.tsx`.
  - The Course page is owned by `features/courses` and exposes named slots (`mentors`, `stages`) that other features fill.

### A13. Seed data and scenario fixtures
- **Epic 3.** Seeds a Gold-passed Learner by inserting `stage_attempts` rows with factories. It bypasses `GrantMentor`, so the Learner is Completed but not a Mentor.
- **Epic 4.** Seeds through Actions under a frozen clock.
- **Both epics.** Add `learner1@example.com` to the shared `DatabaseSeeder`.
- **Why they clash.** Duplicate emails are refused (R1), and the seeded states are inconsistent. AD-3 doesn't say whether seeders count as writers, and the Conventions only fix the order Admin → Courses → Employees.
- **Fix: tighten the Tests convention into an AD.**
  - Seeders and e2e fixtures change state only by calling Actions, under the AD-6 clock.
  - Each epic adds a named scenario seeder in its own module.
  - Seeded emails follow `<epic-slug>-<role>-<n>@seed.test`.
  - `DatabaseSeeder` runs only the epic 1 base set.

### A14. A pending Registration decision against a group grant
- **Epic 4.** Excludes only Employees with a refused `registration_decisions` row (R10). It chooses Employee E, who has a *pending* row, and E Accepts, which grants `group_assignment_accepted`.
- **Epic 1.** Later Admin refuses E's pending row. `DecideRegistration` doesn't touch `mentor_routes`.
- **Why they clash.** E is now both "refused" (so R3 leaves Gold pass as the only route) and a Mentor. The refusal is final but has no effect.
- **Fix: tighten AD-7.**
  - Either Group assignment also excludes an Employee with a pending decision on that Course;
  - or a decision on a pair that already holds a `mentor_routes` row is refused with `MENTORS_ALREADY_MENTOR`.
  - Pick one.

### A15. The Retake rule's month arithmetic and its counting cycle
- **Epic 3, `StageAvailability`.** Uses `addMonth()`, which overflows, so Jan 31 + 1 month = Mar 3.
- **The e2e scenario for SM-1.** Its author takes AD-5's "Prevents … 30 days" literally and sets the clock to `+30 days`.
- **Another epic-3 story.** Counts the Lock cycle as `fails % 2 == 0`. The cycle-based reading instead counts failures after the last Lock end. These agree today, but they diverge if attempt rows are ever created at start rather than at submit, because an abandoned attempt counts under one reading and not the other.
- **Fix: tighten AD-5.**
  - Lock end is `second_failure.attempted_at->addMonthNoOverflow()`.
  - The Stage is available when `now() >= lock_end`.
  - An attempt row is written only at submit.
  - A cycle is the failures after the latest Lock end.
  - Remove "30 days" from the AD-5 Prevents line.

---

## Low

### A16. How far Admin's route visibility reaches
- **Epic 1.** Shows `route` only for the (Mentor, Course) pairs Admin decided.
- **Epic 4.** Shows `route` for every Mentor of any Course where Admin made a Group assignment, which includes Gold-pass Mentors.
- **Why they clash.** AD-8's "Courses where that Admin made the … decision or the Group assignment" supports both readings.
- **Fix: tighten AD-8.** Admin sees `route` only on the exact pair whose route Admin's own action created, that is `registration_approval` or `group_assignment_accepted`.

### A17. Reading user names without a graph edge
- **Epic 2.** `Matching` needs Learner and Mentor names. It joins `users` directly or uses an Eloquent `belongsTo(User)`, which breaks AD-3's "never import another module's Models".
- **Epic 3.** Calls `Accounts\Queries\UserNames`.
- **Why they clash.** The graph has no `Matching → Accounts` or `Assessments → Accounts` edge, so each epic invents its own way in.
- **Fix: tighten AD-3.** Every module may depend on `Accounts\Queries`. Draw the edges, and forbid cross-module Eloquent relationships.

---

## Summary of AD changes

| # | Change | Closes |
| --- | --- | --- |
| New AD-13 | `Matching` owns `group_assignments` and the nullable `requests.group_assignment_id` (epic 2 creates it). Reword AD-9 to allow the one admin route that creates groups. | A1 |
| New AD on Accept, plus tightened AD-8 | `AcceptRequest` is the only Accept path and handles the group branch. The incoming-Requests screen is open to every Employee. | A2 |
| AD-11 tightened | `SendNotice` with a closed `NoticeType`, one Notice Resource with string ids, and an ordering rule. | A3 |
| AD-6 tightened | The frozen instant is persisted and applied by middleware. Facts are ordered by `id`. | A4 |
| AD-4 tightened | `ProgressStatus` is set-based, with a fixed precedence and fixed wire values. `GoldPassed` is a set query. The epic 2 `Assessments` skeleton holds the Bronze branch. | A5, A8 |
| New AD-14 | Published Assessment content is frozen. An attempt stores `passed` and the Pass mark it was scored against. There are separate authoring and taking Queries. | A6 |
| New AD-15 | `LearnerEligibility` is the single implementation of R7, with row locking. Admin gets the collapsed code `LEARNER_NOT_ASSIGNABLE`. | A7 |
| AD-3 tightened | Whether the graph binds the `Http/` layer. `Accounts\Queries` is a universal edge. | A9, A17 |
| AD-10 tightened | `ErrorCode` prefixes, the 409 `meta`, and per-module SPA type files. | A10, A11 |
| New SPA layout AD | Route prefixes, per-feature route modules, and slots on the Course page. | A12 |
| Seeding AD | Seeders go through Actions only, per-module scenario seeders, namespaced emails. | A13 |
| AD-7 tightened | Pending decisions against group grants. | A14 |
| AD-5 tightened | `addMonthNoOverflow`, the boundary at `>=`, attempts written at submit, the cycle definition. | A15 |
| AD-8 tightened | The exact scope of Admin's route visibility. | A16 |
