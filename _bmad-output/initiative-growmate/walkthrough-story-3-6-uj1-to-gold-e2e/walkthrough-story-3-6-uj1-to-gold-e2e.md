# Walkthrough — UJ-1 to Gold: a Silver Lock and a Gold Mentor's Accept pass end to end (story 3.6)

Target: commit `0df3b287` on branch `story/3-6-uj1-to-gold-e2e` — "test(e2e): UJ-1 to Gold, a Silver Lock and a Gold Mentor's Accept pass end to end". Not on main yet.

Current block: **none** — review complete, all blocks accepted

## Blocks

### [x] 1 — Intent (done)

From the story's plan file, [story-uj-1-to-gold-the-lock-and-a-gold-mentor-s-accept-pass-end-to-plan.md](../tickets/epic-stages-and-gold/tickets/story-uj-1-to-gold-the-lock-and-a-gold-mentor-s-accept-pass-end-to-plan.md), verbatim:

> **Problem:** Epic 3's journeys are only proven in pieces:
> - `take-bronze` covers Bronze.
> - `bronze-lock` covers Bronze's Lock and reopening.
> - `gold-pass` passes Bronze and Silver through the API.
>
> Nothing yet runs UJ-1 step 4 through the UI (Bronze, Silver failed once and retaken at once, then Gold), shows a Lock on a later Stage keeping the next Stage hidden, or shows a new Gold Mentor Accepting a Request (SM-2, epic R7).
>
> **Approach:** Add one Playwright spec with two tests, run on the seeded e2e stack. Both use fresh Employees and a run-tagged Course.
> 1. UJ-1 through the UI to Gold and Completed, then another Employee Requests the new Mentor, who Accepts.
> 2. A Silver Lock under the test clock: Gold stays hidden while Silver is Locked, and Take Silver comes back when the Lock ends.

Source: the story 3.6 plan's Intent section (verbatim); ticket 6 in the epic's tickets.toml says the same in one sentence.

### [x] 2 — Broad strokes (done)

One new Playwright spec with two tests, plus one helper moved so both specs can share it. No production code changes.

- [e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts:19](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L19-L23) — the header comment; the whole story in five lines.
- [e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts:76](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L76) — test 1, UJ-1 through the UI to Gold, then the new Mentor Accepts.
- [e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts:209](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L209) — test 2, a Silver Lock under the test clock.
- [e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts:32](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L32) — `takeInUi`, the local helper that takes one Stage through the UI; test 1 is mostly calls to it.
- [e2e/tests/support/helpers.ts:212](../../../e2e/tests/support/helpers.ts#L212) — `passStageThroughApi`, moved from gold-pass so test 2 can use it.

### [x] 3 — Taking Stages through the UI (done)

Test 1, first half. `takeInUi` clicks Take <Level>, answers the one question, submits, checks both the POST body and the on-screen status, then goes Back and returns the Stages read. Test 1 calls it four times: Bronze Yes, Silver No, Silver Yes straight away, Gold Yes, and asserts the Stages list after each, then the Completed bar on the Course page and Home.

- [uj-1-to-gold-and-the-gold-mentor.spec.ts:32-55](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L32-L55) — `takeInUi`.
- [uj-1-to-gold-and-the-gold-mentor.spec.ts:105-112](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L105-L112) — Bronze.
- [uj-1-to-gold-and-the-gold-mentor.spec.ts:114-124](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L114-L124) — Silver failed, retake offered, no Lock, no Gold.
- [uj-1-to-gold-and-the-gold-mentor.spec.ts:126-134](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L126-L134) — Silver retaken.
- [uj-1-to-gold-and-the-gold-mentor.spec.ts:136-155](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L136-L155) — Gold, progress completed, Home Learning row.

### [x] 4 — The new Gold Mentor Accepts a Request, SM-2 (done)

A fresh Employee opens the Course, finds the Learner in the Mentors list with a Request button, Requests them; the Learner (now a Mentor) Accepts from Requests. The Requester's bar reads In progress and the new Mentor's Home lists them under Mentoring.

- [uj-1-to-gold-and-the-gold-mentor.spec.ts:157-168](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L157-L168) — Mentors list.
- [uj-1-to-gold-and-the-gold-mentor.spec.ts:170-187](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L170-L187) — Request and Accept.
- [uj-1-to-gold-and-the-gold-mentor.spec.ts:189-200](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L189-L200) — both sides after Accept.
- [uj-1-to-gold-and-the-gold-mentor.spec.ts:202-203](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L202-L203) — sessions closed.

### [x] 5 — A Silver Lock under the test clock (done)

Test 2. Bronze is passed through the API; then at 2027-03-10T10:00Z two Silver failures through the API Lock Silver until 10 Apr. The API and the card show Locked, there is no link, Gold is hidden and its read returns 409. At exactly `locked_until`, Take Silver returns but Gold stays hidden until Silver is passed. The clock is cleared in `finally`.

- [uj-1-to-gold-and-the-gold-mentor.spec.ts:57-69](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L57-L69) — `failStageThroughApi`.
- [uj-1-to-gold-and-the-gold-mentor.spec.ts:71-74](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L71-L74) — `signInAgain`.
- [uj-1-to-gold-and-the-gold-mentor.spec.ts:206-207](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L206-L207) — the two instants.
- [uj-1-to-gold-and-the-gold-mentor.spec.ts:238-240](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L238-L240) — Bronze via API.
- [uj-1-to-gold-and-the-gold-mentor.spec.ts:242-264](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L242-L264) — Locked.
- [uj-1-to-gold-and-the-gold-mentor.spec.ts:266-291](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L266-L291) — Lock ends.
- [uj-1-to-gold-and-the-gold-mentor.spec.ts:292-294](../../../e2e/tests/uj-1-to-gold-and-the-gold-mentor.spec.ts#L292-L294) — `clearClock` in `finally`.

### [x] 6 — The shared passStageThroughApi helper (done)

The body of gold-pass's local `passThroughApi` moves unchanged into helpers.ts; gold-pass imports it instead.

- [e2e/tests/support/helpers.ts:212-223](../../../e2e/tests/support/helpers.ts#L212-L223) — the moved helper.
- [e2e/tests/gold-pass.spec.ts:1-16](../../../e2e/tests/gold-pass.spec.ts#L1-L16) — imports; [e2e/tests/gold-pass.spec.ts:51-53](../../../e2e/tests/gold-pass.spec.ts#L51-L53) — call sites.

### [x] 7 — Periphery (done)

- [deferred-work.md:43-45](../deferred-work.md#L43-L45) — the WSL clock flakiness entry, with owner and two fixes.
- [story-uj-1-to-gold-the-lock-and-a-gold-mentor-s-accept-pass-end-to-plan.md](../tickets/epic-stages-and-gold/tickets/story-uj-1-to-gold-the-lock-and-a-gold-mentor-s-accept-pass-end-to-plan.md) — the story's plan; status built, review: none.
