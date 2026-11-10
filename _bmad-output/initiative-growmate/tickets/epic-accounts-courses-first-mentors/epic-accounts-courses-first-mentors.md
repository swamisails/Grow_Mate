---
type: epic
title: "Accounts, Courses and the first Mentors"
parent: initiative-growmate
covers: [R1, R2, R3, R4, R5, R6, R22]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Accounts, Courses and the first Mentors

## Description

On the deployed web app, Employees sign up and sign in, and Admin publishes Courses with three Stage Assessments. Admin's Registration decisions create the first Mentors, and each Course lists its Mentors. This must come first: Gold pass can't produce a Mentor until one already exists.

This is the opening epic. It owns the shared foundations later epics build on:
- the platform baseline, plus the seed data and end-to-end test harness;
- the in-app notification mechanism;
- the Mentor-route record, with all three route values and one grant-Mentor operation;
- the stored refused Registration decisions.

## Outcome

Admin can publish a complete Course on the deployed app, and an Employee who names it at signup becomes its Mentor through Admin's approval. This is the first step of the initiative's tracer path.

## Done when

- The app is deployed, and Admin (seeded at setup) and a new Employee can sign in from a desktop browser.
- Admin publishes a Course only once all three Assessments and Pass marks exist. An incomplete Course stays invisible.
- An Employee names Courses in the Mentor check at signup. Admin approves some and refuses others. The Employee sees two separate lists and an in-app notice. Approved Courses list the Employee as a Mentor.
- The seed data (Admin, then Courses, then Employees) and the end-to-end test harness run against the deployed app.

## Boundaries

- In: the platform baseline, accounts, Course and Assessment authoring, the Mentor check, Registration decisions, the Course Mentor list (R6), the notification mechanism, the Mentor-route record and its grant-Mentor operation.
- Out: Requests, Matches and the clock (epic 2). Taking Assessments, and the Gold pass route in use (epic 3). Group assignment (epic 4).
- Must not change: Registration decisions carry no score or comment and are final (C4, C5). The Mentor route is never shown to Employees (C6).

## References

- parent — `_bmad-output/initiative-growmate/initiative-growmate.md`, Requirements R1–R6 and R22 (mechanism and Registration-decision notice), Constraints C1–C3 (owned here) and C4–C10 (binding), Notes.
- glossary — `_bmad-output/initiative-growmate/glossary.md`
- prd — `_bmad-output/initiative-growmate/prd-growmate/prd-growmate.md`, §4.1, §4.2, §4.3 (FR-6), §4.8, §8.
- architecture — `_bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md`, AD-1 to AD-17; Module creation by epic (epic 1 creates Accounts, Courses, Mentors, Notifications, the SPA shell and `e2e/`).

## Notes

- Decision (2026-11-10): R6, the Course Mentor list, moves here from epic-requests-and-matches, so this epic's end is visible on screen and epic 3's outcome ("appears in the Mentor list") has the list it needs.
- Decision (2026-11-10): the end-to-end test tool is Playwright (architecture Deferred).
- Decision (2026-11-10): the SPA uses plain CSS with no UI component library (architecture Deferred; AD-16 bare surface). The visual identity comes from the `bmad-ux` run.
- Decision (2026-11-10): Assessment authoring rules: each Stage has at least 1 question; each question has at least 2 options and exactly one correct option; a Pass mark is a whole number from 1 to 100. An unpublished Course stays editable; there is no unpublish and no delete.
- Decision (2026-11-10): Admin's email and password come from environment variables, and Admin is seeded in every environment. Demo Courses and Employees are seeded only in `local` and `e2e`.
- Decision (2026-11-10): left to the stories: password rules (Laravel defaults), one notice per Registration decision, and an inbox with no unread counter (C9).
- Decision (2026-11-10): a `bmad-ux` run for the whole app (`ux-growmate/` in the initiative folder) comes before this epic's Requirements are written.
