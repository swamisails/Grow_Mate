# Reconcile: design-thinking-2026-10-26.md vs PRD + addendum

Source: `_bmad-output/design-thinking-2026-10-26.md` (26 Oct 2026, the latest planning artifact before market research; market research on 30 Oct does not touch the points below).
Targets: `prd-growmate.md`, `addendum.md`. README excluded. Later artifacts override earlier ones.

Note: the session's IDEATE, PROTOTYPE, TEST and Next Steps sections are all "Not yet". Every decision below comes from the Design Challenge, EMPATHIZE and DEFINE sections.

## Gaps

### G1. The session treats the empathy-map pains as normal, and the PRD never says so
- **Source:** "The journey-map pains are the product working as decided. The empty middle, the click with no transcript, and Admin's bare yes or no are normal." The empathy map adds that the learner "Feels unsure the effort counts", the mentor "Feels the weight of a judgment the app cannot show", and Admin "Feels the decision is theirs alone."
- **PRD location:** absent as a statement. The principles in §1.1 ("The click is the record", "Admin is kept out on purpose") and FR-19 ("The half-blue bar doesn't change during a Match") imply it. Nowhere are the three pains named, and nowhere does the PRD say that designers must leave them in place.
- **Why it matters:** the FR structure covers behaviour but not the intent. A designer who meets these pains without that intent will "fix" them with check-ins, a note on Course Completed, activity indicators on the Match, or evidence fields on the Registration decision.
- **Fix:** add a §2.3 "Accepted pains (by design)" listing the three pains, each with its decided resolution: (1) the empty middle, where the Match looks unfinished while the talks happen elsewhere; (2) the readiness click, made from memory with no transcript behind it; (3) Admin's scoreless per-Course yes or no. State that each one is intended and must not be designed away. Point §1.1 to it.

### G2. "Quit is the only place a reason is written" is not enforced across the other actions
- **Source:** "Quit is the only place a reason is written. The request itself has no reason."
- **PRD location:** §1.1 says "The quit is the only place GrowMate asks for a reason", and FR-7 rules out a reason on Requests. FR-3 (Registration decision), FR-8 (Accept), FR-10 and FR-11 (Group assignment) and FR-14 (Course Completed) do not rule out a comment or reason field. FR-3 says only "with no score".
- **Fix:** add a guardrail in §8 or §5: "No free-text field exists anywhere except the Quit reason, including on Registration approve or refuse, Accept, Group assignment and Course Completed." Alternatively, add "no reason or comment" to FR-3, FR-8, FR-10 and FR-14.

### G3. "The match forgets whether it began as one request or as one of a group" exists only as a principle
- **Source:** "After Accept, the match forgets whether it began as one request or as one of a group."
- **PRD location:** §1.1 states it as a principle. No FR enforces it. FR-12 (Match screen) does not say the screen is identical whatever the Match's origin. §8 "Data kept" lists Mentor-route records but says nothing about the Match keeping any group link after Accept.
- **Fix:** add to FR-11 or FR-12: "After Accept, a Match keeps no link to its Group assignment. A Match from a group and a Match from a one-to-one Request look and behave the same for both parties." Add to §8: "Match records store no origin (Request or Group assignment) after Accept."

### G4. The point-of-view statements are not in the PRD
- **Source:** the three POV statements under DEFINE:
  - "A learner needs the live match to stay half blue, with no numbers, until the mentor clicks … that unchanged wait is normal."
  - "A mentor needs Course Completed to mean 'I judge this person ready for the assessment,' because that click is the record and it opens the assessment."
  - "Admin needs to approve some named registration courses and refuse others, with no score beside the decision, because the choice is theirs alone."
- **PRD location:** absent. §2.1 has JTBD lines that frame needs differently. The Mentor JTBD ("Help a colleague learn without a heavy tool, and pass on the course…") leaves out the readiness judgment, which is the mentor's central need in the session. The Admin JTBD ("get mentors onto the path") leaves out the per-Course yes or no that is "theirs alone".
- **Fix:** add the three POV statements to §2, after §2.1, or rewrite the Mentor and Admin JTBD to carry them. (See also D1: the addendum claims the POVs were used.)

### G5. The privacy of a registration refusal is unspecified
- **Source:** "A registration refusal is personal and uneven: some of a person's courses proceed, others do not, and gold is the only way back."
- **PRD location:** FR-3 covers the mechanics. The privacy list in §8 doesn't mention Registration decisions.
- **Fix:** add to §8: "A Registration refusal is visible only to that Employee and Admin. It never appears on Course Mentor lists, the Upskilling list or anywhere else."

### G6. The PRD never says outright that Admin's feature list is closed
- **Source:** "Admin does not gain features beyond the ones already decided." Constraint: "Admin limited to publishing courses, uploading bronze/silver/gold assessments and pass marks, the shared upskilling list, approving or refusing named registration courses, and assigning a group."
- **PRD location:** §1.1 "Admin is kept out on purpose" lists publish, upload, decide and assign, but leaves out the Upskilling list (which FR-20 gives Admin read-only) and doesn't call the list closed. §5 rules out only specific features. The addendum mentions "Admin's closed feature list" in passing only.
- **Fix:** in §1.1 or §5, state that Admin's capabilities are exactly these five: publish Courses, upload Assessments and Pass marks, view the Upskilling list, make Registration decisions, and assign groups. Any further Admin feature is out of scope by decision.

### G7. "Every mentor the same bar, including a person who just passed gold" is only partly covered
- **Source:** HMW: "How might we give every mentor the same bar, including a person who just passed gold?"
- **PRD location:** FR-6 hides the Mentor route on the Mentor list. FR-12 doesn't say the Match screen and bar are the same whatever the mentor's route or how new they are. Nothing rules out a "new mentor" marker.
- **Fix:** add to FR-12: "The Match screen and bar are identical whatever the Mentor's route or how recently they became a Mentor. There is no 'new mentor' marker."

### G8. The "empty grey" state after a Cancel is unclear
- **Source:** "The bar has no numbers: empty grey, half blue, full green, quit red."
- **PRD location:** FR-19 defines grey as "a Request is pending". FR-9 says that after a Cancel the Learner "returns to having no record for that Course". The PRD doesn't say what bar, if any, the Learner sees for a Course with no record.
- **Fix:** state in FR-19 whether "no record" shows as the empty grey bar or as no bar. Keep the session's four paints as the only visual states.

### G9. The PRD doesn't say how solid the session's evidence is
- **Source:** "Journey map, marked by Sitadevi.padala. These are not quotes from employees in the room." IDEATE, PROTOTYPE and TEST are all "Not yet".
- **PRD location:** absent. §7 metrics measure only the build. The addendum source map doesn't flag that the pains are the facilitator's assumptions and were never validated.
- **Fix:** add a line to the addendum source map, or a §9 open question, saying that the pains were marked by the facilitator and not observed in employees, and that no prototype or user test exists. Consider whether a later validation step is wanted.

## Distortions

### D1. The addendum says the PRD uses the design-thinking POVs, but it doesn't
- The addendum's §C source map says design-thinking was "Used for: Point-of-view statements, status colours, what the Learner sees on Accept." The PRD contains no POV statements, and its JTBD lines differ from them (see G4).
- **Fix:** add the POVs (G4), or correct the source-map row.

### D2. Group assignment gives a refused Course a second way back, contradicting "only gold"
- **Source:** "A refused course returns only if that person later chooses to pass gold."
- **PRD:** FR-3 agrees ("A refused Course can then be gained only by Gold pass"). FR-10 and FR-11, however, let Admin assign *any* Employee as a group's mentor, and Accept then makes them a Mentor under Group assignment accepted. Nothing excludes an Employee who was refused that Course. The PRD therefore contradicts itself as well as the source. (The session also says "assign a group to anyone", so the source holds the same tension.)
- **Fix:** resolve it explicitly. One option is to make FR-10 exclude, as mentor, an Employee refused for that Course. The other is to amend FR-3 to read "only by Gold pass or an accepted Group assignment" and record that the session's "only gold" sentence is overridden. Log the choice in §9 or the addendum.

### D3. The PRD defines half blue as "live" but keeps it after the Match ends
- **Source:** "Half blue means in progress." Learner POV: "stay half blue … until the mentor clicks". HMW: "hold a live match on the half-blue in-progress bar until the mentor clicks Course Completed or someone quits."
- **PRD:** FR-19 says half blue runs "from Accept until Gold is passed, including the Assessment stages" and then says "It means 'live', not 'half done'". FR-14 keeps the status at In progress after Course Completed, when no Match is live any more. Two problems follow. The PRD's own gloss ("live") doesn't fit its own range. And the bar's state after the click is a PRD decision, untagged, where the session's wording ("until the mentor clicks") suggests the click ends the half-blue period. Party mode and the extract already listed this as unspecified.
- **Fix:** use the session's word, "in progress", in FR-19 instead of "live". Tag the post-click state in FR-14 as `[ASSUMPTION]` or add it to §9.

### D4. Open Question 2 reopens a decision the session closed
- **Source:** Admin's "bare yes or no" is "normal". The Admin POV says "with no score beside the decision, because the choice is theirs alone."
- **PRD:** §9 Q2 asks "Does Admin need any guidance text?" and cites only the forge's "accepted, not solved". The later design-thinking session settled it as normal, and no later artifact reopens it.
- **Fix:** close Q2 and cite design-thinking, or reword it so it can't lead to a score, criteria or evidence beside the decision.

### D5. The group-assignment notification to Learners risks revealing the "door"
- **Source:** "The door that made the mentor (gold, registration approval, or Admin assignment) stays off that screen. After Accept, the match forgets whether it began as one request or as one of a group."
- **PRD:** FR-21 `[ASSUMPTION]` notifies "each Learner" of a Group assignment. The PRD doesn't say what that notification contains. It could reveal Admin's role, the other group members, or that the mentor came in through assignment. Separately, the new-Request text in FR-7 ("[Learner] wants you to guide them…") would be false for Requests that Admin created.
- **Fix:** define the Group assignment notification so it is neutral. It should not name Admin or the other Learners and should not imply the mentor's route. Make sure nothing on the Learner's screens refers to the group after Accept.

## Confirmed well-captured

- Talks stay outside the app: no chat, calls or Teams integration (§1, §1.1, §5, FR-12).
- Course Completed means "I judge this person ready" and opens Bronze directly (glossary, FR-14, addendum: Enable Assessment rejected).
- Silver and Gold stay hidden until the previous Stage is cleared (FR-16, FR-17).
- A live Match ends only on Quit or Course Completed, and the product never ends it (FR-15, §5).
- The bar has four colours and no numbers. Half blue doesn't mean halfway (FR-19, §4.7, addendum).
- On Accept, the Learner sees only "[Mentor] is your mentor for [Course]", and the route stays hidden (FR-8, FR-6).
- Requests carry no reason (FR-7, §5). Bronze and Silver grant nothing, and Gold is only the right to mentor (§1.1, FR-18).
- Registration decisions are made per Course, with no score. Approved Courses can be requested immediately, and a refused Course comes back via Gold (FR-3, UJ-3; but see D2).
- Group assignment can go to anyone, and one Accept covers the group (FR-10, FR-11).
- Admin is kept out of the Request and Match flow on purpose (§1.1, §5, FR-9, FR-21).
- The Upskilling list is a plain list of people, with no scores or ranking (FR-20).
- Success definition: matched, judged ready, Gold makes a Mentor, and Admin staffs via registration and groups. All of it is covered by SM-1 (UJ-1 to UJ-4), with SM-2 covering the Gold route.
