# Reconcile: PRD vs Brainstorm (24 Oct 2026)

Input: `brainstorm-growmate-product-plan/brainstorm.html` (authoritative closing report) and `.memlog.md` (running log, used only to tell final ideas from replaced ones).
Checked against: `prd-growmate.md` and `addendum.md`.
Later-wins rule applied: forge, party-mode and design-thinking (26 Oct) override the brainstorm. Items explained by that rule are not listed as gaps. They are noted under "Confirmed" where relevant.

## Gaps

### G1. Admin's feature set is a closed list ("Nothing more"), but the PRD doesn't say so
- **Source:** "Admin features are only these. Nothing more." The section is titled "Admin's closed hand". Design-thinking (later) keeps this: "Admin does not gain features beyond the ones already decided."
- **PRD:** §1.1 "Admin is kept out on purpose" lists what Admin does, but never says the list is closed. §5 Non-Goals lists specific exclusions only. The addendum mentions "Admin's closed feature list" only as the reason the calendar was rejected.
- **Fix:** Add a guardrail to §1.1 or §5: "Admin's capabilities are exactly: publish Courses, upload Assessments and Pass marks, view the Upskilling list, make Registration decisions, assign Groups. Any new Admin capability needs a PRD change." Also check that §8's `[ASSUMPTION]` (Admin sees Mentor routes) doesn't quietly add a seventh capability.

### G2. The mentor's incoming Request screen and its exact wording aren't specified
- **Source:** "The mentor sees one line: '[Learner name] wants you to guide him with [Course name]', and an Accept button." "That one sentence plus Accept. No reason, no reject, and the course name is the only subject."
- **PRD:** FR-7 gives the text only as a *notification* ("The Mentor is notified: ..."). FR-8 says "No other response exists." No FR covers the Request view itself: the one sentence, the single Accept button, and nothing else (no Learner profile, no message, no Reject).
- **Fix:** Add an FR, or extend FR-8: "The Mentor's view of a pending Request shows exactly the sentence '[Learner] wants you to guide them with [Course].' and one **Accept** button. Nothing else is shown." Group Requests use the same view, as in the brainstorm's group diagram.

### G3. The button label "Quit Course" is lost
- **Source:** "Student sees only Quit Course. Mentor sees Course Completed and Quit Course." The diagrams label the buttons "Quit Course" on both sides.
- **PRD:** FR-12 names the action **Quit**. The glossary term is "Quit". The user-facing label "Quit Course" appears nowhere.
- **Fix:** In FR-12, keep "Quit" as the glossary term but say the button label is "Quit Course". Do the same for the label "Course Completed", which the PRD already uses correctly.

### G4. "The stages belong to the course, not the match" is missing, and it would answer Open Question 5
- **Source:** "The stages belong to the course, not the match. Course Completed reveals bronze only."
- **PRD:** absent as a stated rule. FR-16 and FR-17 are written per Learner but don't say Stage progress, attempts and Locks persist across Matches. Open Question 5 asks what happens if a Learner in a Lock requests a new Mentor.
- **Fix:** Add to §4.6: "Stage progress, attempts and Locks belong to the Learner–Course pair, not to a Match. A new Match doesn't reset or re-gate them." Then resolve OQ5 using that rule.

### G5. The second attempt is "immediately" available, but FR-17 doesn't say so
- **Source:** "A learner who fails a stage can retake once immediately."
- **PRD:** FR-17 says "two attempts" with no timing. Only UJ-1 says "retakes it straight away".
- **Fix:** FR-17: "After a first failure, the second attempt is available immediately, with no wait."

### G6. "A mid-course quit is not a failure" isn't reflected in how a Mentor-initiated Quit is shown
- **Source:** "A mentor quitting mid-course is normal. A new mentor comes and they talk." "A mid-course quit is not a failure. GrowMate does not preserve the old talks, and it does not block the next match."
- **PRD:** FR-13 sets the Learner's status to **Quit (red)** whichever party quits. So a Learner whose Mentor walks away is painted red. §1.1 "Quitting is normal" captures the principle, but the status rule works against it when the Mentor is the one who leaves.
- **Fix:** Decide explicitly, and tag it `[ASSUMPTION]` until confirmed. Either keep red for both cases and add a line that red means "this Match ended", not failure, or show red only when the Learner quits. Also make sure no copy uses "failed" or "rejected" for a Quit.

### G7. Quit reasons are missing from the "Data kept" list
- **Source:** "The quit acknowledgement includes a reason." "Whoever quits writes the reason, and that reason is the body of the notice the other person receives." There is also the coach's benefit line, "the reason stays on the record".
- **PRD:** §8 "Data kept" lists pairings, Progress statuses, Assessment attempts and results, and Mentor-route records. It omits Quit reasons and notifications, but §8 Privacy and FR-13 both depend on storing the reason.
- **Fix:** Add "Quit reasons (visible only to the other party) and in-app notifications" to §8 "Data kept". FR-13 should also say whether a blank reason is allowed. The brainstorm requires a reason but puts no rule on its content: "write whatever you want ... There is no required sentence."

### G8. "Nothing else is added to the record" after Gold isn't squared with stored Assessment results
- **Source:** "Eligible to mentor this course. Nothing else is added to the record." "After gold, nothing else stays on the learner's record." "The board lost its scores." Points were dropped: "The picture they then called fine does not score the stages."
- **PRD:** FR-18 bans badges and similar rewards. But §8 stores "Assessment attempts and results", and nothing says whether a score is ever shown to anyone, including the Learner.
- **Fix:** In §8 or FR-17, state: "Attempts and results are kept only to enforce the Retake rule and Pass marks. No score or points are shown on any profile, list or record. The Learner sees only pass or fail." `[ASSUMPTION]` on whether the Learner sees their own score.

### G9. A group can be accepted only as a whole, but the PRD doesn't rule out partial acceptance
- **Source:** "Waiting on one Accept. Not one Accept per person." "There is not a separate accept per person."
- **PRD:** FR-11 says "The chosen Employee *can* Accept the whole group with one Accept". That doesn't exclude Accepting some Learners and not others.
- **Fix:** FR-11: "A Group assignment is Accepted only as a whole. There is no per-Learner Accept. Until Accept, all of the group's Requests share one clock (FR-9)."

### G10. The addendum's rejected-alternatives table is missing two brainstorm rejections
- **Source (set down):**
  1. The Mentor-approved stop: "To stop, the learner informs a reason and waits for the mentor to approve." The brainstorm notes: "They did not keep an approved stop." The earlier rule "the mentor cannot drop out until every test and badge is done" was replaced the same way.
  2. The no-mentor path: "Experienced people taking the Gold badge exam do not need a mentor." This was set down, and Bronze appears only after Course Completed, "Not before."
- **PRD:** absent from addendum §A.
- **Fix:** Add both rows. The second matters because readers will ask why an expert can't go straight to Gold. The answer is the Registration route (forge) plus "Bronze appears when the mentor clicks Course Completed. Not before."

## Distortions

### D1. The PRD maps "Completed (green)" to Gold pass and states it as fact, but the brainstorm left this open
- **Source:** "Both see status Not yet started, in progress, Completed, or rejected ... Completed is full green." The status shares its name with the Mentor's **Course Completed** button, and the brainstorm never ties green to Gold. The PRD's own extract (`extract-inputs.md`, line 194) records this as unresolved. Design-thinking (later) talks about holding half-blue "until the mentor clicks Course Completed or someone quits", which reads as the click ending half-blue.
- **PRD:** FR-14 says "The Learner's Progress status stays In progress". FR-18 and FR-19 say Completed means Gold passed. Neither is tagged `[ASSUMPTION]`, and the point isn't in §9.
- **Fix:** Tag FR-14, FR-18 and FR-19's mapping as `[ASSUMPTION]` and add it to §9. Alternatively, define what the bar shows between Course Completed and Gold pass, since the half-blue bar is defined as meaning "live" and the Match has ended by then.

### D2. The "Not yet started" state is narrowed, and a stateless "no record" state is invented
- **Source:** "Not yet started is empty grey." This is the first of four bar states. A Request that dies on day 6 "is a cancel, not this bar."
- **PRD:** FR-19 says grey means only "a Request is pending". FR-9 adds a fifth, undefined state ("returns to having no record") with no display rule. So a Course the Learner never touched, and a Course after a Cancel, show nothing, while a pending Request shows "Not yet started".
- **Fix:** Define what a Learner sees on a Course with no Request or Match: either grey "Not yet started" or no bar. Make the Cancel rule refer to that state.

### D3. Mentor capacity: "any number of live Matches" is stated as fact, while FR-13 implies a limit
- **Source:** "The mentor is free for the next learner immediately." "When the mentor accepts a stop, they become available for the next learner." The user asked "how a new learner can be accepted without waiting for the old course to finish". Group assignment does give one Mentor many Matches, so the brainstorm doesn't fix a cap, but its wording assumes availability is a thing.
- **PRD:** FR-8 says "A Mentor may hold any number of live Matches" with no `[ASSUMPTION]` tag. FR-13 still says "The Mentor is immediately available for new Requests", which means nothing if there is no cap. §5 bans a "capacity setting".
- **Fix:** Tag FR-8 `[ASSUMPTION]` and drop or reword the FR-13 bullet. For example: "Quitting has no effect on whether the Mentor can receive Requests."

### D4. "Locked" and "hidden" are conflated in FR-16
- **Source:** The brainstorm separates the two. The current Stage in its one-month wait is *locked* ("This stage stays locked."). The Stages after it are *hidden* ("Silver stays hidden.").
- **PRD:** FR-16 says "A Stage that is still locked out isn't shown." That uses "locked" for a Stage not yet reached, which clashes with the glossary term **Lock** (the one-month wait). FR-17 uses Lock correctly.
- **Fix:** FR-16: "A Stage not yet reached is hidden. A Stage under a Lock stays visible as locked, and the Stages after it stay hidden."

### D5. The Upskilling list gains columns the brainstorm explicitly excluded
- **Source:** "The leaderboard is just a list of employees who are upskilling. Nothing more." The final picture shows rows reading only "an employee". Design-thinking (later) says "keep the shared upskilling list as a list of people who are upskilling."
- **PRD:** FR-20 shows "name, the Course and the status" on each row.
- **Fix:** Decide whether Course and status count as "more". If they stay, tag them `[ASSUMPTION]`. Otherwise reduce FR-20 to names only. "No actions, no scores, no ranking" is already right.

### D6. "In-app only, no email" is credited to the sources
- **Source:** The brainstorm specifies "an in-app reminder" and "an in-app acknowledgement". It never forbids email. The README's "notifications" line is excluded.
- **PRD:** §4.8 says "There is no email or other channel." §6.2 says "because the sources specify in-app only."
- **Fix:** Reword §6.2 to "the sources specify in-app channels and never mention email" and tag it `[ASSUMPTION]`. Alternatively, record it as a decision of this PRD.

### D7. Gendered strings are changed but kept in the open questions (minor, already flagged)
- **Source:** "[Learner name] wants you to guide him with [Course name]". The user also said: "Ignore small wording questions."
- **PRD:** FR-7 uses "guide them". Open Question 4 asks for confirmation.
- **Fix:** None needed beyond OQ4. This is listed only because it changes exact text users see.

### D8. The addendum credits "no in-app chat" to party mode
- **Source:** The brainstorm already decided it: "All conversation happens outside the app. No chat in GrowMate." "Where the conversation happens is out of scope. It will happen in Teams or somewhere else."
- **PRD:** Addendum §A: "In-app chat | Party mode: refused." Source map §C lists "no chat" under party-mode.
- **Fix:** Credit the decision to the brainstorm, and to party mode as confirmation.

## Confirmed well-captured

- The core loop and its name: "match-and-proof loop", "The course outlives the mentor", and talks outside the app (§1, FR-12, §5).
- The Request clock: day 0, 3 and 6 only, quiet days empty, reminder to both, Cancel to both, never called a rejection, Admin out of it, no nagging (FR-9, §1.1).
- Bare Request with no reason and no Reject (FR-7, FR-8, §5, addendum §A).
- Quit by either party, no approval, immediate, free-text reason as the body of the notice, the only place a reason exists, re-request allowed (FR-13, §1.1).
- Course Completed belongs to the Mentor alone, the Learner can't open the Assessment early, and the "Enable Assessment" step is dropped (FR-14, addendum).
- Three sequential Stages, Admin-set Pass marks, and Bronze and Silver giving nothing of their own (FR-5, FR-16, FR-18).
- The Retake cycle: two tries, then a one-month Lock, then two tries again, repeating and never dropping to one (FR-17).
- Gold is permission, not a prize: no badge, certificate or résumé line, and no points (§1.1, FR-18, §5).
- A plain bar with no numbers in grey, half blue, green and red. Half blue means "live" (FR-19).
- The leaderboard reduced to a shared Upskilling list with no rank and no actions (FR-20, addendum).
- Group assignment: the same flow as a one-to-one Request, one Accept, independent Matches afterwards, and "the match forgets how it started" (FR-10, FR-11, §1.1).
- Rejected ideas: verification with criteria and appeals, calendar, suspension, the day-6 extras, and the Reject flip-flop (addendum §A).
- Later-wins items correctly applied:
  - Three Mentor routes replace Gold-only (forge).
  - The Accept line is reduced to "[Mentor] is your mentor for [Course]", dropping "He accepted your request" (design-thinking).
  - Registration yes or no is per Course (forge).
  - No timer ends a Match (forge).
