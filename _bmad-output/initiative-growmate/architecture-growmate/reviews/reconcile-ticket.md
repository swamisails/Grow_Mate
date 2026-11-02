# Reconcile: architecture spine vs initiative ticket

- Spine: `architecture-growmate.md` (draft, 2026-11-02)
- Ticket: `initiative-growmate.md` (R1–R22, C1–C10, Notes)
- Also read: `glossary.md`, `tickets/tickets.toml`
- Reviewed: 2026-11-02. Read-only review; no source file was edited.

## Verdict

**Needs revision before epic 1 stories.** The skeleton is sound. Every R and C id appears in the Capability map, the dependency graph as drawn has no cycle, and the facts-only storage plus single derivation functions (AD-4) fit the ticket well. But three ADs contradict the ticket or each other where the Group assignment and Admin's view meet:

- AD-9 says Matching has no admin routes, but R10 lives in Matching.
- As written, AD-8 makes R11's single group Accept impossible to render, and it hides the Employee's own R3 decision lists.
- AD-8's Admin route rule is wider than C4/C6 allow and needs a Mentors → Matching edge that would close a cycle.

Several quiet rules from the ticket have no AD governing them:

- Quit reason privacy (C10).
- The bare, no-nudge tone (R20, C9, SM-C2).
- R7 refusals reused for Group assignment (a Notes decision).
- The "Mentor check never runs again" rule (R2), including a skipped check.

---

## 1. Contradictions (AD vs ticket, or AD vs AD)

| # | Where | Problem | Suggested fix |
|---|---|---|---|
| X1 | AD-9 vs Capability map R10–R11 | AD-9: "Matching exposes no admin routes, which enforces C4". The map puts Group assignment (`group_assignments`, an Admin action under C4) in Matching. Either R10 has no endpoint or AD-9 is broken. | Move Group assignment into its own `GroupAssignments` module (depends on Matching and Mentors) that owns `group_assignments` and the `/admin/group-assignments` endpoint. Matching keeps a nullable `requests.group_assignment_id` from epic 2. This also fixes X3 and M2. |
| X2 | AD-8 vs R11 | AD-8: Employee Resources never include `group_assignment_id` "or any field from which [it] could be inferred". R11 requires the chosen Employee to Accept the whole group with **one** Accept, so the pending-Request screen must group the Requests. As written, AD-8 forbids the data the SPA needs. | Add a narrow carve-out. Before Accept, the chosen Employee's pending-Requests Resource may show group Requests as one acceptable unit, with no "group" label or Admin attribution. After Accept, no Match, Progress, Mentor-list or Learner-side Resource or notice carries group origin. Ask the PO to confirm that this reading of C6 vs R11 is intended. |
| X3 | AD-8 (Admin route) vs C4, C6, Done-when SM-C1 | AD-8 lets Admin endpoints include `route` "for Courses where that Admin made the Registration decision or the Group assignment". **(a)** It is scoped per Course, not per (Employee, Course). On a Course Admin touched once, Admin would see every Mentor's route, including `gold_pass`, which reveals Assessment and Match history. C6 says "a Mentor's route only for Courses Admin decided or assigned", meaning that Mentor's pair. **(b)** C4's closed list of Admin features has no "view Mentors/routes" feature. **(c)** Showing `group_assignment_accepted` tells Admin the group was Accepted, so Matches exist, which conflicts with C4 and SM-C1. **(d)** "That Admin" assumes several Admins, but C2 has exactly one. | Restrict Admin to the records Admin created: its own `registration_decisions` and its own `group_assignments`. Admin never reads `mentor_routes` for other pairs. Escalate (c) to the PO: should Admin see whether a Group assignment was Accepted at all? Fix the "that Admin" wording. |
| X4 | AD-8 vs R3 / R22 | R3 says the Employee "sees approved and refused Courses as two separate lists" and is notified of each decision. These are the Employee's own Registration-approval routes, which AD-8 forbids "any field from which [route] could be inferred" on Employee Resources. | Carve out the Employee's own Registration decisions, shown to themselves as approved/refused lists and decision notices. The rule stays absolute for Mentor lists, Requests, Matches and anything shown to other Employees. |
| X5 | AD-6 vs `tickets.toml` | AD-6 places the clock hook in the epic 1 harness. `tickets.toml` has epic 2 delivering "the controllable clock", and epic 3 "on epic 2's clock" with epic 3 `after` epic 2 needing "the controllable clock". | Pick one owner. Epic 1 is cleaner, since its harness needs the clock. Update whichever artifact is wrong. |
| X6 | AD-6 mechanism (affects R9, R18, SM-1 Lock scenario) | `POST /testing/clock` "calls `Carbon::setTestNow`". Under PHP-FPM, that lasts only for the current request, so the next request is back on real time. As written, end-to-end runs could not reach day 3, day 6 or a Lock. | Persist the test time (cache/DB key) and apply `Carbon::setTestNow` in a non-prod middleware or service provider on every request. Keep it registered only in `testing`/`e2e`. |

## 2. Ticket content that did not land (quiet requirements)

| # | Ticket source | What is dropped | Suggested fix |
|---|---|---|---|
| G1 | C10 "A Quit reason is visible only to the other party"; R13 | No AD governs Quit-reason visibility. AD-8 covers only route and group origin, and the Conventions "Free text" row covers rendering only. Nothing stops the quitter's Match Resource, a Progress or Upskilling Resource, or any Admin path from returning `quit_reason`. The notification payload also stores it a second time. | Add it to AD-8 (rename it "Hidden fields") or a new AD. `quit_reason` appears only in the Quit note to the other party and in that party's view of the ended Match. It is never returned to the quitter, to Admin, or in any list. |
| G2 | R20 (no numbers, percentages, markers or activity signals), R12 (no helper text or activity indicator), C9, SM-C2 ("nothing nudges a Mentor after day 6"), R8 exact wording | The tone of the "empty middle" has no governing AD. The map sends C7–C9 to "AD-2, Non-goals in ticket", but AD-2 is about where rules are computed, not what is shown. Nothing pins the bar to its four states, forbids counters, unread nudges or "last active", or fixes the R8 strings. | Add a "Bare surface" AD. The Progress Resource exposes only the status enum, with no dates, counts or scores. Match and Request Resources carry only the R8/R12 fields. There are no reward, capacity or suspension tables (C8). The R8 and R22 copy lives in one template set. No notice other than R22's exists, so nothing is derived after day 6. Map C7–C9, R12 and R20 to it. |
| G3 | Notes: "R7's refusals apply to Group assignment"; R10 | No AD or map row says SendRequest and Group assignment share one eligibility check. R7 has no named single owner either: its refusals span RequestState, ended Matches and `Mentors\Queries`. | Add `Matching\Queries\RequestEligibility(learner, course)` as the one function. Both `SendRequest` and the Group assignment action call it. Add the registration-refusal check for the chosen Employee through `Mentors\Queries`. Map R10 to AD-4 as well. |
| G4 | R2 "The Mentor check never runs again", "a Course published after signup can't be gained" | `SubmitMentorCheck` is "accepted once per Employee and called by the SPA ... right after" signup. **(a)** An Employee who skipped has no record, so they can call it later. **(b)** A later single call can name a Course published after signup. **(c)** Sequencing a business rule in the SPA conflicts with AD-2. | Make the rule server-side. Mentors either listens to an Accounts `EmployeeSignedUp` event carrying the chosen Course ids (this keeps Mentors → Accounts), or `SubmitMentorCheck` rejects any call after the first or after the signup window and any Course with `published_at > users.created_at`. Record a skip too. Only published Courses are accepted. |
| G5 | R3 "no score and no comment", "Decisions are final" | No rule that a `registration_decisions` row, once decided, is immutable, or that the endpoint takes no comment. C5's "no Reject response" also has no governing rule, since the map gives C5 only the Free-text convention. | Add to AD-7 or AD-4: a decision is written once, and a second decision returns 409 `DECISION_FINAL`. Add a closed list of write endpoints with no reason or comment fields and no reject endpoint. |
| G6 | R10/R7 refusals vs C4 and SM-C1 (Admin has no insight into Requests or Matches) | The Group assignment refusals ("has a pending Request", "has had Course Completed") would tell Admin about Requests and Matches through specific `ErrorCode`s such as `REQUEST_ALREADY_OPEN`. | Admin-facing refusals use one generic code (e.g. `LEARNER_NOT_ASSIGNABLE`), or ineligible Learners are left out of the picker with no reason given. |
| G7 | R18 "the month is fixed"; glossary "fixed one-month period" | AD-5 says "exactly `+1 month` from the second failure". Carbon's `addMonth()` overflows (Jan 31 + 1 month = Mar 3). It is also unclear whether "second failure" means the second failure of the current pair, given the cycles repeat. | Specify `addMonthNoOverflow()`, or define the month as `+30 days`, and say "the second failure of the current two-attempt cycle". |
| G8 | R10 "Learners get no assignment notice"; group Requests under R9 | AD-11 does not bind R10. It does not say whether the chosen Employee's day-3 reminder is one per Request or one per group, or that the Learner's day-3 and day-6 notices for a group Request reveal no group origin. | Add R10 to AD-11's binds. State that group creation sends nothing to Learners and that time notices for group Requests follow AD-8. Decide whether the Mentor's reminder is per Request or per group. |
| G9 | Notes: SM-1 full seeded run "belongs to the initiative's closure check" | The spine mentions the harness (epic 1) but not that the full SM-1 run, including the Lock, refused-Employee and Learner-Quit scenarios, runs at closure after epics 3 and 4. | Add one line under AD-6 or the Tests convention: each epic adds its journeys to `e2e/`, and the full SM-1 run is the closure check. |
| G10 | Notes: the architecture run settles "the deploy target"; Done-when "The app is deployed" | The hosting target is Deferred, and AD-12 fixes only the compose form. | Either name a concrete target (e.g. one VM running the compose stack) or have the PO accept "compose stack on a named machine" as "deployed". |

## 3. Notes decisions: honoured?

| Decision | Status | Evidence / gap |
|---|---|---|
| Epic 1 owns grant-Mentor op + all three route values | Honoured in substance | AD-7 (`GrantMentor`, three `route` values, sole writer). The spine never says which epic creates `Mentors`; see section 6. |
| Epic 1 owns stored refused Registration decisions | Honoured | `registration_decisions` is owned by Mentors (ERD, map R2–R3). Finality is missing (G5). |
| One Mentor status per Course, first route kept | Honoured | AD-7: unique (`user_id`, `course_id`), and a grant for an existing pair does nothing. |
| R7 refusals apply to Group assignment | **Not honoured** | G3, G6. |
| SM-1 run at closure | **Not stated** | G9. |
| C1–C3 owned by epic 1 | Honoured | AD-1/AD-12, AD-9, AD-11 are all epic 1 foundations. |
| Architecture settles stack, data model, notifications, clock, deploy target | Mostly | The deploy target is deferred (G10), and the clock mechanism is flawed (X6). |
| Seed order Admin → Courses → Employees | Honoured | Conventions, Tests row. |
| Epic 3 before 4, no dependency between them | Honoured | Neither module needs the other. A Group-assignment module (X1 fix) would depend on Matching and Mentors only. |

## 4. Capability map: coverage and plausibility

All of R1–R22 and C1–C10 appear in the map. Mappings that are present but implausible or incomplete:

- **R10–R11** go to Matching with AD-7/AD-8. This conflicts with AD-9 (X1). The map is missing AD-4 (eligibility, G3) and AD-5 (R9 timing for group Requests).
- **R7–R9, R12–R15** omit AD-8, though AD-8 binds R8 and R12. There is no single owner for R7 eligibility (G3).
- **R16–R19** omit AD-2 ("a Stage not yet unlocked isn't shown"). AD-4 also does not list R16 or R19 in its Binds, although it defines `StageAvailability`.
- **R20–R21** have no rule for the bare bar (G2). R21's "no ranking" should fix a neutral order, such as by name.
- **C4** goes to AD-9 alone, and AD-9 is contradicted (X1). The Admin read paths in AD-8 fall outside C4's closed list (X3).
- **C5** goes to the Conventions only. Nothing governs "no Reject" (G5).
- **C7–C9** go to "AD-2, Non-goals in ticket", which in effect governs nothing (G2).
- **C10** goes to the ERD and AD-4, which cover the storage list but not the privacy half (G1). C10 lists "Progress statuses" as stored data while AD-4 derives them. That is fine, but say so in AD-4 so no one adds a status column "for C10".

## 5. Module ownership

**Tables, one owner each:**

| Module | Tables |
|---|---|
| Accounts | `users`, `personal_access_tokens` |
| Courses | `courses`, `stages`, `questions`, `options` |
| Mentors | `mentor_routes`, `registration_decisions` |
| Matching | `requests`, `matches`, `group_assignments` |
| Assessments | `stage_attempts` |
| Notifications | `notifications` |

Every table has exactly one owner.

**Derived state:**

| Derived state | Owner |
|---|---|
| Request state | `Matching\Queries\RequestState` |
| Lock and Stage availability | `Assessments\Queries\StageAvailability` |
| Progress status and Upskilling list | `Progress\Queries\ProgressStatus` |
| Is-a-Mentor | `Mentors\Queries` |
| Day-3 and day-6 notices | Matching (TimeNoticeSource), surfaced by Notifications |

Gaps:

- **R7 eligibility** has no single owner (G3).
- **Refused at registration** for a Group assignment is presumably `Mentors\Queries`, but the spine does not name it.
- **Read/unread state of derived notices** is deferred but will need a table, which belongs to Notifications. Add it to the ERD when it is decided.
- **Naming:** the `Assessments` module does not own the Assessment (the glossary's question bank). Courses owns `questions` and `options`, and Assessments owns only attempts. Consider renaming the module to `StageAttempts`, or note the split explicitly so the glossary-naming rule is not broken.
- **Naming:** `Matching`, `Accounts` and `Progress` are not glossary nouns, even though the Conventions say modules use the glossary noun. Either relax that convention for module names or add the terms to the glossary.

## 6. AD-3 dependency graph

**As drawn it is acyclic.** Accounts is the sink, and Notifications depends only on Accounts. Topological order:

1. Accounts
2. Notifications, Courses
3. Mentors
4. Matching
5. Assessments
6. Progress

The TimeNoticeSource inversion keeps Matching → Notifications.

**Latent cycles and missing edges:**

- **AD-8's Admin route view needs Mentors → Matching.** Mentors owns `route`, but `group_assignments` lives in Matching, so a cycle with Matching → Mentors appears. Putting the endpoint in Matching instead contradicts AD-9. The X1 fix (a separate `GroupAssignments` module depending on Matching and Mentors) removes both problems.
- **Progress has no edges to Accounts or Courses**, though the Upskilling list needs names and Course titles. Add these edges, which create no cycle.

## 7. Module layout vs epic split

| Epic | Creates | Extends |
|---|---|---|
| 1 | Accounts, Courses (including Stage Assessments and Pass marks for R5), Mentors (`mentor_routes`, `registration_decisions`, `GrantMentor`), Notifications (mechanism plus the Registration-decision notice), compose (AD-12), `e2e/` harness and seeders, and the clock hook per AD-6 (conflicts with tickets.toml, X5) | — |
| 2 | Matching (`requests`, `matches`, `RequestState`, TimeNoticeSource), Progress (`ProgressStatus`, Upskilling list) | — |
| 3 | Assessments (`stage_attempts`, `StageAvailability`) | Progress (`ProgressStatus` gains Completed and Stage progress) |
| 4 | Today: no module of its own | Matching (`group_assignments`, the group Accept, admin endpoints) |

**Inconsistencies:**

- **Progress → Assessments, but epic 2 builds Progress before Assessments exists.** Epic 2 cannot meet R9's "no Progress status unless they have Stage progress" or R20's Completed state, and epic 3 must reopen `ProgressStatus`. State this handoff explicitly, and have epic 2 ship an Assessments-facing contract or stub.
- **Epic 4 adds a table and a column (`requests.group_assignment_id`) to Matching, which epic 2 owns.** This is the cross-epic table write that AD-3 says it prevents. Fix it as in X1: epic 2 creates `requests.group_assignment_id` as nullable, and epic 4 creates a `GroupAssignments` module.
- **No Epic → Module table.** Add one to the Structural Seed so story writers know which epic creates which module.
