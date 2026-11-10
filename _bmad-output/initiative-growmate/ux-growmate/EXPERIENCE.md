---
name: GrowMate
status: final
sources:
  - ../initiative-growmate.md
  - ../architecture-growmate/architecture-growmate.md
  - ../glossary.md
updated: 2026-11-10
---

# GrowMate — Experience Spine

## Foundation

GrowMate is a desktop-only web app: a React SPA with plain CSS and no UI component library (epic 1 Decision, 2026-11-10). `DESIGN.md` is the visual identity reference, and this file is the experience. Where a mock-up or reference screen disagrees with DESIGN.md or EXPERIENCE.md, the spines win. The look follows the project owner's reference screens (`imports/`); DESIGN.md records what was adopted from them. Light and dark mode come from an in-app toggle that starts from the operating system's setting.

The SPA renders what the API returns and decides nothing itself (AD-2). Every status, date, eligibility and refusal shown in the app comes from the API. After any action, the screen re-fetches and shows the new server state, with no optimistic updates. All user-facing sentences live in `web/src/app/copy.ts` (AD-16).

There are two roles with separate navigation: **Employee** and **Admin**. The terms in this file are the glossary's, used exactly.

## Information Architecture

### All roles

- Each page opens with a page header: the page-title tile, the page title and at most one primary action on the right (New Course on Admin Courses). There are no result counts.
- Dialogs are never nested and are used only for the Quit reason and the confirmations listed under Component Patterns.
- Every surface has its own URL, so browser Back works.
- An unknown or forbidden URL shows the Not found state.

→ Composition reference: [`mockups/course-page.html`](mockups/course-page.html) shows the Course page in light and dark (UJ-2 climax, UJ-1 step 7) and the four bar states with their state words. Every other surface is built from this file's tables alone.

### Employee

| Surface | Reached from | Purpose | Epic |
|---|---|---|---|
| Sign in | App open when signed out | Email and password | 1 |
| Sign up | Link on Sign in | Name, email, password, then the Mentor check step | 1 |
| Mentor check (sign-up step 2) | Straight after the account is created | Tick published Courses you can mentor, or Skip. Shown once, never again | 1 |
| Home | After sign-in; header "GrowMate" | Three cards: **Learning** (each Course where you have a Progress status, with the bar), **Mentoring** (your live Matches as Mentor) and **Mentor check** (approved and refused Courses, only if you named any) | 1 (shell, Mentor check card), 2, 3 |
| Courses | Header | All published Courses: title and one line of description | 1 |
| Course page | Courses row, Home Learning row | Description, your Progress bar for this Course (if any), **Mentors** list with Request, and **Stages** (only unlocked ones) | 1 (description, Mentors list R6), 2 (Request, bar), 3 (Stages) |
| Requests | Header | Pending Requests sent to you, each with Accept. Shown to every Employee, not only Mentors (AD-13) | 2, 4 (group line) |
| Match | Home Learning or Mentoring row | The other person's name, the Course and the bar. Learner: Quit Course. Mentor: Course Completed and Quit Course | 2 |
| Assessment | Course page Stage block | All questions of one Stage on one page, then Submit answers | 3 |
| Assessment result | After Submit answers | Pass or fail and the way back to the Course | 3 |
| Notices | Header | Your in-app notices, newest first | 1 (mechanism, Registration decisions), 2, 3, 4 |
| Upskilling list | Header | Everyone In progress: name, Course, status | 2 |

Employee header: **GrowMate · Home · Courses · Requests · Notices · Upskilling** … theme toggle · *[name]* · Sign out.

### Admin

| Surface | Reached from | Purpose | Epic |
|---|---|---|---|
| Admin Courses | After sign-in; header | Every Course that Admin created, marked Draft or Published; New Course | 1 |
| Course editor | Admin Courses row, New Course | Title and description, then three Stage sections (Bronze, Silver, Gold), each with questions, options, the correct option and the Pass mark. Publish. Read-only once published (AD-14) | 1 |
| Registration decisions | Header | Each undecided Course from each Employee's Mentor check, with Approve and Refuse. Decided rows show the decision and nothing else | 1 |
| Group assignment | Header | Pick a Course, one chosen Employee and several Learners, then Assign | 4 |
| Upskilling list | Header | The same read-only list Employees see | 2 |

Admin header: **GrowMate · Courses · Registration decisions · Group assignment · Upskilling** … theme toggle · *Admin* · Sign out.

Admin has no Notices link (Admin is never a recipient, AD-11), no Requests link and no Match screen (C4).

## Voice and Tone

Microcopy. The aesthetic posture is in `DESIGN.md`, Brand & Style. Plain, short, complete sentences, with no exclamation marks, encouragement, emoji, or "you're X% there". Sentences fixed by the PRD are used verbatim.

| Moment | Copy | Source |
|---|---|---|
| Incoming Request row | "[Learner] requested you to guide them with [Course]" | FR-8, verbatim |
| Accept notice, to the Learner | "[Mentor] is your mentor for [Course]." | FR-8, verbatim |
| Day-3 reminder, to the Mentor | "Reminder: [Learner] requested you to guide them with [Course]." | GrowMate copy |
| Day-3 reminder, to the Learner | "Your request to [Mentor] for [Course] is still waiting." | GrowMate copy |
| Day-6 Cancel, to the Learner | "Your request to [Mentor] for [Course] was cancelled. You can request a mentor again." | FR-9 (tells the Learner to request again); GrowMate wording |
| Day-6 Cancel, to the Mentor | "[Learner]'s request for [Course] was cancelled." | GrowMate copy |
| Quit note, to the other party | "[Name] quit [Course]." followed by the reason, quoted | FR-13; GrowMate wording |
| Bronze available | "Bronze is open for [Course]." | FR-14; GrowMate wording |
| Registration decision, approved | "You can now mentor [Course]." | FR-3; GrowMate wording |
| Registration decision, refused | "You weren't approved to mentor [Course]." | FR-3; GrowMate wording |
| Assessment result | "Passed." / "Not passed." | FR-17; GrowMate wording |

This table holds the notice and result sentences. Confirmation, empty-state, error and accessible-name strings are given where they are used: Component Patterns, State Patterns and Accessibility Floor. All of them go into `copy.ts`.

| Do | Don't |
|---|---|
| "Cancelled" | "Rejected", "Declined", "Ignored" (a Cancel is not a rejection, PRD §1.1) |
| "[Name] quit [Course]." | "Match failed", "Abandoned" (quitting is normal) |
| "No mentors for this course yet." | "Be the first to mentor this course!" (no nudges, C9) |
| "Passed." on Gold, same as on Bronze | "Congratulations, you're a Mentor now!" (Gold is permission, not a prize) |
| Show the API's error `message` as it is | Rewrite or soften refusals in the SPA (AD-2, AD-10) |

## Component Patterns

Behavioural. The visual specs are in `DESIGN.md`, Components.

| Component | Use | Behavioural rules |
|---|---|---|
| Progress bar | Home Learning rows, Course page, Match, Upskilling list | Renders the `progress_status` the API returns: one of the four states, or nothing. It never animates and never changes during a Match. It is never clickable. |
| Mentor list row | Course page, Mentors card | Name and a Request button. The list excludes the viewer (R6), and how each Mentor qualified (the Mentor route) is never shown. The Request button appears only when the API marks the viewer eligible. Otherwise the row shows the name alone, with no explanation. A refused Request (409) shows the API `message` under the row. |
| Request row | Requests | The FR-8 sentence and Accept. There is no Reject button, no reason field and no countdown. One Accept per group is handled in epic 4, which decides the group layout (architecture Deferred). |
| Match actions | Match | Learner: Quit Course. Mentor: Course Completed (primary) and Quit Course (secondary). Course Completed asks for confirmation: "Mark [Learner] ready for Bronze? This ends the match." Quit opens the Quit dialog. |
| Quit dialog | Match | A required reason textarea (it can't be blank) with Cancel and Quit Course. Submitting ends the Match, and the screen returns to Home. |
| Mentor check step | Sign up, step 2 | A checkbox per Course published before the account was created, then Submit or Skip. Either choice is final, and the step never appears again (AD-15). With no published Courses, only Skip is shown. |
| Registration decision row | Registration decisions | Employee name, Course, and Approve and Refuse buttons, both secondary. Clicking either asks for confirmation ("This decision is final."), then the row shows an "Approved" or "Refused" tag in place of the buttons. There is no comment field. |
| Course editor | Admin | Questions are added and removed per Stage. Each question needs at least 2 options with exactly one marked correct (a radio). The Pass mark is a whole number from 1 to 100. Publish is enabled only when all three Stages are complete. It asks for confirmation ("Published courses can't be edited."), then the editor turns read-only. Drafts are saved with a Save button; there is no autosave. |
| Assessment form | Assessment | All questions on one page, one radio group per question. Submit answers is enabled only when every question is answered. A single submission is one attempt. Leaving the page before submitting uses no attempt. Questions are numbered in DOM order. No score is shown. |
| Mentor check card | Home | Shown only to an Employee who named Courses in the Mentor check. Two separate lists, Approved and Refused. A Course that Admin hasn't decided yet appears in neither list. No route, date or comment is shown. |
| Group assignment form | Group assignment (epic 4) | Course, chosen Employee and Learners. An Employee who was refused that Course at registration isn't offered as the chosen Employee. An ineligible Learner gets only the API's generic message (AD-12). Assign has no confirmation, and Learners get no notice. |
| Stage block | Course page | Shows only Stages the API reports as available, Locked or passed; a Stage the Learner hasn't reached yet isn't rendered. Available: a "Take [Stage]" button. Locked: "Locked until [date]" and no button. Passed: "Passed" in plain text. |
| Notice list | Notices | One list, newest first, every notice the same weight. Each is a sentence and a date. A Quit note shows its reason below. Notices have no actions and no links. |
| Upskilling table | Upskilling list | Columns are Name, Course and Status (a bar with its state name). Sorted by name, with no sorting controls, filters or actions. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Loading | Any | The page title shows at once, and "Loading…" appears in `meta` where the content will go. No skeletons or spinners. |
| No Progress status | Course page | No bar is rendered. Nothing else appears in its place. |
| Day 3 passed, still pending | Course page, Requests | Nothing changes visually. The bar stays grey and the Request row stays the same. The reminder exists only as a notice. |
| Learning empty | Home | "You aren't learning a course yet." with a link to Courses. |
| Mentoring empty | Home | The card is hidden when the Employee has no live Matches as Mentor. |
| No Mentors | Course page | "No mentors for this course yet." |
| No Requests | Requests | "No requests." |
| No notices | Notices | "No notices." |
| Upskilling empty | Upskilling list | "No one is in progress." |
| No Courses | Courses, Admin Courses | Employee: "No courses yet." Admin: "No courses yet." plus New Course. |
| Validation error (422) | Forms | Each field's message appears under the field in `field-error`. Focus moves to the first invalid field. |
| Rule refusal (409) | Any action | The API `message` appears in `field-error` next to the action. The screen re-fetches, because the server state has changed. |
| Session expired or signed out (401) | Any | The app goes to Sign in. After signing in, return to the page that was open. |
| Not found or forbidden (403/404) | Any | "Page not found." with a link to Home. A forbidden page looks the same as a missing one, so nothing hidden can be inferred. |
| Published Course | Course editor | Read-only, with a "Published" tag beside the title and no Edit or Save button. |

## Interaction Primitives

- **Pointer and keyboard.** Standard web controls only. There are no custom keyboard shortcuts.
- **One action, one request.** A button disables while its call is in flight, so a double-click can't send twice.
- **Confirmations only for final actions.** These are Course Completed, a Registration decision, Publish and Quit (through its dialog). Request, Accept, Sign up, Submit answers and Assign have no confirmation. Accept and Submit answers have no "Are you sure?" because neither has a reason or comment to give.
- **Theme toggle.** A sun or moon icon button in the top bar switches between light and dark at once. The first visit follows `prefers-color-scheme`; after that the choice is remembered in this browser (`localStorage`, which holds nothing auth-related, AD-9). It has no other settings.
- **No live updates.** A screen shows the state as of its load. A new notice appears on the next navigation or reload, with no polling indicator, toast or sound.
- **Banned everywhere:**
  - unread counts and badges;
  - toasts and celebration animations;
  - progress numbers;
  - "last active" or "days since" text;
  - chat, call or meeting links;
  - drag and drop, and infinite scroll.

## Accessibility Floor

Behavioural. Visual contrast is in `DESIGN.md`, Colors.

- WCAG 2.2 AA, in both light and dark mode.
- **Progress bar.**
  - It is `role="img"` with an accessible name equal to the state ("Progress: In progress").
  - Because three states differ by colour alone, the state name is also shown as plain text beside the bar. This is a status word, not a number or marker, so it stays within FR-20 and C9 (project owner's decision, 2026-11-10).
- **Theme toggle.** A real `<button>` with the accessible name "Switch to dark mode" or "Switch to light mode".
- **Keyboard.** Every action can be reached by keyboard in reading order. Focus is always visible (the DESIGN.md focus ring). Dialogs trap focus, Esc closes them, and focus returns to the button that opened them.
- **Labels.**
  - Every input has a visible `<label>`.
  - Radio groups are `<fieldset>` elements with the question as the `<legend>`.
- **Announcements.**
  - Field errors are linked with `aria-describedby`.
  - A refusal message is announced through an `aria-live="polite"` region.
  - The page title (`<title>` and `<h1>`) changes on every navigation.
- **Text.** User text, such as names, Course text and Quit reasons, is always rendered as text, never as HTML (AD-9).

## Responsive & Platform

- Desktop browsers only, at a viewport width of 1024px and up. Nothing is rearranged for narrower windows, and there is no mobile layout (C1).
- Light and dark mode: the header toggle, starting from `prefers-color-scheme` (see Interaction Primitives). Every colour has a dark twin in `DESIGN.md`.
- The app is served from one origin, the `web` container (AD-1). No route depends on the host name.

## Visibility Rules

This is a GrowMate-specific concern: what each person may see. These rules are binding on every screen (C4, C6, C10, AD-8).

- **Mentor route.** No screen shows why someone is a Mentor. A Course's Mentors list looks the same whether they got there by a Gold pass, a Registration approval or an accepted Group assignment.
- **Group origin.** A Match never shows whether it came from a Group assignment. The only place a group appears is the chosen Employee's own Requests screen, before Accept (epic 4).
- **Quit reason.** It is shown only to the other party of that Match, as their notice. It doesn't appear on Match history, the Course page or the Upskilling list.
- **Admin.**
  - Admin's screens show only what Admin created: Courses, Registration decisions and Group assignments.
  - They never show Request state, Match state, notices, or whether a group was Accepted.
  - An ineligible Learner in the Group assignment form gets only the API's generic message (AD-12).

## Inspiration & Anti-patterns

The project owner named no reference apps to imitate. These anti-patterns come from the PRD's principles:

- **Rejected: streaks, badges, certificates and points.** Gold is permission, not a prize (C8).
- **Rejected: "last active", nudges and "your mentor hasn't replied" banners.** The empty middle is normal (C9).
- **Rejected: a Reject button or "declined" wording.** Silence ends in a Cancel, not a rejection (C5).
- **Rejected: an Admin dashboard of Matches.** Admin is kept out on purpose (C4).
- **Rejected: chat, a meeting link or a calendar on the Match screen.** The click is the record (C7).

## Key Flows

The journeys are the PRD's UJ-1 to UJ-4, with the same names.

### Flow 1 — UJ-1: Priya finds a mentor and earns the right to mentor

1. Priya signs in and lands on Home. Learning says "You aren't learning a course yet."
2. She opens Courses, then "Python Basics". The Mentors card lists Rafi with a Request button.
3. She clicks Request. The page re-fetches: the Request buttons are gone while her Request is pending, and her grey bar ("Not yet started") appears under the description.
4. Rafi sees "Priya requested you to guide them with Python Basics" on Requests and clicks Accept.
5. Priya's notice reads "Rafi is your mentor for Python Basics." Her bar is half blue. It stays that way for weeks while they meet in Teams.
6. Rafi opens the Match, clicks Course Completed and confirms. Priya's notice reads "Bronze is open for Python Basics."
7. On the Course page, the Bronze block offers "Take Bronze". She passes. Silver appears. She fails Silver once, and "Take Silver" is still there. She retakes it and passes. Gold appears, and she passes.
8. **Climax:** Priya's bar turns green ("Completed"). The next Employee to open "Python Basics" sees Priya in the Mentors list, with no badge and no mention of how she got there.

Edge (Lock): Priya fails Silver twice. The Silver block shows "Locked until [date]" with no button, and Gold stays hidden. Her bar stays half blue. After the date, "Take Silver" returns with two attempts.

Edge (day 6): Rafi never answers. On day 3 both see a reminder notice. On day 6 the Request is Cancelled. Priya's notice says she can request a mentor again, her bar disappears, and the Request buttons return.

### Flow 2 — UJ-2: Rafi steps away mid-course

1. Rafi opens his live Match with Priya and clicks Quit Course.
2. The Quit dialog asks for a reason. He types "Moving teams, sorry" and confirms.
3. Rafi lands on Home. The Match is gone from Mentoring.
4. **Climax:** Priya's notice reads "Rafi quit Python Basics." with "Moving teams, sorry" quoted below. Her bar is red ("Quit"). On the Course page the Request buttons are back, and she requests Imani.

Variant (Learner quits): Priya clicks Quit Course on the same screen and writes her own reason. Rafi gets the note, and Priya's bar shows Quit (red) exactly as when Rafi quit. Who quit makes no difference to the bar.

### Flow 3 — UJ-3: Sam joins as an experienced mentor

1. Sam signs up with name, email and password.
2. Step 2, the Mentor check, lists the published Courses. Sam ticks three and clicks Submit. The step never appears again.
3. Noor (Admin) opens Registration decisions and sees three rows for Sam. She approves two and refuses one, confirming each.
4. **Climax:** Sam has three notices. On Home, the Mentor check card (Component Patterns) shows the two approved Courses and the one refused Course as two separate lists. The approved Courses' pages list Sam as a Mentor straight away.

### Flow 4 — UJ-4: Noor (Admin) sets up a course and staffs a group

1. Noor clicks New Course and enters "SQL Fundamentals" and its description.
2. She fills Bronze, Silver and Gold: questions, options, the correct option and the Pass mark for each. Publish stays disabled until all three are complete.
3. She clicks Publish and confirms. The editor turns read-only, and Employees see the Course.
4. On Group assignment she picks the Course, Imani as the chosen Employee, and five Learners. Assign creates five pending Requests. Learners get no notice (epic 4).
5. **Climax:** Imani accepts the group once. Five Matches start, and each Learner sees only "Imani is your mentor for SQL Fundamentals." Imani now appears in the Course's Mentors list. Noor's screens show only the assignment she created, not whether it was Accepted.

Failure (excluded Employee): Sam was refused "SQL Fundamentals" at registration, so the Group assignment form (Component Patterns) doesn't offer Sam as the chosen Employee. A Learner whom R7 would refuse gets only the API's generic message.
