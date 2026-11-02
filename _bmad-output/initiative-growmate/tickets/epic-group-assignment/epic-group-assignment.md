---
type: epic
title: "Admin staffs a Course with a group"
parent: initiative-growmate
covers: [R10, R11, R22]
sources: []
companions: []
after: []
refined: false
risk: low
---

# Admin staffs a Course with a group

## Description

Admin assigns several Learners to one chosen Employee for a Course. Two kinds of exclusion apply:
- an Employee refused that Course at registration can't be the chosen Employee;
- a Learner whom R7 would refuse can't be assigned.

The chosen Employee Accepts the whole group once. That starts independent ordinary Matches and makes them a Mentor through the Group assignment accepted route. This lets Admin staff a Course that has no Mentors yet, for example one published after everyone signed up.

## Outcome

Admin staffs a Course on the deployed app. One Accept turns a group into separate Matches and a new Mentor, and the group origin is never shown.

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

## Notes

- Waits on epic-accounts-courses-first-mentors because: it needs stored refused Registration decisions and the grant-Mentor operation.
- Waits on epic-requests-and-matches because: it needs Requests under the day-3/day-6 clock, Accept, and Matches.
