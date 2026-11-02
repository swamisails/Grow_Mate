---
type: epic
title: "Learners prove the Course and become Mentors"
parent: initiative-growmate
covers: [R16, R17, R18, R19, R20]
sources: []
companions: []
after: []
refined: false
risk: medium
---

# Learners prove the Course and become Mentors

## Description

After Course Completed, a Learner takes Bronze, Silver and Gold in order, each scored against its Pass mark. Failures follow the Retake rule, with its fixed one-month Lock on epic 2's clock. Passing Gold makes the Learner a Mentor for that Course through epic 1's grant-Mentor operation, so the Course gains one more Mentor. This closes the loop the initiative exists to prove (SM-2).

## Outcome

A Learner who was judged ready passes Gold on the deployed app and appears in that Course's Mentor list.

## Done when

- Stages unlock only in order after Course Completed. A Stage that isn't yet unlocked isn't shown.
- An Assessment is answered in one attempt, auto-scored, and shown as pass or fail against the Pass mark.
- Two failures Lock a Stage for one month, which no one can change, and hide later Stages. After the Lock, two attempts return. Stage progress and Locks survive Quit and new Matches. Tests drive the clock without waiting real time.
- Passing Gold grants Mentor status through the Gold pass route and sets Completed (green). It creates no badge, certificate or points. This is verified end to end on the deployed app, including a newly Gold Mentor Accepting a Request.

## Boundaries

- In: Assessment taking and scoring, sequential Stages, the Retake rule and Lock, the Gold pass route, and the Completed state (with In progress continuing through the Stages).
- Out: Course Completed and the clock itself (epic 2). The Mentor-route record and its grant operation (epic 1, used here). Group assignment (epic 4).
- Must not change: no rewards of any kind (C8). The bar carries no numbers or markers (C9).

## References

- parent — `_bmad-output/initiative-growmate/initiative-growmate.md`. Requirements R16–R19 and R20 (the Completed part, with In progress through the Stages). Constraints C4–C10.
- glossary — `_bmad-output/initiative-growmate/glossary.md`
- prd — `_bmad-output/initiative-growmate/prd-growmate/prd-growmate.md`, §4.6, §4.7.

## Notes

- Waits on epic-accounts-courses-first-mentors because: it needs Stage Assessments with Pass marks, and the grant-Mentor operation.
- Waits on epic-requests-and-matches because: it needs Course Completed unlocking Bronze, the Progress status model, and the controllable clock.
