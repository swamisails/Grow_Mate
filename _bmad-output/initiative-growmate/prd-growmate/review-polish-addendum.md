# Editorial Review — PRD Addendum (structure + prose)

**Purpose read:** This document exists to help PRD readers (product, architecture, reviewers) look up why an alternative was rejected, what the market research said, and which source artifact each decision came from, without reading the source artifacts themselves.

**Reader type:** humans. **Structure model:** Reference/Database (random access, consistent schema, MECE). Word count: 859 total (§A 456, §B 233, §C 136, intro 12).

| Pass | Original Text | Revised Text | Changes |
|---|---|---|---|
| structure | §A table, "Reason / source" column, all 23 rows (~456 words) | CONDENSE: split into two columns, `Source` and `Reason`. Move the inline source tags ("Brainstorm:", "Forge:", "Party mode:", "(brainstorm)", "Rejected in the brainstorm.") into `Source`; list both where a row has two (e.g. row "In-app chat": Brainstorm; Party mode; row "Admin guidance…": Forge; Party mode; Design-thinking). | The source sits at the start, the end, or inside the sentence depending on the row, so readers can't scan by source. A consistent schema is the Reference model's core rule. About 0 net words (the tags move, they are not cut). |
| structure | §A row "Admin guidance or evidence standard for Registration decisions" (last row, ~30 words) | MOVE to directly after row "One approval stamp for the whole registration list" | The rows are grouped by topic, but this registration-decision row sits at the end, away from the other registration/Mentor-route rows. 0 words. |
| structure | Intro line "Depth that informs the PRD but doesn't belong in its main body." | QUESTION: add one sentence: "Source names in §A (brainstorm, forge, party mode, design-thinking) refer to the artifacts listed in §C." | §A cites sources by short name 23 times, but those names are only resolved in §C at the end. Random-access readers need the pointer. About +18 words. |
| prose | Forge added Registration approval and Group assignment accepted. | Forge added two routes: Registration approval and accepted Group assignment. | "Group assignment accepted" reads as a past-tense clause ("the assignment was accepted"), not as the name of a route. |
| prose | Peer-reviewed predictors are training quality and participants' input into the mentoring process (Allen, Eby & Lentz 2006). | Peer-reviewed research names two predictors: training quality and participants' input into the mentoring process (Allen, Eby & Lentz 2006). | The research is peer-reviewed, not the predictors. The fix keeps both predictors and the citation. |
| prose | Winston's "lamp" (activity indicator on the bar) / Dana: "yes or no is enough to ship" | Consider: Winston's (architect persona) "lamp" (activity indicator on the bar) / Dana (<role>): "yes or no is enough to ship"? | The two people are named without saying who they are, and a human reader outside the sessions can't place them. Two locations in §A. Confirm the roles before applying. |
| prose | Microsoft allows a retake after 24 hours, then waits 14 days, with a cap of 5 a year. | Consider: Microsoft allows a retake after 24 hours, then requires 14 days between further retakes, with a cap of 5 a year? | "then waits 14 days" doesn't say who waits or before what. Check the wording against the research report before applying. |
| prose | Forge: an Employee can name several. | Forge: an Employee can name several courses. | "several" has no noun. The row header says "one course", but the reader has to infer it. |

2 further minor fixes; ask to expand (lowercase "mentor for the group" vs. capitalised Mentor/Group elsewhere; "README.MD is excluded" does not say excluded from what).

**Summary:** 3 structure recommendations, 5 prose fixes shown. If all are accepted, the document is about the same length or slightly longer: about +18 words (+2% of 859). There is no reduction, and none is warranted, because the addendum is already dense. No length target was given. No comprehension trade-offs: nothing is cut.
