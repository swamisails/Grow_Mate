---
type: epic
title: "Learners get a Mentor and are judged ready"
parent: initiative-growmate
covers: [R7, R8, R9, R12, R13, R14, R15, R20, R21, R22]
sources: [_bmad-output/initiative-growmate/initiative-growmate.md, _bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md, _bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md]
companions: [_bmad-output/initiative-growmate/glossary.md, _bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md, _bmad-output/initiative-growmate/ux-growmate/DESIGN.md, _bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md]
after: []
refined: true
risk: high
---

# Learners get a Mentor and are judged ready

## Description

A Learner picks a Mentor from a Course's Mentor list (built in epic 1) and sends a Request. The Mentor Accepts, and the day-3 reminder and day-6 Cancel run on a controllable clock. Either party can Quit, and the Mentor clicks Course Completed to unlock Bronze. This is the heart of the match-and-proof loop. Its time rules and status changes are the least certain part of the initiative, so it carries the highest risk.

## Outcome

A Learner is matched, judged ready and handed Bronze on the deployed app. Every status shows on the plain bar and the Upskilling list.

## Requirements

- R1 (parent R7): A Learner sends a Request, with no reason, to one Mentor listed on a published Course. It is refused, with a specific reason code, when the Learner already has a pending Request or live Match on that Course, Course Completed has been clicked for them there, or they are a Mentor for it. One shared eligibility check serves Requests and Group assignment.
- R2 (parent R8): Every Employee has a Requests screen listing the pending Requests sent to them, each as "[Learner] requested you to guide them with [Course]" with Accept as the only response. Accept creates a Match and sets the Learner's status to In progress. A Mentor's live Matches are unlimited.
- R3 (parent R9): An un-Accepted Request is reminded to both parties exactly 72 hours after it was sent and Cancelled exactly 144 hours after, and Accept is refused from then on. After a Cancel the Learner has no Progress status on that Course unless they have Stage progress there. Nothing else happens on any other day, and Admin receives nothing.
- R4 (parent R9; architecture AD-5, AD-6): The time rules are worked out from stored timestamps against one clock, with no scheduled jobs. In the `e2e` environment only, a test clock sets the current time, and the Playwright harness has a helper to set it; `local` and `production` have no test clock.
- R5 (parent R12): Both parties of a live Match can open its Match screen: the other person's name, the Course and the bar. The Learner can only Quit Course; the Mentor can click Course Completed or Quit Course. There is no chat, call, file sharing, helper text, activity indicator, Mentor route or group origin. An ended Match has no screen and disappears from Home.
- R6 (parent R13): Either party can Quit a live Match at once with a required reason of 1 to 500 characters and no approval. The other party receives the reason as an in-app note. The Learner's status becomes Quit, whoever quit, and the Learner can request the Course again.
- R7 (parent R14): Only the Mentor can click Course Completed, after a confirmation. It ends the Match, makes Bronze available, and notifies the Learner. The Learner stays In progress, and nothing else is granted.
- R8 (parent R15): A live Match never ends by timer or inactivity, only by Quit or Course Completed.
- R9 (parent R20): The bar shows Not yet started (grey) for a pending Request, In progress (half blue) from Accept, and Quit (red) until a new Request is sent, with its state word and nothing else. It appears on Home's Learning card, the Course page, the Match screen and the Upskilling list. A Learner with none of these states has no bar.
- R10 (parent R21): Any signed-in user, Admin included, can view one Upskilling list of every Employee In progress on some Course, with name, Course and status, sorted by name. It has no scores, ranking or actions.
- R11 (parent R22): The product sends these notices, never to Admin and never revealing a Mentor route or group origin: new Request (to the Mentor), Accept (to the Learner), the day-3 reminder and day-6 Cancel (to both, worked out from the Request and never stored), the Quit note (to the other party) and Bronze available (to the Learner).
- R12 (EXPERIENCE.md, Information Architecture): Home shows the Learning card (each Course where the Employee has a status, with its bar and a link to the Match or Course) and the Mentoring card (their live Matches as Mentor, hidden when there are none).

## Constraints

- Binding: C4 (Admin has no view of Requests or Matches), C5 (a reason only on Quit; no Reject), C6 (no Mentor route or group origin shown), C7 (no chat or integrations), C8 (no rewards), C9 (the empty middle stays empty: no helper text, nudges or counters), C10 (stored data; the Quit reason only to the other party), C11 (deployed means the Docker stack; the test clock exists only in `e2e`).

## Done when

- A Learner requests a listed Mentor, and the Mentor sees only the one-line Request with an Accept button. Accept creates a Match and sets In progress.
- On the clock, an un-Accepted Request sends one reminder to both parties on day 3 and is Cancelled on day 6. The Learner is left with no Progress status, and Admin receives nothing. Tests drive the clock without waiting real time.
- Either party Quits with a reason, which the other receives. The Learner shows Quit (red) and can request again. No timer ends a Match.
- Course Completed ends the Match, unlocks Bronze and notifies the Learner. The Learner can't click Course Completed or request that Course again (R1, R7).
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
- architecture — `_bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md`, AD-2, AD-4, AD-5, AD-6, AD-8, AD-10 to AD-13, AD-16; Module creation by epic (epic 2 creates Matching and Progress).
- design — `_bmad-output/initiative-growmate/ux-growmate/DESIGN.md`, Components (Progress bar, Dialog, Card, Table).
- design — `_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md`: Information Architecture (Home, Requests, Match, Upskilling list), Voice and Tone (Request, Accept, day-3, day-6, Quit and Bronze notices), Component Patterns (Progress bar, Mentor list row, Request row, Match actions, Quit dialog, Upskilling table), State Patterns, Visibility Rules, Key Flows 1 and 2.
- mock-up — `_bmad-output/initiative-growmate/ux-growmate/mockups/epic2-matching.html` (Home, Requests, Match, the Quit and Course Completed dialogs, Upskilling list).
- mock-up — `_bmad-output/initiative-growmate/ux-growmate/mockups/course-page.html` (the four bar states).

## Notes

- Decision (2026-11-10): R6, the Course Mentor list, moved to epic-accounts-courses-first-mentors.
- Waits on epic-accounts-courses-first-mentors because: it needs accounts, published Courses, the Course Mentor list, Mentors with a Mentor-route record, and the in-app notification mechanism.
- Decision (2026-11-10): day 3 and day 6 are exactly 72 and 144 hours after the Request was sent, in UTC; Accept at or after 144 hours is refused (pick 2.1).
- Decision (2026-11-10): Quit, then a new Request, then a Cancel leaves the Learner with no status; Quit applies only until a new Request is sent (pick 2.2).
- Decision (2026-11-10): only a live Match has a Match screen; an ended one disappears from Home. The Quit reason is stored on the Match (AD-4, C10) and shown only in the other party's notice (pick 2.3).
- Decision (2026-11-10): the Quit reason is required, 1 to 500 characters (pick 2.4).
- Decision (2026-11-10): this epic builds the test-clock endpoint and middleware (AD-6) and the harness's set-clock helper, which epic 3 reuses (pick 2.5).
- Decision (2026-11-10): the epic is refined (Requirements R1–R12) and the UX spines are adopted as companions.
- Decision (2026-11-10): a day-3 reminder, once reached, stays on Notices dated sent time + 72h even after a later Accept or Cancel.
- Decision (2026-11-10): the Upskilling list has one row per Employee and Course, sorted by name then Course title.
- Decision (2026-11-10): "no status after a Cancel unless Stage progress" needs no branch here; R1 refuses a Request once Course Completed was clicked, so Stage progress can't meet a Cancel. Epic 3's status query owns the Stage-progress case.
- Decision (2026-11-10): entry 2 owns AD-11's time-notice contract (defined in Notifications, implemented in Matching).
- Decision (2026-11-10): the tracer bullet is entry 1, "A Learner requests a Mentor and the Mentor Accepts". Sequencing: 1, then 2 (the clock, least certain), 3 and 4 in a chain on the Matching actions; 5 after 2; 6 after 4 and 5; 7 after 6; 8 after 5; the Refactor sweep (9) after all; the closing end-to-end suite (10) last.
