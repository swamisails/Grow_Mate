---
type: epic
title: "Admin staffs a Course with a group"
parent: initiative-growmate
covers: [R10, R11, R22]
sources: [_bmad-output/initiative-growmate/initiative-growmate.md, _bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md, _bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md]
companions: [_bmad-output/initiative-growmate/glossary.md, _bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md, _bmad-output/initiative-growmate/ux-growmate/DESIGN.md, _bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md]
after: []
refined: true
risk: medium
---

# Admin staffs a Course with a group

## Description

Admin assigns several Learners to one chosen Employee for a Course. Two kinds of exclusion apply:
- an Employee refused that Course at registration can't be the chosen Employee;
- a Learner whom R7 would refuse can't be assigned.

The chosen Employee Accepts the whole group once. That starts independent ordinary Matches and makes them a Mentor through the Group assignment accepted route. This lets Admin staff a Course that has no Mentors yet, for example one published after everyone signed up.

## Outcome

Admin staffs a Course on the deployed app. One Accept turns a group into separate Matches and a new Mentor, and the group origin is never shown.

## Requirements

- R1 (parent R10): Admin assigns one or more Learners to one chosen Employee for a Course on the Group assignment form. This creates one pending Request per Learner with one shared sent time, so the group follows the day-3 and day-6 rules together.
- R2 (parent R10): An Employee refused that Course at registration isn't offered, and is refused, as the chosen Employee. The chosen Employee can't also be one of the Learners and needn't already be a Mentor; no other rule limits the choice.
- R3 (parent R10, R7): If any Learner fails the Request refusals, nothing is created, and each such Learner is marked with one generic message that reveals no reason, Request or Match state.
- R4 (parent R10): After Assign, Admin sees the created assignment once and nothing afterwards: no history list and no Accepted state. Learners get no assignment notice.
- R5 (parent R11): The chosen Employee sees the pending group as one block naming each Learner, with one Accept for the whole group. Accept creates one independent Match per Learner and makes the chosen Employee a Mentor for the Course through the grant-Mentor operation with the route Group assignment accepted. A group that is never Accepted is Cancelled together on day 6 and grants nothing.
- R6 (parent R22): The chosen Employee receives a new-Request notice for each Request of the group. Nothing but their own pending group block reveals the group, and after Accept each Match and notice looks like any one-to-one one.

## Constraints

- Binding: C4 (Admin's closed feature list; no view of Requests or Matches), C5 (no reason or comment on a Group assignment), C6 (no group origin or Mentor route shown), C10 (stored data), C11 (deployed means the Docker stack).

## Done when

- Admin assigns Learners to a chosen Employee. A refused Employee and any Learner R7 would refuse are blocked from selection. Each Request runs on the day-3/day-6 clock.
- One Accept creates one independent Match per Learner and makes the chosen Employee a Mentor for future Requests. A group that is never Accepted grants nothing.
- Learners get no assignment notice, only the ordinary Accept line. The chosen Employee gets a new-Request notice per Request, and no screen shows group origin. This is verified end to end on the deployed app.

## Boundaries

- In: the Group assignment action and its exclusions, whole-group Accept, the Group assignment accepted route in use, and the group's new-Request notices.
- Out: the Request, clock, Accept and Match mechanics (epic 2). The Mentor-route record (epic 1).
- Must not change: no group origin or route shown to Employees (C6). The Admin feature list stays closed (C4).

## References

- parent — `_bmad-output/initiative-growmate/initiative-growmate.md`. Requirements R10, R11 and R22 (the group's new-Request notices). Constraints C4–C10. The Notes Decision on R7 refusals.
- glossary — `_bmad-output/initiative-growmate/glossary.md`
- prd — `_bmad-output/initiative-growmate/prd-growmate/prd-growmate.md`, §4.4, §4.8.
- architecture — `_bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md`, AD-7, AD-8 (exceptions 1 and 3), AD-9 (the one admin Matching endpoint), AD-12, AD-13.
- design — `_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md`: Information Architecture (Group assignment, Requests), Component Patterns (Request row group block, Group assignment form), Visibility Rules, Key Flow 4.
- mock-up — `_bmad-output/initiative-growmate/ux-growmate/mockups/epic4-group-assignment.html`.

## Notes

- Waits on epic-accounts-courses-first-mentors because: it needs stored refused Registration decisions and the grant-Mentor operation.
- Waits on epic-requests-and-matches because: it needs Requests under the day-3/day-6 clock, Accept, and Matches.
- Decision (2026-11-10): the group shows as one block on the chosen Employee's Requests screen, "[A], [B] and [C] requested you to guide them with [Course]", with one Accept; names only, no count (pick 4.1; settles architecture Deferred).
- Decision (2026-11-10): Group assignment is all or nothing; each ineligible Learner is marked with the generic message (pick 4.2).
- Decision (2026-11-10): the chosen Employee can't be one of the Learners; no other rule, so Admin learns nothing about Matches; at least one Learner, no maximum (pick 4.3).
- Decision (2026-11-10): the form is a checkbox list of Employees (Admin and the chosen Employee removed); after Assign it shows the created assignment once, with no history list (pick 4.4).
- Decision (2026-11-10): every Request in a group shares one sent time, so the group is reminded and Cancelled together (pick 4.5).
- Decision (2026-11-10): the epic is refined (Requirements R1–R6) and the UX spines are adopted as companions.
- Decision (2026-11-10): assigned Learners get the day-3 and day-6 notices like any Learner; they reveal no group origin.
- Decision (2026-11-10): the Course select offers only published Courses, and the API refuses a draft.
- Decision (2026-11-10): the form's reads are an Admin Employee-list read in Accounts (entry 1) and a refused-for-Course read in Mentors (entry 3); the architecture's Module creation table needs epic 4 to extend Accounts and Mentors.
- Decision (2026-11-10): epics 3 and 4 may run in parallel; their shared files only take additions.
- Decision (2026-11-10): the tracer bullet is entry 1, "Admin assigns a group and the chosen Employee sees it". Sequencing: 2 (group Accept) and 3 (refusals) in parallel after 1, then the Refactor sweep (4) and the closing end-to-end suite (5).
- Decision (2026-11-10): the architecture spine's Module creation table and Capability map now carry this correction (bmad-architecture update).
