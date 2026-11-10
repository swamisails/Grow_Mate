---
type: epic
title: "Accounts, Courses and the first Mentors"
parent: initiative-growmate
covers: [R1, R2, R3, R4, R5, R6, R22]
sources: [_bmad-output/initiative-growmate/initiative-growmate.md, _bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md, _bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md]
companions: [_bmad-output/initiative-growmate/glossary.md, _bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md, _bmad-output/initiative-growmate/ux-growmate/DESIGN.md, _bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md]
after: []
refined: true
risk: high
---

# Accounts, Courses and the first Mentors

## Description

On the deployed web app, Employees sign up and sign in, and Admin publishes Courses with three Stage Assessments. Admin's Registration decisions create the first Mentors, and each Course lists its Mentors. This must come first: Gold pass can't produce a Mentor until one already exists.

This is the opening epic. It owns the shared foundations later epics build on:
- the platform baseline, plus the seed data and end-to-end test harness;
- the SPA shell from the UX spines;
- the in-app notification mechanism;
- the Mentor-route record, with all three route values and one grant-Mentor operation;
- the stored refused Registration decisions.

## Outcome

Admin can publish a complete Course on the deployed app, and an Employee who names it at signup becomes its Mentor through Admin's approval. This is the first step of the initiative's tracer path.

## Requirements

- R1 (parent R1): A visitor can create an Employee account with name, email and password, then sign in and sign out. A duplicate email is refused. Admin exists from setup, with email and password from environment variables, in every environment, and can't be created through signup.
- R2 (parent R2): Straight after signup, the Employee submits the Mentor check exactly once: one or more Courses published before their account was created, or Skip. The server refuses a second submission and any Course published later. Until the Employee submits or skips, the step shows again at their next sign-in.
- R3 (parent R3): Admin approves or refuses each undecided Mentor-check Course separately, with no score or comment, after a confirmation. Approval makes the Employee a Mentor for that Course at once. A refusal is stored. Decisions can't change.
- R4 (parent R3, R22): The Employee receives one in-app notice per Registration decision, and sees approved and refused Courses as two separate lists on Home. An undecided Course appears in neither.
- R5 (parent R4, R5): Admin creates and edits a draft Course: a title, a description, and for each of Bronze, Silver and Gold a multiple-choice Assessment and a Pass mark. Each Stage has at least one question, each question has at least two options with exactly one correct, and a Pass mark is a whole number from 1 to 100. Drafts are saved explicitly.
- R6 (parent R4, R5): Admin can publish a Course only when all three Stages are complete, after a confirmation. Publishing makes the Course visible to every Employee and freezes its Stages, questions, options and Pass marks. An incomplete Course can't be published and isn't visible. There is no unpublish or delete.
- R7 (parent R6): An Employee viewing a published Course sees every Mentor for it, excluding themselves, without the Mentor route.
- R8 (parent R3; initiative Decision 2026-11-02): One grant-Mentor operation records one Mentor status per Employee and Course, with the route Gold pass, Registration approval or Group assignment accepted. A later grant for the same pair changes nothing, so the first route is kept. This epic uses only Registration approval.
- R9 (parent R22): In-app notices reach Employees only, never Admin. They are listed on Notices, newest first, with no unread count. This epic sends only the Registration-decision notice; later epics add notice types without changing the notice shape.
- R10 (initiative C11; Decisions 2026-11-02 and 2026-11-10): The app runs as the Docker stack in the `local`, `e2e` and `production` environments. Seeders run Admin, then Courses, then Employees, with demo data only in `local` and `e2e`. The Playwright end-to-end harness runs against the `e2e` stack.
- R11 (EXPERIENCE.md, Information Architecture): The SPA shell gives each role its own top bar (Employee and Admin), a light and dark toggle that starts from the operating system's setting, a page header on every page, and a Not found state. All user-facing wording lives in one copy file.

## Constraints

- Owned here: C1 (desktop browsers only), C2 (email and password accounts, exactly one Admin, no Admin roles), C3 (in-app notices only).
- Binding: C4 (Admin's closed feature list), C5 (no reason or comment except on Quit), C6 (no Mentor route or group origin shown), C7 (no chat or integrations), C8 (no rewards), C9 (no helper text, nudges or counters), C10 (stored data and Quit-reason privacy), C11 (deployed means the Docker stack; the test clock exists only in `e2e`).

## Done when

- The app is deployed as the Docker stack, and Admin (seeded at setup) and a new Employee can sign in from a desktop browser, in light and dark mode.
- Admin publishes a Course only once all three Assessments and Pass marks exist. An incomplete Course stays invisible, and a published one can't be edited.
- An Employee names Courses in the Mentor check at signup. Admin approves some and refuses others. The Employee sees an in-app notice per decision and two separate lists, and the approved Courses' pages list the Employee as a Mentor.
- The seed data (Admin, then Courses, then Employees) and the Playwright harness run against the `e2e` stack, and UJ-3 passes end to end.

## Boundaries

- In: the platform baseline and SPA shell, accounts, Course and Assessment authoring, publishing, the Mentor check, Registration decisions, the Course Mentor list, the notification mechanism and Notices page, the Mentor-route record and its grant-Mentor operation.
- Out: Requests, Matches and the clock (epic 2). Taking Assessments, and the Gold pass route in use (epic 3). Group assignment (epic 4).
- Must not change: Registration decisions carry no score or comment and are final (C4, C5). The Mentor route is never shown to Employees (C6).

## References

- parent — `_bmad-output/initiative-growmate/initiative-growmate.md`, Requirements R1–R6 and R22 (mechanism and Registration-decision notice), Constraints C1–C11, Notes.
- glossary — `_bmad-output/initiative-growmate/glossary.md`
- prd — `_bmad-output/initiative-growmate/prd-growmate/prd-growmate.md`, §4.1, §4.2, §4.3 (FR-6), §4.8, §8.
- architecture — `_bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md`, AD-1 to AD-17; Module creation by epic (epic 1 creates Accounts, Courses, Mentors, Notifications, the SPA shell and `e2e/`).
- design — `_bmad-output/initiative-growmate/ux-growmate/DESIGN.md`, all sections (tokens, light and dark).
- design — `_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md`: Information Architecture (Employee: Sign in, Sign up, Mentor check, Home, Courses, Course page, Notices; Admin: Admin Courses, Course editor, Registration decisions), Voice and Tone (Registration-decision notices), Component Patterns (Mentor list row, Mentor check step, Mentor check card, Registration decision row, Course editor, Notice list), State Patterns, Accessibility Floor, Visibility Rules, Key Flows (Flow 3 UJ-3, Flow 4 steps 1–3).
- mock-up — `_bmad-output/initiative-growmate/ux-growmate/mockups/course-page.html` (the Course page's Mentors card).

## Notes

- Decision (2026-11-10): R6, the Course Mentor list, moves here from epic-requests-and-matches, so this epic's end is visible on screen and epic 3's outcome ("appears in the Mentor list") has the list it needs.
- Decision (2026-11-10): the end-to-end test tool is Playwright (architecture Deferred).
- Decision (2026-11-10): the SPA uses plain CSS with no UI component library (architecture Deferred; AD-16 bare surface). The visual identity comes from the `bmad-ux` run.
- Decision (2026-11-10): Assessment authoring rules: each Stage has at least 1 question; each question has at least 2 options and exactly one correct option; a Pass mark is a whole number from 1 to 100. An unpublished Course stays editable; there is no unpublish and no delete.
- Decision (2026-11-10): Admin's email and password come from environment variables, and Admin is seeded in every environment. Demo Courses and Employees are seeded only in `local` and `e2e`.
- Decision (2026-11-10): left to the stories: password rules (Laravel defaults), one notice per Registration decision, and an inbox with no unread counter (C9).
- Decision (2026-11-10): the `ux-growmate` spines are adopted as companions, and this epic is refined (Requirements R1–R11).
- Decision (2026-11-10): the tracer bullet is entry 1, "Admin signs in on the deployed stack": the Docker stack, Sanctum sign-in, a bare SPA, the Admin seed and the Playwright harness. The rest of the shell is split into entry 11, built straight after it, so the tracer stays thin.
- Decision (2026-11-10): sequencing: 1, then 11, then 2 (Course authoring, the least certain story) and 3 (Employee accounts) in parallel; 4 after both; 5 after 4; 6 after 3, 4 and 5 (6 shares the Mentors module with 5); 7 after 5 and 6; 8 after 7; the Refactor sweep (9) after all of them; the closing end-to-end suite (10) last.
- Decision (2026-11-10): an Employee who leaves signup before the Mentor check sees the step again at their next sign-in until they submit or skip (R2).
- Decision (2026-11-10): seeding: the Accounts seeder seeds only Admin; the Courses seeder seeds demo published Courses; the Mentors seeder seeds demo Employees and their Mentor grants, so the order is Admin, then Courses, then Employees (R10, AD-17).
- Decision (2026-11-10): demo Mentors are granted with the Registration approval route and no Mentor check or Registration decision rows behind them; the route is never shown.
- Decision (2026-11-10): entries 2 and 3 run in parallel; each feature registers its own routes, which keeps their shared files (router, copy file) apart.
