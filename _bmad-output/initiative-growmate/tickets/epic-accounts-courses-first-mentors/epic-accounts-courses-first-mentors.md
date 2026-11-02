---
type: epic
title: "Accounts, Courses and the first Mentors"
parent: initiative-growmate
covers: [R1, R2, R3, R4, R5, R22]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Accounts, Courses and the first Mentors

## Description

On the deployed web app, Employees sign up and sign in, and Admin publishes Courses with three Stage Assessments. Admin's Registration decisions create the first Mentors. This must come first: Gold pass can't produce a Mentor until one already exists.

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

- In: the platform baseline, accounts, Course and Assessment authoring, the Mentor check, Registration decisions, the notification mechanism, the Mentor-route record and its grant-Mentor operation.
- Out: Requests, Matches and the clock (epic 2). Taking Assessments, and the Gold pass route in use (epic 3). Group assignment (epic 4).
- Must not change: Registration decisions carry no score or comment and are final (C4, C5). The Mentor route is never shown to Employees (C6).

## References

- parent — `_bmad-output/initiative-growmate/initiative-growmate.md`, Requirements R1–R5 and R22 (mechanism and Registration-decision notice), Constraints C1–C3 (owned here) and C4–C10 (binding), Notes.
- glossary — `_bmad-output/initiative-growmate/glossary.md`
- prd — `_bmad-output/initiative-growmate/prd-growmate/prd-growmate.md`, §4.1, §4.2, §4.8, §8.

## Notes

- Waits on architecture because: the stack, the data model (including the Mentor-route record), the notification mechanism, the controllable clock and the deploy target are to be settled by a `bmad-architecture` run before this epic's stories (initiative Decision, 2026-11-02).
