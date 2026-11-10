# Reconcile: party-mode (26 Oct 2026) vs PRD + addendum

Source: `_bmad-output/party-mode/memories/installed/.memlog.md` (11 entries).
Checked against: `prd-growmate.md`, `addendum.md`. The README is excluded. Where party mode conflicts with design-thinking (26 Oct 2026, later), design-thinking wins. Those cases are marked.

## Gaps

### G1. No explanatory line on the Learner's screen (high)
- **Source:** "the learner's screen stays a plain unfinished bar until the mentor clicks Course Completed. **No line that says the mentor is the record.**"
- **PRD:** absent as a requirement. §1.1 has the principle "The click is the record", but FR-12 (Match screen) and FR-19 (bar) never forbid helper copy. A designer could reasonably add "Waiting for your mentor to mark you ready" and still meet every FR.
- **Fix:** add a bullet to FR-12 or FR-19: "The Learner's Match screen shows no explanatory text, hint or waiting message about the Mentor's click or what the Mentor decides. It shows only the bar, the Mentor's name, the Course and Quit."

### G2. Winston's overruled "lamp" isn't recorded (high)
- **Source:** "Sitadevi overruled Winston's lamp ... The bar stays plain and unfinished until Course Completed."
- **PRD:** absent. Addendum §A lists only "Reading the half-blue bar as 'halfway done'". It doesn't list the lamp itself, meaning an extra live or activity indicator on the bar. FR-19 says nothing against added indicators.
- **Fix:** add an addendum §A row: "A 'lamp' or live indicator beside or on the bar (Winston). Overruled by Sitadevi in party mode: the bar stays plain." Add to FR-19: "The bar has no other indicator, such as a lamp, pulse, animation, activity signal or timestamp."

### G3. "The empty middle is normal" is missing as a principle (high)
- **Source:** "the learner sitting on an unchanged half-blue bar for the whole match is normal, the same way a mid-course quit is normal." / "Learner wait, mentor click, and Admin's bare yes/no are all ordinary." / Takeaway: "the empty middle, the click, and Admin's scoreless list are normal." (Design-thinking repeats this: "The journey-map pains are the product working as decided.")
- **PRD:** partial. §1.1 makes "Quitting is normal" and "Silence is a finished outcome" principles, but not the empty middle or the Learner's wait. FR-19 says the bar "doesn't change" but not that this is intended rather than a gap to fill. "A bare yes/no is ordinary" appears only in the addendum source map (§C).
- **Fix:** add a §1.1 principle, for example: "**The empty middle is normal.** During a Match nothing changes on screen, and no nudges, check-ins, progress prompts or 'still going?' messages exist. The Learner's wait, the Mentor's lone click and Admin's bare yes/no are the product working as decided, not gaps to fix." Optionally add a counter-metric for in-Match engagement signals.

### G4. The pains and the unconceded dissent aren't recorded as accepted costs (medium)
- **Source:** "learner and mentor hurt because talks stay outside GrowMate; Admin hurts when splitting named courses with no score. Sally wants the gap felt; Winston refuses to build chat." / "Sally did not concede the hallway."
- **PRD:** absent. The addendum lists in-app chat as rejected, but not the named hurts, and not that Sally (UX) did not concede. Without this, downstream UX work may try to "fix" the hallway gap.
- **Fix:** add an addendum section "Accepted costs and open dissent". It should list the three hurts, record that they were accepted as normal, and note that Sally did not concede the hallway point. This shows UX that the question was argued and closed by the user, not overlooked.

### G5. Same bar for every Mentor, including a new Gold-pass Mentor (medium)
- **Source:** "a person who passes gold and then mentors gets the same unchanged half-blue bar for the whole match." / "Every mentor gets the same half-blue bar."
- **PRD:** only implied. §1.1 says that nobody is shown the route, and FR-6 hides the route in the Mentor list. FR-19 doesn't state that the bar looks identical whatever the Mentor's route, newness or experience. FR-12 doesn't say that the Mentor sees that same bar.
- **Fix:** add to FR-19: "The bar looks the same in every Match, whatever the Mentor's route, and whether or not the Mentor just passed Gold. The Learner and the Mentor see the same bar."

### G6. "The door is not shown" holds only for the Mentor list (medium)
- **Source:** "learner sees only 'He accepted your request. [Mentor name] is your mentor for this [Course].' The door is not shown." / "Learner sees name and course only."
- **PRD:** FR-6 and §1.1 cover it, and FR-8 says "sees only". But FR-12 (Match screen) doesn't explicitly exclude the route. FR-21's `[ASSUMPTION]` Group-assignment notification to each Learner shows that Admin assigned them. When the chosen Employee isn't yet a Mentor, that tells the Learner the door, and the Learner also learns the Match began as part of a group. Design-thinking says "the match forgets whether it began as one request or as one of a group."
- **Fix:** add to FR-12: "Neither party is shown the Mentor route or whether the Match came from a Request or a Group assignment." Reword or drop the FR-21 Learner-side Group-assignment notification so that it doesn't reveal assignment origin. If it stays, add it to §9 as an open question.

### G7. "No numbers on screen" sits only in prose (low)
- **Source:** "Recorded bar, from the brainstorm: no numbers on screen."
- **PRD:** in the §4.7 description ("no numbers or percentages") but not in FR-19's testable bullets.
- **Fix:** add a bullet to FR-19: "The bar shows no numbers, percentages, counts or Stage markers."

## Distortions

### D1. Half blue is glossed as "live" rather than "in progress" (high)
- **Source:** "Half blue is the in-progress paint, not a claim the course content is halfway done." / "treats half-blue as the in-progress paint for the whole live match." Design-thinking: "Half blue means in progress."
- **PRD:** FR-19 says "It means 'live', not 'half done'". Addendum §A says "half blue means 'live'".
- **Problem:** "live" is close to the framing of the overruled lamp. It also contradicts the PRD itself. FR-19 keeps half blue "including the Assessment stages", but FR-14 ends the Match at Course Completed, so half blue is then shown on a Match that isn't live.
- **Fix:** replace "live" with "In progress" in FR-19 and in addendum §A.

### D2. What the bar does after Course Completed is a silent PRD choice (medium)
- **Source:** "the learner's screen stays a plain unfinished bar **until the mentor clicks Course Completed**". Design-thinking: half blue "until the mentor clicks Course Completed or someone quits".
- **PRD:** FR-19 keeps In progress (half blue) from Accept until Gold is passed. FR-14 says "The Learner's Progress status stays In progress." This was a gap-default in the PRD session, but it isn't tagged `[ASSUMPTION]`, and both sources frame Course Completed as the end point of the unchanged bar.
- **Fix:** tag the half-blue span in FR-19 and the FR-14 bullet `[ASSUMPTION]`, and list them in §10. Add a §9 question: "What does the bar show between Course Completed and a Gold pass, or during a Lock?"

### D3. Open Question 2 reopens what party mode settled (medium)
- **Source:** "Admin's registration list needs no score. Matches the forge lock. ... Admin's bare yes/no are all ordinary." Design-thinking: "with no score beside the decision, because the choice is theirs alone."
- **PRD:** §9 OQ2 says "The Registration decision has no evidence standard. ... Does Admin need any guidance text?" It cites the forge's "accepted, not solved". The forge is earlier, and under later-wins, party mode and design-thinking closed this as normal.
- **Fix:** remove OQ2, or recast it as settled: "No score, criteria or guidance by design (party mode, design-thinking)." Optionally move it to the addendum's rejected list as "Guidance or evidence standard for Registration decisions".

### D4. The Accept line is shortened without a record (low; justified by the later artifact)
- **Source:** "learner sees only 'He accepted your request. [Mentor name] is your mentor for this [Course].'"
- **PRD:** FR-8 has "[Mentor] is your mentor for [Course]." It drops "He accepted your request." and "this".
- **Assessment:** design-thinking (later) says "one line: the mentor's name and the course", so the PRD follows the winning source, and the change also removes the gendered "He". The change isn't recorded, though, and OQ4 covers only the Request wording.
- **Fix:** add an addendum note that the brainstorm/party-mode line was reduced to one line under design-thinking, with "He accepted your request." dropped (also the gender issue).

### D5. "rejected" is relabelled "Quit" without a record (low)
- **Source:** "Status words were Not yet started, in progress, Completed, rejected" alongside "Quit red".
- **PRD:** glossary and FR-19 use "Quit". FR-9 forbids "rejected". This fits design-thinking ("quit red") and the no-Reject principle, but it isn't recorded as a resolution.
- **Fix:** add an addendum §A row: "Status label 'rejected': replaced by Quit, since no Request is ever rejected (day 6 is a Cancel)."

## Confirmed well-captured

- **No chat:** §1.1 "The click is the record", FR-12 ("no chat, call or file sharing"), §5 Non-goals, §8 (no talk content stored), and addendum §A (in-app chat refused, with the party-mode quote).
- **Bar colours and states:** grey, half blue, green and red with no numbers (§3, §4.7, FR-19). The bar is unchanged during a Match (FR-19), and the "halfway done" reading is rejected (FR-19, addendum).
- **Course Completed opens the assessment:** FR-14 and FR-16, with no separate enable step (addendum).
- **Admin's bare, scoreless, per-Course yes/no:** FR-3 ("separately and with no score"), §5, and the addendum (the per-Course decision, no criteria or appeals).
- **What the Learner sees on Accept:** "only" the Mentor and the Course (FR-8). The route is hidden in the Mentor list (FR-6) and by the §1.1 principle "the match forgets how it started".
- **What the Mentor sees:** FR-12 (name, Course and status, plus Course Completed and Quit).
- **Mid-course Quit is normal:** §1.1 and FR-13.
- **No auto-ending:** FR-15.
- **Source map:** party mode is listed with the right date and scope (addendum §C).
