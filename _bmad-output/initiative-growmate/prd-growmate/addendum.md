# GrowMate PRD — Addendum

Depth that informs the PRD but doesn't belong in its main body. Source names in §A (brainstorm, forge, party mode, design-thinking) refer to the artifacts listed in §C.

## A. Rejected alternatives (and why)

| Rejected | Source | Reason |
|---|---|---|
| Badges, certificates, résumé lines | Brainstorm | "No certificate, no badge, and no resume line is added." Gold is permission, not a prize. |
| Reject button on Requests | Brainstorm | It was offered, removed, re-added, then removed again. Silence plus the day-6 Cancel replaces it. |
| Required reason on Requests | Brainstorm | Replaced with "The request itself is enough." |
| Mentor availability calendar, Admin suspension | Brainstorm | They never entered Admin's closed feature list. |
| Admin verification with criteria and appeals | Brainstorm; forge | The forge brought back only a bare per-Course yes or no at registration. |
| Day-6 extras: suggesting other Mentors, request limits, an Admin view of ignored Requests | Brainstorm | Admin is kept out, and the calendar was dropped. |
| Gold as the only Mentor route | Forge | It added two routes: Registration approval and accepted Group assignment. |
| Mentorship granted at registration without an Admin decision | Forge | Every named Course needs Admin's yes. |
| Mentor check limited to one course | Forge | An Employee can name several courses. The forge's "more than one course" is read as "several allowed", so the PRD says "one or more" (user-accepted default, 30 Oct). |
| One approval stamp for the whole registration list | Forge | The decision is per Course. |
| Admin guidance or evidence standard for Registration decisions | Forge; party mode; design-thinking | The forge left it "accepted, not solved". Party mode and design-thinking then closed it as ordinary ("a bare yes/no"). Dana: "yes or no is enough to ship". |
| Group assignment limited to existing Mentors | Forge | Admin may assign anyone, who becomes a Mentor on Accept. Exception added 30 Oct: not someone refused that Course at registration. |
| Assignment making someone a Mentor for the Group only | Forge | Accept makes them a Mentor for the Course, for future Requests too. |
| Mentorship starting when Admin selects the person | Forge | It starts only on Accept. |
| Course Completed meaning "the sessions are over" | Forge | It means "ready for the Assessment". |
| Timer that ends a live Match | Forge | A Match ends only on Quit or Course Completed. |
| Separate "Enable Assessment" step | Brainstorm | The Course Completed click itself opens Bronze. |
| Points-ranked or Admin-only leaderboard | Brainstorm | Replaced by a plain Upskilling list ("Rank does not trigger anything"). |
| In-app chat | Brainstorm; party mode | "No message thread, no in-app calls"; reaffirmed as "The click is the record". |
| Winston's (architect persona) "lamp", an activity indicator on the bar | Party mode | Overruled. The bar stays plain. |
| Reading the half-blue bar as "halfway done" | Party mode | Half blue means "in progress". |

## B. Market-research context (30 Oct 2026)

Source: `_bmad-output/research-growmate-market/research-growmate-market.md`. The research informs; it doesn't decide.
- **Build vs buy.** The research recommends building only if the Gold-pass route is the main way to become a Mentor. GrowMate has three routes, which points toward buying for a real company. This PRD builds in-house because it is a practice project, so the buy path and the "check existing HR-suite licences" recommendation don't apply.
- **Vendor fit.** None of the nine mentoring products and HR-suite modules checked implement the Gold-pass route. Registration approval maps onto admin-approved mentor applications (Chronus, PushFar, SAP SuccessFactors). Admin-assigned mentors map onto Workday's admin-assign report.
- **Mentor supply.** Mentors are already scarce (Robert Half 2025; Future Skills Centre 2025), so every gate on Mentor supply has a cost.
- **Retake norms.** Microsoft allows a retake after 24 hours, then requires 14 days between further retakes, with a cap of 5 a year. AWS waits 14 days. GrowMate allows an immediate second attempt and locks only after two failures. The user kept the Lock fixed at one month, with no Admin setting (2 Nov 2026).
- **What predicts good outcomes.** Peer-reviewed research names two predictors: training quality and participants' input into the mentoring process (Allen, Eby & Lentz 2006). Mentor training is a v2 idea; it is a Non-Goal for this PRD.
- **Component reuse.** If built, reuse components rather than write them from scratch. For example, Moodle-style quiz engines already support pass marks and enforced delays between attempts. This is a candidate input for architecture.

## C. Source map

| Artifact | Date | Used for |
|---|---|---|
| brainstorm-growmate-product-plan/ | 24 Oct 2026 | Core loop, Request clock, Quit, Retake rule, Admin's closed list, no rewards, no chat, "stages belong to the course" |
| forge-growmate/ | 26 Oct 2026 | Three Mentor routes, meaning of Course Completed, no auto-ending, registration not rerun |
| party-mode/ | 26 Oct 2026 | Bar semantics, no lamp, bare yes/no is ordinary, route not shown |
| design-thinking-2026-10-26.md | 26 Oct 2026 | Pains treated as normal, status colours, one-line Accept view, match forgets its origin |
| research-growmate-market/ | 30 Oct 2026 | Open Question 1; build-vs-buy context (informs only) |
| extract-inputs.md, reconcile-*.md, review-*.md (this folder) | 30 Oct 2026 | Extraction, input reconciliation, rubric and polish reviews |

README.MD is excluded as a source for this PRD, by the user's decision.
