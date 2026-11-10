---
type: epic
title: "Learners get a Mentor and are judged ready"
parent: initiative-growmate
covers: [R7, R8, R9, R12, R13, R14, R15, R20, R21, R22]
sources: []
companions: []
after: []
refined: false
risk: high
---

# Learners get a Mentor and are judged ready

## Description

A Learner picks a Mentor from a Course's Mentor list (built in epic 1) and sends a Request. The Mentor Accepts, and the day-3 reminder and day-6 Cancel run on a controllable clock. Either party can Quit, and the Mentor clicks Course Completed to unlock Bronze. This is the heart of the match-and-proof loop. Its time rules and status changes are the least certain part of the initiative, so it carries the highest risk.

## Outcome

A Learner is matched, judged ready and handed Bronze on the deployed app. Every status shows on the plain bar and the Upskilling list.

## Done when

- A Learner requests a listed Mentor, and the Mentor sees only the one-line Request with an Accept button. Accept creates a Match and sets In progress.
- On the clock, an un-Accepted Request sends one reminder to both parties on day 3 and is Cancelled on day 6. The Learner is left with no Progress status, and Admin receives nothing. Tests drive the clock without waiting real time.
- Either party Quits with a reason, which the other receives. The Learner shows Quit (red) and can request again. No timer ends a Match.
- Course Completed ends the Match, unlocks Bronze and notifies the Learner. Learner-side refusals (R7) hold.
- The bar shows Not yet started, In progress and Quit with no numbers or signals. The Upskilling list shows In progress Employees. All of this is verified end to end on the deployed app.

## Boundaries

- In:
  - Requests and their refusals, Accept, and the day-3/day-6 clock;
  - the Match screen, Quit and Course Completed;
  - Progress status and the bar (Not yet started, In progress, Quit), and the Upskilling list;
  - the R22 notices for new Request, Accept, day 3, day 6, Quit and Bronze available.
- Out: the Course Mentor list (epic 1). Taking Assessments, the Retake rule and Completed (epic 3). Group assignment (epic 4).
- Hands to epic 3: Course Completed unlocking Bronze, the Progress status model, and the clock.
- Hands to epic 4: Requests under the clock, Accept, and Matches.
- Must not change:
  - no Reject button and no reason except on Quit (C5);
  - no Admin view of Requests or Matches (C4);
  - no route or group origin shown (C6);
  - no chat or helper text, and the empty middle stays empty (C7, C9).

## References

- parent — `_bmad-output/initiative-growmate/initiative-growmate.md`. Requirements R7–R9, R12–R15, R20 (the Not yet started, In progress and Quit part), R21 and R22 (the Request, Accept, day-3, day-6, Quit and Bronze notices). Constraints C4–C10.
- glossary — `_bmad-output/initiative-growmate/glossary.md`
- prd — `_bmad-output/initiative-growmate/prd-growmate/prd-growmate.md`, §4.3, §4.5, §4.7, §4.8.

## Notes

- Decision (2026-11-10): R6, the Course Mentor list, moved to epic-accounts-courses-first-mentors.
- Waits on epic-accounts-courses-first-mentors because: it needs accounts, published Courses, the Course Mentor list, Mentors with a Mentor-route record, and the in-app notification mechanism.
