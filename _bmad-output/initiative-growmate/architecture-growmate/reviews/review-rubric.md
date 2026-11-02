# Rubric review: GrowMate architecture spine

- Spine: `architecture-growmate.md` (draft, 2026-11-02)
- Ticket: `initiative-growmate.md`. I also read the epics in `tickets/`, `glossary.md` and PRD §4–§8.
- Reviewer: fresh context, read-only.

## Verdict

The spine is well shaped and right-sized. It catches most of the real divergence points: derived state, one clock, one GrantMentor, one notifications sender and one error contract. It is not ready to build on, for three reasons:
- Two of its own rules contradict requirements that epic 4 must deliver (AD-9 and AD-8 against R10 and R11).
- The test-clock mechanism (AD-6) won't work as written under PHP-FPM.
- "Deployed", which every epic's Done-when depends on, is deferred and undefined.

Findings: 0 critical, 5 high, 11 medium, 10 low.

## Checklist judgement

| # | Check | Result |
| --- | --- | --- |
| 1 | Fixes the real divergence points for the 4 epics | Partly. It misses the group Request/Accept contract (epics 2 and 4), Course mutability after publish (epics 1 and 3), the notification payload contract (epics 1, 2 and 4), the seed/reset mechanism and derived state in list queries. |
| 2 | Every Rule is enforceable and prevents its divergence | Partly. AD-6 can't work as written. AD-9's "Prevents XSS token theft" is not achieved by its Rule. AD-8 and AD-9 contradict R3, R10 and R11. |
| 3 | Nothing under Deferred lets units diverge | Mostly. "Hosting target" is not safe to defer, because the ticket requires the deploy target. Read state for derived notices depends on a contract that two epics share. |
| 4 | Tech plausibly current | Yes. Only minor notes (Node 22 is now maintenance LTS, and Compose is unpinned). |
| 5 | Covers every ticket requirement | Mostly. The Done-when "The app is deployed" and the Notes Decision "architecture settles … the deploy target" are not covered. R2 "never runs again" is weakly enforced. |
| 6 | Every owned dimension decided, deferred or open | No. Environments, secrets delivery, production Admin seeding and e2e data reset are silent. TLS is implied (HTTPS in the diagram) but undecided. |
| — | Right-sized | Yes. It is terse with little bloat. There is minor rationale leakage (L10). |

## Findings

### H1 (high): AD-9 forbids the admin route that R10 needs from Matching

- **Where:** AD-9 says "Matching exposes no admin routes, which enforces C4." The Capability map puts R10 Group assignment in "Matching (group_assignments)", and the ERD places `group_assignments` in Matching.
- **Problem:** R10 is an Admin action that creates `group_assignments` and `requests` rows, both owned by Matching. Under AD-3, only Matching's Actions may write them. Epic 4 must therefore either break AD-9 or move tables to a new owner. Two builders will resolve this differently.
- **Fix:** Replace the clause with a precise rule: "Matching's only admin route is `POST /api/v1/admin/group-assignments` (plus a read of eligible Employees for the form). No admin route reads or lists Requests, Matches or their states." Alternatively, make `GroupAssignments` its own module that calls a Matching Action. Either way, state the allowed admin surface as a closed list that mirrors C4.

### H2 (high): The group Request/Accept contract is unfixed between epics 2 and 4, and AD-8 forbids the handle R11 needs

- **Where:** AD-8, AD-4 and the Capability map rows for R7–R11.
- **Problem:** Epic 2 builds `SendRequest`, the Mentor's pending-Request list and per-Request `AcceptRequest` (R8). Epic 4 must layer group Requests on top, and the spine leaves the seams to each epic:
  - (a) R11 says a group Request must never be Accepted alone. Nothing says that `AcceptRequest` refuses Requests that have a `group_assignment_id` (and with which `ErrorCode`).
  - (b) Group Requests go to an Employee who may not be a Mentor and isn't "listed". Epic 2's "recipient must be a listed Mentor" check and its Mentor-only inbox will reject or hide them.
  - (c) R11 makes the chosen Employee see the group and Accept it once, which needs a group handle in the API. AD-8 bans `group_assignment_id`, "or any field from which [it] could be inferred", from every Employee-facing Resource. That makes R11 unbuildable as written.
  - (d) AD-8 also conflicts with R3, under which the Employee sees their own approved and refused Courses, which reveals their own Registration-approval route.
- **Fix:**
  - Add an AD such as "Group Requests". It should cover these points:
    - `requests.group_assignment_id` is nullable.
    - `AcceptRequest` refuses grouped Requests with `REQUEST_IS_GROUPED`.
    - `AcceptGroupAssignment` accepts every Request in the group in one transaction, creates one Match per Learner and calls `GrantMentor(group_assignment_accepted)`.
    - The recipient's pending-Request list includes Requests addressed to non-Mentors.
    - The "listed Mentor" check lives only in `SendRequest`.
  - Rescope AD-8 so it bans route and group origin for Matches, the Mentor list, the Learner side and other Employees. It should explicitly allow:
    - the chosen Employee's pending group handle;
    - an Employee's own Registration-decision lists.

### H3 (high): The deploy target and environments are deferred, although the ticket requires them

- **Where:** Deferred, "Hosting target", and AD-12.
- **Problem:** The ticket's Done-when says "The app is deployed and usable in a desktop browser". Its Notes Decision says the architecture run settles "the deploy target". Every epic's Done-when says it is "verified end to end on the deployed app", and epic 1 runs "the seed data and end-to-end test harness … against the deployed app".
  - With the host deferred, "deployed" is undefined, so each epic can claim done on a different basis (local compose, a VM, nothing).
  - The environment set is never named. AD-6 mentions `testing` and `e2e` and implies production. The e2e harness (which needs the clock endpoint) can't run "against the deployed app" if the deployed app is production, where AD-6 forbids the endpoint.
- **Fix:**
  - Decide the minimum deploy target, even if it is "the compose stack on one named host, or locally on the developer machine, reachable at URL X". Do this in AD-12, or record it as an explicit Open Question owned by epic 1's first story.
  - Enumerate the environments (`local`, `e2e`, `production`) and state which one "deployed" means for Done-when, and which one the SM-1 seeded run uses.

### H4 (high): AD-6's test clock can't work as written under PHP-FPM

- **Where:** AD-6. `POST /api/v1/testing/clock` "calls `Carbon::setTestNow`".
- **Problem:** `Carbon::setTestNow` lasts only for the current PHP request. AD-12's PHP-FPM boots each request fresh, so the next request (the SPA's or the harness's) sees real time again. Day-3, day-6 and Lock scenarios in the e2e run (SM-1) would silently use wall time. Epic 1 will have to invent persistence, and the spine doesn't fix how. That part crosses API, harness and every later epic's e2e tests.
- **Fix:** Rewrite the Rule as follows:
  - The endpoint stores a fixed test instant (or offset) in one place, such as the cache or a `testing_clock` row.
  - A middleware registered only in `testing` and `e2e` applies `Carbon::setTestNow` from that store at the start of every request.
  - `DELETE` on the same endpoint resets it.
  - Frozen time and advancing offset are fixed as a single choice.

### H5 (high): Course and Assessment mutability after publish is unfixed between epics 1 and 3

- **Where:** AD-4 ("each attempt and its score", state derived), R4–R5 in Courses, R16–R19 in Assessments.
- **Problem:** Epic 1 builds authoring, and epic 3 derives pass/fail and Stage availability. The spine doesn't fix whether a published Course's questions or Pass mark can be edited, or whether a Course can be unpublished. It also doesn't fix whether "passed" is stored or derived from score against the current Pass mark.
  - If epic 1 allows edits and epic 3 derives pass/fail, a Pass-mark change retroactively flips past passes and Locks after a Gold-pass grant has already been written.
  - If epic 3 stores `passed`, AD-4's "derive state" is broken.
- **Fix:** Add a rule:
  - Once published, a Course's Stages, questions, options and Pass marks are immutable, and Courses are never unpublished.
  - Alternatively, each attempt stores `score_percent`, `pass_mark_at_attempt` and `passed` as facts.
  - If neither is decided, raise it as an Open Question for the PO before epic 1 stories.

### M1 (medium): No notification payload contract

- **Where:** AD-11, AD-2 and Consistency Conventions.
- **Problem:** Epics 1, 2 and 4 each emit notices into one inbox that the SPA renders. The spine doesn't fix:
  - the notification `type` names, as a closed enum mirroring R22;
  - the payload fields;
  - whether the API or the SPA composes the exact sentences (R8's "[Learner] requested you to guide them with [Course]" and "[Mentor] is your mentor for [Course].");
  - the stable ids of derived day-3 and day-6 items, which `TimeNoticeSource` (epic 2) must supply. The deferred "read/unread for derived notices" depends on them.
- **Fix:** Add a short convention:
  - A `NotificationType` enum with the R22 set.
  - The inbox item shape `{ id, type, created_at, read_at, data: {…} }`.
  - Sentences composed by the API in a `text` field, to stay consistent with AD-2.
  - Derived ids of the form `request-{id}-day3` and `request-{id}-day6`.
  - `TimeNoticeSource` returns items in that shape.

### M2 (medium): "One function" per derived state doesn't say how list queries use it

- **Where:** AD-4.
- **Problem:** Several queries filter by derived state across many rows:
  - the Upskilling list over all Employees and Courses;
  - the Mentor's pending Requests;
  - R7 and R10 eligibility;
  - the Admin group form's eligible Learners.
  A PHP per-entity function forces loading every row, so builders will write SQL scopes that duplicate the logic. That is the divergence AD-4 exists to prevent.
- **Fix:** State that each derivation class (`RequestState`, `StageAvailability`, `ProgressStatus`) owns both its per-entity function and its query scope, and that no other code expresses the conditions.

### M3 (medium): DB-side time can bypass the single clock

- **Where:** AD-5.
- **Problem:** The Rule bans PHP and JS clock calls, but not MySQL `NOW()`, `CURRENT_TIMESTAMP` or `useCurrent()` defaults in migrations or derived-state SQL. Those ignore `Carbon::setTestNow` and break e2e time travel (H4) and `$this->travel()` tests.
- **Fix:** Add this to AD-5: "No DB-side clock: no `NOW()` or `CURRENT_TIMESTAMP` in queries, and no `useCurrent()` in migrations. Pass `now()` as a bound parameter."

### M4 (medium): The once-only Mentor check (R2) is enforced by SPA sequencing

- **Where:** Capability map row R2–R3: "`SubmitMentorCheck`, accepted once per Employee and called by the SPA sign-up flow right after `Accounts` creates the account".
- **Problem:** A skip leaves no row, so a later call would be accepted, and R2 says the check "never runs again". If the SPA fails between the two calls, the window stays open indefinitely. The SPA is enforcing a rule, which goes against AD-2.
- **Fix:**
  - Record the check as a fact (`users.mentor_check_at`, or a `mentor_checks` row written even on skip).
  - `SubmitMentorCheck` refuses with an `ErrorCode` once that fact exists, or once the account is older than the signup session.
  - Alternatively, have the signup endpoint accept the optional Course ids and call the Mentors Action server-side through an event, so the dependency direction holds.

### M5 (medium): Correct answers can leak through a shared Assessment Resource

- **Where:** The Courses module (epic 1 authoring) and Assessments (epic 3 taking). AD-10.
- **Problem:** Epic 1 builds Question and Option Resources that carry `is_correct` for Admin. Epic 3 may reuse them for Learners, and nothing in the spine forbids it.
- **Fix:** Add one line: "Learner-facing Assessment Resources never include correctness. Scoring happens only in `Assessments` Actions."

### M6 (medium): Group-assignment eligibility refusals can reveal Request and Match state to Admin (C4)

- **Where:** R10 refusals, AD-9 and AD-10.
- **Problem:** Epic 4 must block Learners who have a pending Request, a live Match or Course Completed. If the form or a 409 says which reason applies, Admin gains insight into Requests and Matches, which SM-C1 and SM-C2 forbid.
- **Fix:** Fix that the admin eligibility read and refusal return only a single generic `LEARNER_NOT_ELIGIBLE` (and `MENTOR_NOT_ELIGIBLE` for a refused chosen Employee) with no reason detail.

### M7 (medium): A build-time `VITE_API_URL` contradicts "same images on any host", and CORS is silent

- **Where:** AD-12 and the Containers diagram.
- **Problem:**
  - A build-time variable bakes the API URL into the `web` image, so it can't be "the same image" across local, e2e and any future host.
  - The browser calls `web` and `api` as separate origins, but CORS (allowed origins via env) is not mentioned.
- **Fix:** Either serve the API under the same origin (`web` nginx proxies `/api` to `api`, and the SPA uses the relative `/api/v1`), or inject the URL at container start. Add "CORS allowed origin comes from env" if the origins stay separate.

### M8 (medium): The seeding mechanism is unfixed, both for the production Admin and for e2e

- **Where:** AD-9 ("seeded at setup"), Conventions (Tests) and the source tree ("`api` seeders").
- **Problem:**
  - Nothing says how the single Admin is created on a deployed environment or where its credentials come from.
  - Nothing says how epics 2–4 put the e2e run into a known state: Laravel seeders, a test-only reset/seed endpoint, or public API calls through the harness. Each epic's e2e tests will invent one.
- **Fix:**
  - Production: Admin is created by a one-shot idempotent `api` command reading `ADMIN_EMAIL` and `ADMIN_PASSWORD` from env.
  - e2e: a single test-only `POST /api/v1/testing/reset` (registered under the same guard as AD-6) runs `migrate:fresh` plus the base seed (Admin, Courses, Employees). Scenario state is then built through public API calls only.

### M9 (medium): Secrets handling is unaddressed beyond ".env only"

- **Where:** Conventions (Config) and AD-12.
- **Problem:** The spine doesn't say:
  - how secrets (`APP_KEY`, DB credentials, Admin password) reach a deployed host;
  - that `.env` is never committed or baked into images;
  - how `APP_KEY` is generated.
- **Fix:** Add this to AD-12: "Secrets are supplied as runtime env (`env_file` outside git); none are in images or the repo. `.env.example` lists every key." Add one line for `APP_KEY` generation at first deploy.

### M10 (medium): AD-8's Admin route-visibility clause is ambiguous and breaks the dependency direction

- **Where:** AD-8 (Admin may see `route` "only for Courses where that Admin made the Registration decision or the Group assignment") and the AD-3 graph.
- **Problem:**
  - With a single Admin, "that Admin" is meaningless, and it is unclear whether the scope is per Course or per (Mentor, Course) pair.
  - Answering it needs `group_assignments` (Matching) from `Mentors\Queries`, which requires `Mentors → Matching` and creates a cycle with `Matching → Mentors`.
  - No C4 Admin screen obviously needs routes at all.
- **Fix:** Restate it as: "Admin endpoints may include `route` only for (Employee, Course) pairs that have a Registration decision or a Group assignment naming that Employee." Name the endpoint, and state which module answers it without a cycle (for example, Matching composes it from `Mentors\Queries`). If no Admin screen needs it, say Admin endpoints never include `route`.

### M11 (medium): AD-9 claims to prevent XSS token theft, but its Rule stores the bearer token in `localStorage`

- **Where:** AD-9, Prevents and Rule.
- **Problem:** Any script injection, including through a compromised dependency, can read `localStorage`. "No `dangerouslySetInnerHTML`" reduces the risk but doesn't prevent theft, so the Rule doesn't achieve its stated prevention.
- **Fix:** Either switch to Sanctum SPA cookie auth (httpOnly session, same-site, which pairs with the same-origin option in M7), or keep bearer tokens, add a strict CSP served by the `web` nginx, and reword Prevents so it doesn't overclaim.

### L1 (low): "+1 month" overflow semantics are unpinned

- **Where:** AD-5.
- **Problem:** Carbon's `addMonth()` overflows (Jan 31 becomes Mar 3), while `addMonthNoOverflow()` doesn't. The e2e harness expectations and `StageAvailability` could disagree.
- **Fix:** Name the method.

### L2 (low): Stack version notes

- **Where:** Stack.
- **Problem:** Node 22 is in maintenance LTS (end of life April 2027), and Node 24 is the active LTS. "Docker Compose: current stable" is unpinned.
- **Fix:** Consider Node 24.x and pin a minimum Compose v2 version. Everything else looks plausible (PHP 8.4, Laravel 13, MySQL 8.4 LTS, React 19.x, Vite 8). Detailed version checks are in `review-versions.md`.

### L3 (low): List and pagination shape is unfixed

- **Where:** AD-10.
- **Problem:** Laravel's paginated Resources add `links` and `meta` beside `data`. The Upskilling list, Mentor list and inbox may differ, some paginated and some not.
- **Fix:** Add either "lists are unpaginated `{data: []}` at practice scale" or "paginated lists use Laravel's default `{data, links, meta}`".

### L4 (low): The "one open Request or Match per Course" rule has no race guard

- **Where:** AD-4 and R7.
- **Problem:** Because state is derived, no unique index can enforce the rule, so a double submit can create two pending Requests.
- **Fix:** `SendRequest` and the group Action lock the Learner row (`lockForUpdate`) inside the transaction before checking.

### L5 (low): C10 lists "Progress statuses" and "Locks" as stored data, while AD-4 never stores them

- **Where:** AD-4, C10 and the Capability map.
- **Problem:** Deriving these from stored facts arguably satisfies C10, but a reader could see a contradiction.
- **Fix:** Add one clause: "C10's statuses and Locks are kept as the facts they derive from."

### L6 (low): HTTPS is drawn but not decided

- **Where:** The Containers diagram and AD-12.
- **Problem:** No TLS termination is specified in the three-service stack.
- **Fix:** State where TLS terminates (the host proxy, or the `web` nginx), or mark it deferred with the host.

### L7 (low): The dependency graph's status and the ownership of ProgressStatus are unclear

- **Where:** AD-3 and AD-4.
- **Problem:**
  - It isn't said whether the graph is an exhaustive allow-list or whether transitive reads are allowed. `Progress` reads names and titles but has no edge to `Accounts` or `Courses`.
  - `ProgressStatus` is built in epic 2 and extended in epic 3, which isn't stated.
- **Fix:** Say the graph is an allow-list, add `Progress → Accounts` and `Progress → Courses`, and note that epic 2 creates `ProgressStatus` and epic 3 extends it.

### L8 (low): Auth details are left open

- **Where:** AD-9 and AD-10.
- **Problem:** The token expiry value isn't set, sign-in rate limiting isn't covered (Deferred lumps it under "no requirement"), and `401` for unauthenticated isn't listed among the error statuses.
- **Fix:** Name the expiry (for example, a `SANCTUM_EXPIRATION` env value), keep Laravel's default login throttle, and add `401` to AD-10.

### L9 (low): The API test framework and SPA routing/data-fetching library are silent

- **Where:** Stack, Conventions (Tests) and Deferred.
- **Problem:** Pest or PHPUnit, and the router and fetch layer, are neither decided nor deferred to epic 1, unlike the e2e tool and UI library.
- **Fix:** Add them to the existing Deferred line ("chosen in epic 1's first stories"), or pin them in Stack.

### L10 (low): Right-sizing nits

- **Where:** Throughout.
- **Problem:**
  - A few clauses carry rationale: in Deferred, "so the choice changes no code" and "No requirement drives them at practice scale"; in Naming, "because `Match` is reserved".
  - `[ADOPTED]` appears on 6 of 12 ADs with no stated meaning for the untagged ones.
- **Fix:** Move the rationale to the memlog. Either drop the tag or add a one-line legend.
