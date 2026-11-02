---
title: 'GrowMate PRD'
status: final
created: '2026-10-30'
updated: '2026-11-02'
stakes: practice project
platform: web
---

# PRD: GrowMate

## 0. Document Purpose

This PRD is for whoever designs, builds or tests GrowMate, a practice project that is **built in-house**. The market research's alternative, buying an existing mentoring product, doesn't apply.

It distils the planning work in `_bmad-output/`:
- the brainstorm (24 Oct 2026);
- the forge and party-mode sessions (26 Oct 2026);
- the design-thinking session (26 Oct 2026).

Where those planning sources conflict, the later one wins. The market research (30 Oct 2026) **informs** the open questions but decides nothing. The original README is deliberately not a source.

Domain words are defined once in §3 and used exactly. Features are grouped in §4 with globally numbered FRs. All assumptions were confirmed by the user on 2 Nov 2026 and are written as requirements. Rejected alternatives and the research context are in `addendum.md`.

## 1. Vision

GrowMate is a **match-and-proof loop** for learning inside a company:
1. Admin publishes a course.
2. A learner is matched with a mentor for that course.
3. They talk outside the app.
4. The mentor clicks **Course Completed** when they judge the learner ready.
5. That opens the Bronze, Silver and Gold Assessments in turn.
6. Passing gold gives the learner the right to mentor that course, so the next learner has one more mentor to choose from.

GrowMate records only the pairing, the readiness click and the assessment results. It holds no conversations and gives no rewards. **"The course outlives the mentor."** People can step off at any time, and the course stays on the path for the next match.

### 1.1 Product principles

These principles constrain every feature. Downstream design must treat them as requirements, not tone.

- **Gold is permission, not a prize.** Bronze and silver only unlock the next stage. Gold only grants the right to mentor that course. There are no badges, certificates, points or rank.
- **Quitting is normal.** Either person can Quit at any time without approval. A mid-course quit is not a failure.
- **Quit is the only place a reason is written.** Requests, Accept, Registration decisions, Group assignments and Course Completed carry no reason or comment field.
- **Silence is a finished outcome.** An unanswered Request gets one reminder and is then Cancelled. It is never called a rejection, and nobody is nagged afterwards.
- **After Accept, the match forgets how it started.** A one-to-one Request and a Group assignment produce the same kind of Match. No screen shows which Mentor route made someone a mentor, or whether a Match came from a Group assignment.
- **Admin is kept out on purpose.** Admin's features are a closed list: publish Courses, upload Assessments and Pass marks, make Registration decisions, make Group assignments, and view the Upskilling list. Admin has no view of, or role in, Requests or Matches.
- **The click is the record.** Talks happen in Teams or anywhere else. GrowMate does not connect to them, track them or replace them.
- **The empty middle is normal.** The following are intended behaviour and must not be "fixed":
  - an unchanged half-blue bar for the whole match;
  - a readiness click with no transcript behind it;
  - Admin's scoreless yes or no.

  The product doesn't add helper text, activity "lamps", nudges or progress signals to fill them.

## 2. Target User

### 2.1 Jobs To Be Done

- **Learner:** "Get matched with someone who knows this course, and get a fair shot at proving I've learned it."
- **Mentor:** "Help a colleague learn without a heavy tool, judge when they are ready to be assessed, and be free to step away."
- **Experienced Employee:** "Mentor a course I already know from day one, without first sitting three assessments as a learner."
- **Admin:** "Publish courses and assessments, decide each course named in someone's Mentor check myself, and staff mentors, without managing anyone's mentoring."
- **Builder (practice):** "Prove the whole loop end to end in a small web app."

### 2.2 Key User Journeys

- **UJ-1. Priya finds a mentor and earns the right to mentor.**
  1. Priya opens the "Python Basics" course and sees its mentors. She requests Rafi, who Accepts, and her bar turns half blue.
  2. They meet in Teams for some weeks.
  3. Rafi clicks Course Completed, and Priya sees Bronze.
  4. She passes Bronze. She fails Silver once, retakes it immediately and passes. Then she passes Gold.
  5. Her bar turns green, and she now appears in the Course's Mentor list.

  **Edge case:** if Rafi never answers, both get a reminder on day 3. On day 6 the Request is Cancelled and Priya is told to request someone else.
- **UJ-2. Rafi steps away mid-course.** Rafi Quits Priya's Match and writes "Moving teams, sorry". Priya sees the note, and her bar shows Quit. She requests Imani for the same course.
- **UJ-3. Sam joins as an experienced mentor.** At signup Sam names three courses in the Mentor check. Admin approves two and refuses one. Sam sees the approved and refused courses listed separately. Sam is requestable on the two approved courses straight away. The refused course can be gained only by passing Gold as a learner.
- **UJ-4. Noor (Admin) sets up a course and staffs a group.**
  1. Noor publishes "SQL Fundamentals" after uploading its three Assessments and Pass marks.
  2. She assigns five learners to Imani, who has never mentored it.
  3. Imani Accepts once. Five separate Matches start, and Imani is now a Mentor for that Course.

## 3. Glossary

- **Employee**: anyone with a GrowMate account who is not Admin. An Employee can be a Learner on some Courses and a Mentor on others.
- **Admin**: the single administrator account. It manages Courses, Assessments, Registration decisions and Group assignments, and sees nothing of Requests or Matches.
- **Course**: the unit of learning, published by Admin and visible to all Employees. Each Course has exactly three Stages.
- **Stage**: one of Bronze, Silver or Gold for a Course. Each Stage has one Assessment and a Pass mark. Stage progress belongs to the Learner and the Course, never to a Match.
- **Assessment**: an Admin-entered bank of multiple-choice questions for one Stage. It is scored automatically as a percentage.
- **Pass mark**: the minimum percentage score Admin sets for a Stage's Assessment.
- **Mentor (for a Course)**: an Employee allowed to receive Requests for that Course, through one of three Mentor routes. Mentor status is always per Course, never global.
- **Mentor route**: the reason someone is a Mentor for a Course. There are three: **Gold pass**, **Registration approval**, and **Group assignment accepted**. It is stored but never shown to Employees.
- **Mentor check**: the optional part of signup where an Employee names one or more Courses they claim they can mentor. It runs once and is never rerun.
- **Registration decision**: Admin's bare yes or no on each Course named in a Mentor check. It is final.
- **Learner**: an Employee who requests, or is assigned, a Mentor for a Course.
- **Request**: a Learner's ask to one Mentor for one Course. It carries no reason. A Request is pending until Accepted or Cancelled.
- **Group assignment**: Admin's action that creates a pending Request from each of several Learners to one chosen Employee for one Course.
- **Accept**: the Mentor's only response to a Request. One Accept covers a whole Group assignment.
- **Cancel (day 6)**: automatic clearing of a Request with no Accept six days after it was sent. A Cancel is not a rejection.
- **Match**: the live pairing of one Learner and one Mentor for one Course, created by Accept. It ends only by Quit or Course Completed.
- **Quit**: either party ending a Match unilaterally, with a free-text reason.
- **Course Completed**: the Mentor's click meaning "I judge this Learner ready for the Assessment". It doesn't mean the talks are over. It ends the Match and unlocks Bronze for that Learner.
- **Retake rule**: the cycle of attempts and Locks on a failed Stage, set out in FR-18.
- **Lock**: the one-month period during which a Stage can't be attempted.
- **Progress status**: a Learner's state on a Course: Not yet started, In progress, Completed or Quit, as defined in FR-20.
- **Upskilling list**: a read-only list, visible to everyone, of Employees whose Progress status on some Course is In progress.

## 4. Features

### 4.1 Accounts and the Mentor check

**Description:** an Employee signs up with name, email and password. Signup includes the optional Mentor check, which leads to Registration decisions by Admin. This is the experienced Employee's route to mentoring without first passing Gold. Realizes UJ-3.

#### FR-1: Employee signup and sign-in
A visitor can create an Employee account with name, email and password, and then sign in. There is no SSO in this practice project.
- An email already in use is refused.
- One Admin account exists from setup. It can't be created through signup.

#### FR-2: Mentor check at signup
An Employee can name one or more published Courses in the Mentor check, or skip it.
- Skipping leaves the Employee a Mentor for no Course.
- The Mentor check runs only at signup and is never rerun. A Course published after signup can never be gained through Registration approval.

#### FR-3: Registration decision
Admin can approve or refuse each Course named in a Mentor check, separately, with no score and no comment.
- An approval makes the Employee a Mentor for that Course immediately, under the route Registration approval.
- A refusal doesn't affect the approved Courses. A refused Course can then be gained only by Gold pass, if the Employee chooses to pursue it.
- A Registration decision is final. Admin can't reopen it.
- The Employee sees their approved and refused Courses as two separate lists, and is notified of the decisions.

### 4.2 Courses and Assessments (Admin)

**Description:** Admin publishes Courses and supplies one Assessment and Pass mark per Stage. Realizes UJ-4.

#### FR-4: Publish a Course
Admin can create a Course with a title and description and publish it. Once published, it is visible to all Employees.

#### FR-5: Stage Assessments and Pass marks
Admin can enter an Assessment for each of the Bronze, Silver and Gold Stages of a Course, as a list of multiple-choice questions with one correct answer each. Admin also sets a Pass mark percentage for each Stage.
- A Course can't be published until all three Assessments are entered with their Pass marks.
- A Course with any Assessment or Pass mark missing stays unpublished and isn't visible to Employees.
- The Pass mark is whatever Admin sets. The product imposes no fixed value.
- Once a Course is published, its Assessments and Pass marks are frozen and can't be changed.

### 4.3 Requests

**Description:** a Learner picks a Mentor from a Course's Mentor list and sends a Request. The Mentor can only Accept. Unanswered Requests get one reminder and are then Cancelled. Admin has no part in this flow. Realizes UJ-1 and UJ-2.

#### FR-6: Course Mentor list
An Employee viewing a Course can see every Mentor for that Course, whatever their Mentor route.
- The Mentor route isn't shown.
- The list excludes the viewing Employee.

#### FR-7: Send a Request
A Learner can send a Request, with no reason, to one Mentor on the Course's Mentor list.
- A Learner can have at most one pending Request or live Match per Course.
- A Learner can't send a Request for a Course once Course Completed has been clicked for them on that Course. Only Assessments remain.
- An Employee can't request a Course they are already a Mentor for.

#### FR-8: Mentor's Request screen and Accept
A Mentor sees each pending Request as one sentence, "[Learner] requested you to guide them with [Course]" (for example, "Priya requested you to guide them with Python Basics"), and one **Accept** button. Nothing else is shown, and no other response exists.
- Accept creates a Match, and the Learner's Progress status becomes In progress.
- The Learner sees only one line: "[Mentor] is your mentor for [Course]."
- A Mentor may hold any number of live Matches.

#### FR-9: Day-3 reminder and day-6 Cancel
For a Request with no Accept:
- On day 3, the Learner and the Mentor each receive one in-app reminder.
- On day 6, the Request is Cancelled. Only the Learner and the Mentor are notified, and the Learner is told to send a new Request.
- After a Cancel, the Learner has no Progress status on that Course, unless they have Stage progress there. A Cancel never shows as Quit.
- Nothing else happens on any other day. Admin receives nothing.

### 4.4 Group assignment (Admin)

**Description:** Admin can staff a Course by assigning several Learners to one Employee in a single action. After Accept, each person has an ordinary Match. Realizes UJ-4.

#### FR-10: Assign a group
Admin can choose a Course, any eligible Employee to mentor the group, and one or more Employees as Learners. This creates a pending Request from each Learner to the chosen Employee.
- An Employee whose Registration decision refused that Course can't be the chosen Employee for it.
- The chosen Employee doesn't need to be a Mentor for the Course beforehand.
- The Requests follow FR-9 exactly.
- Learners receive no assignment notice. They see only the ordinary Accept line (FR-8), so the group origin is never shown.

#### FR-11: Accept a group
The chosen Employee sees the group's Requests and Accepts them all with one Accept. A group can't be accepted one Learner at a time.
- One Match is created per Learner. Each Match has its own Quit and Course Completed, independent of the others.
- If the chosen Employee wasn't yet a Mentor for the Course, Accept makes them one, under the route Group assignment accepted, for all future Requests too.
- If the group is never Accepted, the chosen Employee doesn't become a Mentor for the Course.

### 4.5 The Match

**Description:** a Match is a pairing record. It has no messages and no calls, and nothing in it tracks the talks. It ends only when someone Quits or the Mentor clicks Course Completed. Waiting for Course Completed is intended. If it never comes, Quit is the only remedy. Realizes UJ-1 and UJ-2.

#### FR-12: Match screen
Both parties can view the Match: the other person's name, the Course and the Progress status bar.
- The Learner's only action is **Quit Course**.
- The Mentor's actions are **Course Completed** and **Quit Course**.
- There is no chat, call, file sharing, helper text or activity indicator.
- The screen doesn't show the Mentor route or whether the Match came from a Group assignment.

#### FR-13: Quit
Either party can Quit a live Match at any time, with a free-text reason. No approval is needed.
- The Quit takes effect immediately. The other party receives an in-app note whose body is the reason.
- The Learner's Progress status becomes Quit (red), whoever quit. The Learner may then send a new Request for the same Course.

#### FR-14: Course Completed
The Mentor can click Course Completed on a live Match.
- The Match ends, and Bronze becomes available to the Learner, who is notified.
- The Learner's Progress status stays In progress.
- The Learner can't trigger this action. Course Completed grants nothing except access to Bronze.

#### FR-15: No automatic ending
A live Match never ends on a timer or inactivity. It ends only through FR-13 or FR-14.

### 4.6 Stages and the Retake rule

**Description:** the three Stages unlock in order. Failures follow the Retake rule. Passing Gold grants Mentor status for that Course and nothing else. Stage progress and Locks belong to the Learner and the Course, and survive any Quit or new Match. Realizes UJ-1.

#### FR-16: Sequential Stages
A Learner can take Bronze only after Course Completed. They can take Silver only after passing Bronze, and Gold only after passing Silver. Stages that aren't yet unlocked aren't shown.

#### FR-17: Taking and scoring an Assessment
A Learner answers all questions of the Stage's Assessment in one attempt and sees pass or fail.
- The attempt passes if the percentage of correct answers is at or above the Pass mark.

#### FR-18: Retake rule
- On a Stage, a Learner gets two attempts. The second is available immediately after a failure.
- After two failures, that Stage is Locked for one month. While it is Locked, later Stages stay hidden.
- When the Lock ends, the Learner gets two attempts again. This cycle repeats with no limit and never drops to a single attempt.
- The Lock is always one month. No one, including Admin, can change its length.

#### FR-19: Gold pass
Passing Gold makes the Learner a Mentor for that Course, under the route Gold pass, and sets their Progress status to Completed (green).
- No badge, certificate, points or résumé entry is created.
- Passing Bronze or Silver creates nothing except access to the next Stage.

### 4.7 Progress and the Upskilling list

**Description:** each Learner–Course pair shows one Progress status as a plain bar with no numbers or percentages. Every Learner and every Mentor sees the same bar, whichever Mentor route applies. One Upskilling list shows who is currently upskilling. Realizes UJ-1.

#### FR-20: Progress status and bar
- **Not yet started** (grey): a Request is pending.
- **In progress** (half blue): from Accept until Gold is passed, including the Assessment Stages.
- **Completed** (green): Gold has been passed.
- **Quit** (red): the last Match was Quit and no new Request has been sent.

If there is no pending Request, Match or Stage progress, the Learner has **no Progress status** on that Course.

Half blue means "in progress", not "half done". It doesn't change during a Match. The bar has no numbers, percentages, extra markers or activity signals.

#### FR-21: Upskilling list
Any signed-in user can view one list across all Courses. It shows each Employee whose Progress status on some Course is In progress, with their name, the Course and the status.
- It has no scores, ranking or actions.
- Admin can view it but can't act from it.

### 4.8 Notifications

All notifications are in-app only. There is no email or other channel.

#### FR-22: Notification set
The product sends exactly these notifications:
- new Request, to the Mentor (FR-8), including each Request of a Group assignment to the chosen Employee;
- Accept, to the Learner (FR-8);
- day-3 reminder, to both (FR-9);
- day-6 Cancel, to both (FR-9);
- Quit note with reason, to the other party (FR-13);
- Bronze available, to the Learner (FR-14);
- Registration decisions, to the Employee (FR-3).

No notification is sent to Admin. None reveals a Mentor route or a group origin.

## 5. Non-Goals (Explicit)

These are never built: they follow from the product principles in §1.1.

- **No in-app chat, calls, scheduling or Teams integration.** Talks stay outside the app.
- **No badges, certificates, points, ranks or résumé or LinkedIn export.**
- **No Reject button,** and no reason or comment field outside Quit.
- **No mentor availability calendar,** capacity setting or suspension.
- **No Admin visibility of, or action on, Requests and Matches.** That includes no queue of ignored Requests.
- **No Admin features beyond the closed list in §1.1.** That includes no mentor verification criteria, no appeals and no reopening of Registration decisions.
- **No timers that end a live Match,** and no nudges or "lamps" during one.

## 6. MVP Scope

### 6.1 In Scope
- FR-1 to FR-22 on a single **web** app, for desktop browsers. A responsive layout is nice-to-have, not required.
- One Admin account and any number of Employees.
- Multiple-choice Assessments taken in-app.

### 6.2 Out of Scope for MVP

These are not in this build, but could come later.

- Mobile apps, because the platform is web only.
- SSO and HRIS integration, because this is a practice project.
- Email notifications (FR-22 is in-app only).
- Multiple Admins or Admin roles.
- Question types other than multiple-choice.
- Mentor training content: a v2 idea (see `addendum.md` §B).

## 7. Success Metrics

**Primary**
- **SM-1: The loop runs end to end.** A seeded test run completes UJ-1 to UJ-4 in the app with no manual data fixes. It also covers three more scenarios: a Stage reaching a Lock (FR-18), a refused Employee excluded from a Group assignment (FR-10), and a Learner-initiated Quit (FR-13). This validates FR-1 to FR-22.
- **SM-2: The mentor pool grows from Gold.** At least one Employee in a test run becomes a Mentor through Gold pass and then Accepts a Request. This validates FR-7, FR-8 and FR-16 to FR-19.

**Counter-metrics (do not optimise)**
- **SM-C1: Number of Matches or Requests.** Raising these would push toward nagging or auto-matching, which breaks "Silence is a finished outcome". This counterbalances SM-2.
- **SM-C2: Admin insight into Matches.** Adding visibility breaks "Admin is kept out on purpose". This counterbalances SM-1.

## 8. Constraints and Guardrails

- **Privacy inside the product:**
  - A Quit reason is visible only to the other party.
  - Requests and Matches are invisible to Admin.
  - Mentor routes and group origins are never shown to Employees.
  - Admin sees only the Registration decisions and Group assignments Admin created. Admin never sees Mentor routes, Request or Match state, or whether a Group assignment was Accepted.
- **Data kept:** GrowMate stores:
  - pairings and Progress statuses;
  - Assessment attempts, scores and Locks;
  - Mentor-route records, including refused Registration decisions, which FR-10 needs;
  - Quit reasons.

  It stores no talk content.

## 9. Open Questions

None. All open questions are resolved.

## 10. Assumptions Index

None. All five assumptions were confirmed on 2 Nov 2026 and are now requirements (FR-3, FR-7, FR-14, §6.1, §8).
