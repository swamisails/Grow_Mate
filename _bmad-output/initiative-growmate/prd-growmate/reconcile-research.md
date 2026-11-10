# Reconcile: PRD vs market research

- **Input:** `_bmad-output/research-growmate-market/research-growmate-market.md` (30 Oct 2026, confidence: medium)
- **Checked against:** `prd-growmate.md`, `addendum.md` §B
- **Treatment:** the research is evidence. Where the PRD follows the planning artifacts over a research recommendation, this file does not flag it. That covers the one-month Lock (OQ1) and no badges (addendum A).

## Gaps

1. **The build-vs-buy decision is never stated.** The research exists to answer "build in-house vs buy" and the decision it recommends taking first (Rec 1). Neither the PRD nor the addendum says what was decided or why. The likely answer is "build, because building is the point of a practice project" (JTBD "Builder (practice)", `stakes: practice project`). Without that line, a reader of addendum §B ("Building in-house is justified only if that route is firm") cannot tell whether the PRD met the research's condition. *Suggest:* add one sentence to the addendum, or an Open Question if the decision is genuinely open.
2. **Rec 1's decision rule, applied to this PRD, points to "buy". Nothing records that.** The research says: build if Gold is *the main* route to becoming a Mentor, buy if it is *one route among several*. The PRD has three equal Mentor routes, and principle 1.1 says nobody is shown which route made someone a Mentor. So Gold is explicitly one route among several. A reader would want this tension acknowledged, even if the practice-project framing answers it.
3. **Rec 3 (check existing licences) is absent.** The research calls it "the cheapest lever" and puts it first under "Before committing". It is reasonably moot for a practice project, but only once the PRD says the project is a build-to-learn exercise and not a company purchase decision. If GrowMate could ever be proposed for real use at the company, this should be an Open Question: "Does the company already license a SAP SuccessFactors, Workday or ServiceNow mentoring module?"
4. **§0's precedence rule would let the research override planning decisions.** §0 says "Where those sources conflict, the later one wins". The market research (30 Oct) is the latest source. Read literally, Rec 4 (make the retake wait shorter or configurable) and Rec 6 (issue Open Badges) would beat the brainstorm's one-month Lock and no-badge decisions. The PRD actually treats the research as evidence (OQ1: "The PRD keeps one month as decided"), so §0 should say that the research informs but does not decide.
5. **Rec 5 (mentor training quality and participant input) is deferred only in the addendum.** Addendum §B calls it "a possible v2 direction, not in this PRD". The PRD body says nothing about it. This matters most for Gold-pass Mentors, who become requestable with no onboarding at all, and Rec 5 targets "PRD: mentor onboarding". *Suggest:* an Open Question or Non-Goal line, e.g. "No mentor training or onboarding in v1. Research finds training quality is a peer-reviewed predictor of outcomes [55]." Note that the PRD already provides some participant input: the Learner picks the Mentor, and either party can Quit.
6. **Rec 2 (build thin) is not linked to OQ3.** Addendum §B mentions reusing a quiz engine "for architecture". PRD OQ3 (Assessment format, "needed before architecture") does not point to it. A reuse option (Moodle-style quiz with grade-to-pass, conditional unlock and enforced delay) is directly relevant to answering OQ3, so a cross-reference would help.
   - Leaving out the *badge-issuer* half of Rec 2 is reasonable, because the PRD rejects badges.
   - Caveat for architecture: the research says Moodle covers R3/R5 "out of the box". GrowMate's cyclic rule (two attempts, one-month Lock, two attempts again, repeating with no cap) is not obviously a single enforced-delay setting. It needs checking before relying on reuse.
7. **Minor, optional:** for the retake rule, the research's Open Questions suggest "pilot a configurable wait and measure it", since no evidence exists on how waits affect motivation. They also suggest using pilot data for how many applicants become mentors. Either could add a test-run metric next to SM-2. Leaving them out is acceptable for a practice project.

## Distortions

1. **Addendum §B, bullet 1, "No commercial product implements the Gold-pass Mentor route", is overstated in scope.** The research checked nine mentoring products and HR-suite modules over two rounds and found none. It does not claim to have checked every commercial product. *Fix:* "None of the nine products checked…".
2. **Addendum §B, bullet 1, "…justified only if that route is firm", softens the research's criterion.** The executive summary does say "firm requirement". But Rec 1 and "Before committing" sharpen it to whether Gold is *the main* route or *one among several*. Dropping that criterion hides the fact that this PRD's three-route design falls on the "buy" side of the rule (see Gap 2).
3. **Addendum §B, bullet 1, misattributes the vendor mapping.** It says Registration approval and Group assignment "map onto vendor features (Chronus, PushFar, SAP SuccessFactors)". The research (Cross-dimension insight 2) maps *admin approval* onto Chronus, PushFar and SAP [1][2][3], and *admin assignment to groups* onto **Workday's** admin-assign [5]. *Fix:* "Registration approval maps onto Chronus, PushFar and SAP admin approval; Group assignment maps onto Workday's admin-assign."
4. **Addendum §B bullet 3 and PRD OQ1 simplify the retake comparison.**
   - "Microsoft and AWS make people wait 14 days between certification retakes" is accurate for AWS. Microsoft's rule is 24 hours after the first failure, then 14 days between later attempts, with a cap of 5 attempts a year [59].
   - The comparison is also not like for like. GrowMate allows an *immediate* second attempt (UJ-1: "retakes it straight away") and has no annual cap, and only the Lock after two failures is longer.
   - The research itself calls it "a one-month first wait", which does not match the PRD's Retake rule. The research was run against a requirement set (R1–R9, including R6 badges) that predates the PRD.
   - The conclusion "stricter than both" still holds for the Lock itself. OQ1 should say "the one-month Lock after two failures is longer than Microsoft's and AWS's 14-day waits" so the comparison is fair.
5. **Minor: confidence levels are dropped.** Addendum §B presents its findings flatly.
   - The research rates overall confidence as medium.
   - The Robert Half 45% figure is medium confidence, read from search extracts.
   - The Allen, Eby & Lentz finding concerns *perceived* input and *perceived* training quality.
   - None of these changes a conclusion, but a "(research confidence: medium)" tag would keep the summary honest.

**No PRD body statement contradicts a research finding as fact.** FR-8 (unlimited live Matches) and the Non-Goal on capacity settings depart from vendor norms. The research reports those norms as product practice, not as evidence about outcomes, so these are design choices and not contradictions.

## Confirmed well-captured

- **No product implements the Gold rule:** the core finding is reflected correctly, apart from the scope wording in Distortion 1.
- **Mentor scarcity:** sources named correctly (Robert Half 2025, Future Skills Centre 2025). "Each gate on Mentor supply has a cost" is a fair reading of "Gating mentors behind Gold narrows an already short supply."
- **One-month Lock vs 14-day norms (Rec 4):** raised properly as PRD OQ1. It covers both parts of the recommendation, a shorter Lock and an Admin-configurable one, while keeping the planning decision.
- **Allen, Eby & Lentz 2006:** the predictors (training quality, participant input into the process) are stated correctly. The addendum avoids round 1's overturned "input into matching" wording.
- **Build thin / reuse (Rec 2):** the quiz-engine reuse is captured, and Moodle pass marks and enforced delays are described accurately. Leaving out the badge issuer is consistent with the planning artifacts.
- **Rec 6 (don't headline verified skills):** the PRD goes further, with no badges, certificates or résumé lines (FR-18, §5, addendum A). This is consistent with the research's caution that badge value for internal mobility is unproven. The research's "do issue Open Badges" half is a deliberate planning override, already recorded in addendum A.
- **Conversations outside the app:** principle "The click is the record" and §5 match the research's Cross-dimension insight 3. Calendar and integration friction is the most persistent complaint about bought tools.
- **Rec 7 (purchasing protections):** reasonably omitted, because it applies only if buying.
- **Source map (addendum C):** correctly limits the research's role to "Open Question 1; build-vs-buy context".
