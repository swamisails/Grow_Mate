# PRD Quality Review — GrowMate

## Overall verdict
This is a tight, opinionated PRD for a practice project. Its thesis is clear ("the course outlives the mentor", with the mentor pool growing from Gold passes), its principles are concrete enough to work as requirements, and its non-goals and rejected alternatives are honest. The risk is in done-ness. The Progress status state machine (FR-9, FR-13, FR-19) has gaps and one contradiction. The Assessment format (OQ3) is undefined, and three of the core-loop FRs depend on it. Fix those two and an engineer could build the whole loop from this document.

## Decision-readiness — strong
Decisions are stated as decisions. The six product principles in §1.1 ("Gold is permission, not a prize", "Silence is a finished outcome", "Admin is kept out on purpose") are firm, and each one traces to concrete FRs and non-goals. The addendum's rejected-alternatives table (Addendum §A) records what was given up and why, including the Reject button that was "offered, removed, re-added, then removed again".

The Open Questions are real. OQ1 openly sets the decided one-month Lock against market evidence (14-day certification waits and scarce mentors) and keeps the decision visible instead of quietly changing it. OQ5 reads like a confirmation, but it points at a real hole, covered under Done-ness. OQ4 (gender-neutral wording) is trivial and could be closed outright.

### Findings
- **low** No `[NOTE FOR PM]` callouts (§9, §4.3) — The PRD's biggest live tension, the strict Lock against mentor scarcity, sits only in OQ1. Supply cost ("Each gate on Mentor supply has a cost", Addendum §B) is never connected to FR-3 or FR-17 in the body. That is acceptable at these stakes, but a single callout at FR-17 would make the tension visible where it bites. *Fix:* add a `[NOTE FOR PM]` at FR-17 that points to OQ1.

## Substance over theater — strong
Nothing here is furniture. The Vision (§1) is a six-step mechanism specific to this product and couldn't be swapped into another mentoring PRD. The JTBD entries in §2.1 are short, and each role drives FRs. Including the "Builder (practice)" job is honest and matches the success metrics. There is no NFR boilerplate and no differentiation section written to fill a template slot.

### Findings
- **low** Counter-metrics are guardrails, not metrics (§7 SM-C1, SM-C2) — "SM-C2: Admin insight into Matches" can't be measured in a test run, and the claim that it "counterbalances SM-1" doesn't follow, because SM-1 is about loop completion, not visibility. SM-C1 makes sense as a do-not-optimise note. *Fix:* reword them as "do-not-optimise guardrails", or drop SM-C2, since §8 and §5 already enforce it.

## Strategic coherence — strong
The thesis is explicit: a match-and-proof loop where passing Gold turns a Learner into a Mentor. Features serve that arc in order: Courses (§4.2), Requests (§4.3), Match (§4.5), Stages (§4.6), then Gold back into the Mentor list. SM-2 ("becomes a Mentor through Gold pass and then Accepts a Request") validates the thesis itself, not just activity. The scope is an experience/problem-solving MVP, and that logic holds: everything outside the loop is cut (§5, §6.2).

No findings.

## Done-ness clarity — adequate
Most FRs carry crisp, testable bullets. Examples are FR-1 "An email already in use is refused", FR-7 "at most one pending Request or live Match per Course", FR-11 "One Match is created per Learner", and FR-17's never-drops-to-one-attempt rule. There are no "gracefully" or "user-friendly" adjectives. The weaknesses are concentrated in two places: the Progress status lifecycle, and the Assessment mechanics that the second half of the loop depends on.

### Findings
- **high** Progress status lifecycle has a contradiction and unhandled transitions (§3 Progress status, FR-9, FR-13, FR-19, OQ5) — The glossary says Progress status is one of four values. FR-9 introduces a fifth, "having no record for that Course", and says the status "returns to" it after a Cancel. That is undefined when the previous status was Quit (Quit → new Request → Cancel: red or nothing?). FR-7 and OQ5 allow a new Request after Course Completed. FR-19 then makes the status "Not yet started (grey): a Request is pending", which would turn a Learner who is mid-Assessment and "In progress … including the Assessment stages" back to grey. A Learner who abandons Assessments stays "In progress" forever, with no exit action, so they remain on the Upskilling list (FR-20) indefinitely. FR-13 also turns the *Learner* red when the *Mentor* quits (UJ-2: Priya goes red because Rafi moved teams). That sits uneasily with "Quitting is normal". *Fix:* add a short state table to FR-19 (state × event → state) covering Request, Accept, Cancel, Quit (either party), Course Completed, Gold pass and new-Request-after-Course-Completed. Resolve OQ5 inside it, and either add "No record" to the glossary or define Cancel as restoring the previous status.
- **high** Assessment format and scoring undefined, so FR-5, FR-16 and FR-17 can't be finished (§9 OQ3, §6.1 "Assessments taken in-app") — Bronze/Silver/Gold, Pass marks, attempts and Locks all depend on knowing what an Assessment is and how a score is compared with the Pass mark. OQ3 admits this is "needed before architecture". At practice stakes, a default is better than a blocker. *Fix:* choose a minimal default, such as "an Assessment is a set of multiple-choice questions; the score is percent correct; Pass mark is a percentage". Tag it `[ASSUMPTION]` and keep OQ3 open for later revision.
- **medium** Time semantics for day 3, day 6 and one month are unstated (FR-9, FR-17, §3 Lock) — It isn't stated whether "day 3" means 72 hours after sending or the third calendar day, which timezone applies, or whether one month is 30 days or a calendar month counted from the second failure. Tests can't assert the boundaries without this. *Fix:* one line each, e.g. "measured from the Request's sent timestamp, in 24-hour periods" and "Lock lasts 30 days from the second failed attempt".
- **medium** Group assignment collides with FR-7's constraints (FR-10, FR-11) — FR-10 lets Admin pick "one or more Employees as Learners" and "any Employee as the mentor". It doesn't say what happens when a chosen Learner already has a pending Request or live Match for the Course (FR-7 forbids a second one), when a chosen Learner is already a Mentor for it (FR-7 assumption), or when the chosen mentor is also in the Learner set. *Fix:* add a bullet to FR-10 saying ineligible Learners are excluded or the assignment is refused, and that the chosen Employee can't be one of the Learners.
- **medium** Learner can't withdraw a pending Request, and the PRD doesn't say so (FR-7, FR-9, §5) — The only way out of a pending Request is the day-6 Cancel. FR-7 allows one pending Request per Course, so a Learner who picked the wrong Mentor is stuck for six days. This may be intended under "Silence is a finished outcome", but it reads as an omission. *Fix:* either add a Learner-side withdraw to FR-7, or list "no Request withdrawal" in §5.
- **low** Course lifecycle after publishing isn't covered (FR-4, FR-5) — Nothing says whether Admin can edit, unpublish or change a Pass mark once Learners have attempts against it. *Fix:* add "Published Courses can't be edited or unpublished in MVP" to §5, or define the edit rule.
- **low** Admin's place to make Registration decisions is unspecified (FR-3) — There is no pending state or queue for Mentor checks awaiting a decision, and nothing says what the Employee sees meanwhile. *Fix:* one bullet saying undecided Courses are pending, listed for Admin, and the Employee isn't a Mentor until approval.
- **low** Account basics missing (FR-1) — There is nothing on sign-out, password reset or minimum password rules. That's fine for practice, but say so. *Fix:* add "no password reset in MVP" to §6.2, or add a bullet to FR-1.

## Scope honesty — adequate
§5 Non-Goals does real work. Each item maps to a rejected alternative in Addendum §A, and the deliberate omissions (badges, certificates, Reject button, chat) are explicit, not implied. All six inline `[ASSUMPTION]` tags are indexed in §10, and the open-items density (5 OQs and 6 assumptions) is fine for a practice PRD. Scope honesty is held back by the silent omissions listed under Done-ness (Request withdrawal, Course editing, account recovery) and by one privacy tension that isn't acknowledged.

### Findings
- **medium** Upskilling list partly exposes Matches to Admin (FR-20 against §1.1 "Admin is kept out on purpose" and §8 "Requests and Matches are invisible to Admin") — FR-20 lets Admin view every Employee whose status is In progress, by Course. Because In progress starts at Accept, Admin can infer who is in a live Match on which Course. That may be acceptable, but it is an unacknowledged exception to a stated guardrail. *Fix:* either acknowledge the exception in §8, or hide the Upskilling list from Admin.

## Downstream usability — strong
The glossary (§3) is thorough, and capitalised domain nouns (Request, Match, Quit, Course Completed, Mentor route) are used consistently across FRs and UJs. FR-1 to FR-21 and UJ-1 to UJ-4 are contiguous and unique, and every "Realizes UJ-n" and FR cross-reference in FR-21 resolves. Every UJ has a named protagonist carrying inline context (Priya, Rafi, Sam, Noor). Feature sections stand alone well enough for story extraction.

### Findings
- **medium** SM-1 overclaims what it validates (§7 SM-1) — "completes UJ-1 to UJ-4 … This validates FR-1 to FR-21". No UJ exercises a Lock (FR-17's second failure), the Upskilling list (FR-20) or a Match without a timer (FR-15). A one-month Lock can't run in a test without clock control. *Fix:* list the FRs SM-1 actually covers, and add "with a controllable clock" plus an explicit Lock scenario, or narrow the claim.

## Shape fit — strong
The shape matches a multi-role, practice-scale web product. UJs carry real weight, because the Request clock, Quit and group flows are clearest as stories. The PRD avoids over-formalisation: there is no NFR section padding out a practice build, and the SMs are honestly operational ("a seeded test run") instead of pretend business KPIs. Platform (web only, desktop) and source exclusions (README) are stated up front.

No findings.

## Mechanical notes
- **Glossary drift — "locked" vs Lock:** FR-16 says "A Stage that is still locked out isn't shown", meaning not yet unlocked. That collides with the glossary term **Lock** (the one-month bar). Use "not yet unlocked" in FR-16. FR-17's "later Stages stay hidden" is already implied by FR-16. That's harmless, but it's redundant.
- **Undefined state:** "having no record for that Course" (FR-9) isn't a glossary Progress status (see the high finding above).
- **Lowercase "mentor":** FR-10 says "any Employee as the mentor". This is deliberate, because the person isn't yet a Mentor, but a short note would stop downstream readers from treating it as drift.
- **Redundant consequence:** FR-13 says "The Mentor is immediately available for new Requests", but FR-8 already allows unlimited Matches, so nothing ever made them unavailable. Consider deleting it or rewording it to "remains on the Course Mentor list".
- **Assumptions Index roundtrip:** clean. There are 6 inline tags and 6 index entries, and they match one-to-one.
- **ID continuity:** FR-1 to FR-21, UJ-1 to UJ-4, SM-1, SM-2, SM-C1 and SM-C2 have no gaps or duplicates. Addendum §B's reference to "PRD Open Question 1" resolves.
- **Required sections:** all present for practice stakes. The absence of an NFR section is appropriate.
