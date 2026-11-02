---
type: initiative
title: GrowMate
parent: none
sources:
  - _bmad-output/initiative-growmate/prd-growmate/prd-growmate.md
companions:
  - _bmad-output/initiative-growmate/glossary.md
  - _bmad-output/initiative-growmate/prd-growmate/addendum.md
after: []
risk: medium
---

# GrowMate

## Description

GrowMate is a small in-house web app that runs a match-and-proof loop for learning inside a company. When it is done:
1. Admin publishes Courses with three Stage Assessments.
2. A Learner requests a Mentor for a Course, and the Mentor Accepts.
3. They talk outside the app.
4. The Mentor clicks Course Completed when the Learner is ready.
5. The Learner passes Bronze, Silver and Gold, and becomes a Mentor for that Course.

Experienced Employees can also become Mentors through Admin's Registration decision or a Group assignment. The product records only pairings, readiness clicks and Assessment results, and gives no rewards. It is a practice project. The final PRD (`prd-growmate/prd-growmate.md`) is its source.

## Outcome

Employees and Admin can run the whole loop in the web app, from a published Course to a new Mentor created by Gold pass. This is shown by the PRD's success signals SM-1 and SM-2, without breaking its counter-metrics SM-C1 and SM-C2.

## Requirements

- R1 (prd FR-1): A visitor can create an Employee account with name, email and password and then sign in. A duplicate email is refused. The single Admin account exists from setup and can't be created through signup.
- R2 (prd FR-2): At signup an Employee can name one or more published Courses in the Mentor check, or skip it. The Mentor check never runs again, so a Course published after signup can't be gained through Registration approval.
- R3 (prd FR-3): Admin can approve or refuse each Mentor-check Course separately, with no score and no comment.
  - An approval makes the Employee a Mentor for that Course at once.
  - A refusal leaves Gold pass as the only route to that Course.
  - Decisions are final.
  - The Employee is notified, and sees approved and refused Courses as two separate lists.
- R4 (prd FR-4): Admin can create a Course with a title and description and publish it. A published Course is visible to all Employees.
- R5 (prd FR-5): Admin can enter a multiple-choice Assessment (one correct answer per question) and a Pass mark percentage for each of Bronze, Silver and Gold. A Course missing any Assessment or Pass mark can't be published and isn't visible.
- R6 (prd FR-6): An Employee viewing a Course sees every Mentor for it, without the Mentor route and excluding themselves.
- R7 (prd FR-7): A Learner can send a Request, with no reason, to one listed Mentor. The Request is refused when:
  - the Learner already has a pending Request or live Match on that Course;
  - Course Completed has already been clicked for them on that Course;
  - the Learner is already a Mentor for that Course.
- R8 (prd FR-8): A Mentor sees each pending Request only as "[Learner] requested you to guide them with [Course]" and an Accept button, with no other response.
  - Accept creates a Match and sets the Learner's Progress status to In progress.
  - The Learner sees only "[Mentor] is your mentor for [Course]."
  - A Mentor's live Matches are unlimited.
- R9 (prd FR-9): An un-Accepted Request triggers one in-app reminder to both parties on day 3. On day 6 it is Cancelled, with a notice to both that tells the Learner to request again. After a Cancel, the Learner has no Progress status on that Course unless they have Stage progress there. Nothing else happens on any other day, and Admin receives nothing.
- R10 (prd FR-10): Admin can assign one or more Learners to one chosen Employee for a Course. This creates a pending Request from each Learner, under R9's timing.
  - An Employee refused that Course at registration can't be chosen.
  - The chosen Employee needn't already be a Mentor for it.
  - Learners get no assignment notice.
- R11 (prd FR-11): The chosen Employee Accepts the whole group with one Accept, never per Learner.
  - Accept creates one independent Match per Learner.
  - Accept makes the chosen Employee a Mentor for the Course for all future Requests.
  - If the group is never Accepted, they don't become a Mentor.
- R12 (prd FR-12): Both parties can view a Match: the other's name, the Course and the Progress status bar. The Learner can only Quit Course. The Mentor can click Course Completed or Quit Course. There is no chat, call, file sharing, helper text, activity indicator, Mentor route or group origin on the screen.
- R13 (prd FR-13): Either party can Quit a live Match at once, with a free-text reason and no approval. The other party receives the reason as an in-app note. The Learner's status becomes Quit, whoever quit, and the Learner can request the Course again.
- R14 (prd FR-14): Only the Mentor can click Course Completed. It ends the Match, makes Bronze available, and notifies the Learner. The Learner stays In progress, and nothing else is granted.
- R15 (prd FR-15): A live Match never ends by timer or inactivity, only by Quit or Course Completed.
- R16 (prd FR-16): Bronze is available only after Course Completed, Silver only after Bronze is passed, and Gold only after Silver is passed. A Stage that isn't yet unlocked isn't shown.
- R17 (prd FR-17): A Learner answers a whole Assessment in one attempt and sees pass or fail. The attempt passes when the percentage correct is at or above the Pass mark.
- R18 (prd FR-18): A Learner gets two attempts per Stage, the second immediately.
  - Two failures Lock the Stage for one month and keep later Stages hidden.
  - After the Lock, two attempts return, repeating without limit.
  - The month is fixed and no one can change it.
  - Stage progress and Locks belong to the Learner and the Course, and survive any Quit or new Match.
- R19 (prd FR-19): Passing Gold makes the Learner a Mentor for that Course and sets their status to Completed. Passing any Stage creates no badge, certificate, points or résumé entry.
- R20 (prd FR-20): Each Learner–Course pair shows a single plain bar with no numbers, percentages, markers or activity signals. It is the same for every route. Its states:
  - Not yet started (grey): a pending Request.
  - In progress (half blue): from Accept until Gold, unchanged during a Match.
  - Completed (green).
  - Quit (red).
- R21 (prd FR-21): Any signed-in user can view one Upskilling list across all Courses: each Employee who is In progress, with name, Course and status. It has no scores, ranking or actions, and Admin can't act from it.
- R22 (prd FR-22, §4.8): The product sends exactly these in-app notifications, never to Admin, and none reveals a Mentor route or group origin:
  - new Request, to the Mentor, including each Request of a Group assignment;
  - Accept, to the Learner;
  - the day-3 reminder and the day-6 Cancel, to both parties;
  - the Quit note, to the other party;
  - Bronze available, to the Learner;
  - Registration decisions, to the Employee.

## Constraints

- C1 (prd §6.1, §6.2): Single web app for desktop browsers. A responsive layout isn't required, and there are no mobile apps.
- C2 (prd FR-1, §6.2): Email-and-password accounts only, with no SSO or HRIS integration, and exactly one Admin account with no Admin roles.
- C3 (prd §4.8, §6.2): Notifications are in-app only, with no email or other channel.
- C4 (prd §1.1, §5): Admin's features are a closed list:
  - publish Courses;
  - enter Assessments and Pass marks;
  - make Registration decisions;
  - make Group assignments;
  - view the Upskilling list.

  Admin has no view of, or action on, Requests or Matches.
- C5 (prd §1.1, §5): A free-text reason exists only on Quit. Requests, Accept, Registration decisions, Group assignments and Course Completed carry no reason or comment field, and there is no Reject response.
- C6 (prd §1.1, §8): No Employee-facing screen or notification reveals a Mentor route or whether a Match came from a Group assignment. Admin sees a Mentor's route only for Courses Admin decided or assigned.
- C7 (prd §1.1, §5): No chat, calls, scheduling, file sharing or integration with Teams or any conversation tool. No talk content is stored.
- C8 (prd §1.1, §5): No badges, certificates, points, ranks, résumé or LinkedIn export, mentor calendars, capacity settings or suspension.
- C9 (prd §1.1): The empty middle is intended behaviour: the unchanged half-blue bar, the bare readiness click and Admin's scoreless yes/no. There are no helper text, nudges, "lamps" or progress signals to fill it.
- C10 (prd §8): A Quit reason is visible only to the other party. The stored data is:
  - pairings and Progress statuses;
  - Assessment attempts, scores and Locks;
  - Mentor-route records, including refused Registration decisions;
  - Quit reasons.

## Done when

- A seeded test run completes PRD journeys UJ-1 to UJ-4 in the web app with no manual data fixes (prd SM-1).
- The same run covers three more scenarios: a Stage reaching a Lock, a refused Employee excluded from a Group assignment, and a Learner-initiated Quit (prd SM-1).
- At least one Employee becomes a Mentor through Gold pass and then Accepts a Request (prd SM-2).
- No screen, notification or report gives Admin insight into Requests or Matches, and nothing nudges a Mentor after day 6 (prd SM-C1, SM-C2).
- The app is deployed and usable in a desktop browser.

## Boundaries

- Out: everything in prd §5, which is never built: chat, rewards, a Reject button, calendars, Admin oversight of Matches, verification or appeals, and Match timers.
- Out for this build: everything in prd §6.2. That covers mobile, SSO/HRIS, email, multiple Admins, non-multiple-choice questions and mentor training content.
- Touch point: none. GrowMate is standalone, with no external systems.
- Tracer path: an Employee signs up → Admin publishes a Course with three Assessments → the Learner Requests a listed Mentor → the Mentor Accepts → the Mentor clicks Course Completed → the Learner passes Bronze, Silver and Gold → the Learner appears in that Course's Mentor list.

## References

- prd — `_bmad-output/initiative-growmate/prd-growmate/prd-growmate.md`: §1.1 principles, §4 features (FR-1 to FR-22), §5 non-goals, §6 scope, §7 metrics, §8 guardrails.
- glossary — `_bmad-output/initiative-growmate/glossary.md`.
- addendum — `_bmad-output/initiative-growmate/prd-growmate/addendum.md`: §A rejected alternatives, §B research context.
