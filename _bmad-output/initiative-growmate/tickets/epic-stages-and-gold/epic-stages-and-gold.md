---
type: epic
title: "Learners prove the Course and become Mentors"
parent: initiative-growmate
covers: [R16, R17, R18, R19, R20]
sources: [_bmad-output/initiative-growmate/initiative-growmate.md, _bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md, _bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md]
companions: [_bmad-output/initiative-growmate/glossary.md, _bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md, _bmad-output/initiative-growmate/ux-growmate/DESIGN.md, _bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md]
after: []
refined: true
risk: medium
---

# Learners prove the Course and become Mentors

## Description

After Course Completed, a Learner takes Bronze, Silver and Gold in order, each scored against its Pass mark. Failures follow the Retake rule, with its fixed one-month Lock on epic 2's clock. Passing Gold makes the Learner a Mentor for that Course through epic 1's grant-Mentor operation, so the Course gains one more Mentor. This closes the loop the initiative exists to prove (SM-2).

## Outcome

A Learner who was judged ready passes Gold on the deployed app and appears in that Course's Mentor list.

## Requirements

- R1 (parent R16): Bronze becomes available only after Course Completed, Silver only after Bronze is passed, and Gold only after Silver is passed. A Stage that isn't yet available isn't shown.
- R2 (parent R17): A Learner answers every question of an available Stage on one page, in the order Admin authored, and submits once. The attempt passes when correct answers × 100 ≥ Pass mark × number of questions, judged at submission and stored with the Pass mark used. The Learner sees only "Passed." or "Not passed.", and which option is correct never reaches the Learner.
- R3 (parent R18): A Learner gets two attempts per Stage, the second immediately. Two failures Lock the Stage until one calendar month after the second failure, shown as "Locked until [date]", and later Stages stay hidden. After the Lock, two attempts return, repeating without limit. No one can change the month.
- R4 (parent R18): Stage progress and Locks belong to the Learner and the Course, and survive any Quit or new Match.
- R5 (parent R19): Passing Gold makes the Learner a Mentor for that Course through the grant-Mentor operation with the route Gold pass, which changes nothing if they're already a Mentor there, and sets their status to Completed. No badge, certificate, points or résumé entry is created, and no Stage result sends a notice.
- R6 (parent R20): In progress continues through the Stages, and Completed shows as a full green bar with its state word wherever the bar appears.
- R7 (initiative Done when; prd SM-2): A Learner who passes Gold appears in that Course's Mentors list and can Accept a Request.

## Constraints

- Binding: C4 (Admin has no view of Stage attempts), C6 (no Mentor route shown), C8 (no rewards of any kind), C9 (no numbers, scores or markers on the bar or results), C10 (attempts, scores and Locks are stored), C11 (deployed means the Docker stack; the test clock exists only in `e2e`).

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

- parent — `_bmad-output/initiative-growmate/initiative-growmate.md`. Requirements R16–R19 and R20 (the Completed part, with In progress through the Stages). Constraints C4–C11.
- glossary — `_bmad-output/initiative-growmate/glossary.md`
- prd — `_bmad-output/initiative-growmate/prd-growmate/prd-growmate.md`, §4.6, §4.7.
- architecture — `_bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md`, AD-2, AD-4, AD-5, AD-6, AD-7, AD-14; Module creation by epic (epic 3 creates Assessments and extends Progress).
- design — `_bmad-output/initiative-growmate/ux-growmate/DESIGN.md`, Components (Stage block, Option list, Progress bar).
- design — `_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md`: Information Architecture (Course page Stages, Assessment, Assessment result), Voice and Tone (Assessment result), Component Patterns (Assessment form, Stage block), Key Flow 1 (with Edge: Lock).
- mock-up — `_bmad-output/initiative-growmate/ux-growmate/mockups/epic3-assessments.html`.

## Notes

- Waits on epic-accounts-courses-first-mentors because: it needs Stage Assessments with Pass marks, and the grant-Mentor operation.
- Waits on epic-requests-and-matches because: it needs Course Completed unlocking Bronze, the Progress status model, and the controllable clock.
- Decision (2026-11-10): an attempt passes when correct × 100 ≥ Pass mark × questions, with no rounding (pick 3.1).
- Decision (2026-11-10): questions and options appear in Admin's authored order, with no shuffling (pick 3.2).
- Decision (2026-11-10): no notice is sent for any Stage result or for a Gold-pass grant; R22's list is closed (pick 3.3).
- Decision (2026-11-10): an Employee approved as a Mentor while learning the same Course carries on; a later Gold pass is a no-op grant (first route kept) and still sets Completed; nothing is shown (pick 3.4).
- Decision (2026-11-10): the epic is refined (Requirements R1–R7) and the UX spines are adopted as companions.
- Decision (2026-11-10): R4 is guaranteed by keying Stage attempts and Locks on Learner and Course with no Match reference, and is checked by an API test; while R7's refusals hold, a Learner with Stage progress can't Quit or start a new Match on that Course.
- Decision (2026-11-10): epic 3 sends no notices, so it doesn't extend Notifications; it extends Courses with AD-14's taking read. The architecture's Module creation table needs that correction.
- Decision (2026-11-10): epics 3 and 4 may run in parallel; their shared files (the copy file, routes/api.php, the seeder order) only take additions.
- Decision (2026-11-10): the tracer bullet is entry 1, "A Learner takes Bronze and sees the result". Sequencing: a single chain 1, 2 (the Retake rule and Lock, least certain), 3, 4, then the Refactor sweep (5) and the closing end-to-end suite (6).
