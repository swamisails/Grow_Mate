---
title: 'Market research: GrowMate — build in-house vs buy'
type: 'market'
topic: 'GrowMate employee skill-development & mentorship platform'
decision: 'Build GrowMate in-house vs buy/adopt an existing platform'
source: 'native run (parallel web research, 3 dimensions x 2 rounds, 6 research assistants)'
status: complete
preset: 'standard'
validation: 'normal'
claims_verified: 15
claims_unverified: 10
claims_disputed: 2
claims_overturned: 1
created: '2026-10-30'
updated: '2026-10-30'
---

# Market research: GrowMate — build in-house vs buy

**Decision this research serves:** Build GrowMate in-house vs buy/adopt an existing platform

## Executive summary

**Recommendation:** build GrowMate in-house only if the assessment-gated mentor rule is a firm requirement. That rule says passing the three-level assessment (Gold) qualifies an employee to mentor that skill, with a wait before retakes. If you build, make it a thin custom core on top of existing components rather than writing everything from scratch.

If that rule can bend, buying is cheaper and lower-risk. Buy from the HR suite you already license if it has a mentoring module (SAP SuccessFactors, Workday, ServiceNow). Otherwise buy a dedicated mentoring platform that supports admin-approved mentor applications.

Confidence: **medium**. The fit findings are well evidenced. The cost comparison rests partly on low-confidence build-cost estimates.

Three findings drive this answer:

1. **No product implements GrowMate's defining rule.**
   - **What we checked:** two research rounds, one of them specifically trying to prove this wrong, covered nine mentoring products and HR-suite modules.
   - **What we found:** none let passing an assessment automatically qualify someone as a mentor, and none impose a retake wait.
   - **What exists instead:** admin approval of mentor applications (Chronus, PushFar, SAP SuccessFactors) [1][2][3], eligibility rules based on profile answers (Chronus) [1], and skills-weighted mentor *ranking* (ServiceNow) [6].
   - **Consequence:** every "buy" option either changes the design or needs custom integration work. The components GrowMate needs do exist off the shelf: quiz engines with pass marks and enforced retake delays (Moodle, iMocha) [13][14], and quiz-to-badge pipelines into Credly [15].
2. **The rule we would build for has no evidence behind it, and some evidence against it.**
   - **No precedent:** we found no organisation that qualifies mentors by skill test. Practice is self-assessment, experience plus professional certification, or selection on personal traits [57][58].
   - **Mentors are already scarce:** 45% of US workers in a 2025 survey said they lacked a mentor early in their careers, and 47% of Canadian workers lack a workplace peer mentor [53][54]. Gating mentors behind Gold narrows an already short supply.
   - **What predicts better outcomes:** the peer-reviewed predictors are training quality and participants' say in the mentoring process [55]. That study did not test screening mentors, so it neither supports nor rules out a Gold gate.
   - **The one-month retake wait is unusually long:** it exceeds Microsoft's and AWS's 14-day certification waits [59][60].
3. **Cost alone does not settle this. The 3-year ranges overlap and the build side is disputed.**
   - **Buy:** a mentoring platform plus a credential issuer runs about **$31k–$213k over 3 years** at list price or buyer-reported prices [28][29][36][37], before setup fees. 79% of IT leaders reported price increases at renewal [40].
   - **Build:** about **$265k–$408k over 3 years** if costed from US developer wages [41], or about **$52k–$120k** if you believe agency estimates [42][43]. The two bases disagree by roughly 3–5×.

**Biggest caveat:** the build-cost figures are the weakest evidence in the report. No primary or analyst benchmark for building an internal HR tool was found, and the wage-based figure is our own arithmetic.

**Before committing:**
- Check whether the company already pays for a suite mentoring module. If it does, that is the cheapest route.
- Decide with stakeholders whether Gold-gating is the main way people become mentors or one route among several.

---

## 1. What can be bought, and how well it fits

**Where the gap is.** We checked GrowMate's nine requirements (R1–R9) against each candidate product. The product categories split cleanly:

- **Mentoring platforms** (MentorcliQ, Chronus, Together, Qooper, Mentorloop, PushFar) cover the basic mentoring flows: matching, requests, capacity limits and admin dashboards.
- **HR suites** (SAP SuccessFactors, Workday, ServiceNow) have mentoring modules.
- **Assessment tools and credential issuers** (Moodle, iMocha, Credly, Accredible) cover the testing and badge parts.

No product joins assessments to mentor eligibility. That join is exactly what makes GrowMate distinctive.

**Fit matrix.** Key: ✓ documented · ~ partial or workaround · ✗ documented absent · ? not evidenced this run.

| Product | R1 skill-based mentor search & request | R2 availability & accept/reject | R3 3-level assessments | R4 Gold qualifies mentor | R5 retake wait | R6 badges & verified skills | R7 progress | R8 notifications | R9 admin approval & assignment |
|---|---|---|---|---|---|---|---|---|---|
| SAP SuccessFactors Mentoring [3][4] | ~ | ✓ | ✗ | ~ manual approval | ? | ? | ? | ✓ | ✓ |
| Chronus [1] | ~ | ? | ✗ | ~ admin approval / profile-answer rules | ✗ | ? | ? | ~ | ✓ |
| PushFar [2] | ? | ? | ✗ | ~ admin approval | ✗ | ? | ? | ? | ~ |
| Workday Mentorship [5] | ~ | ~ | ? | ✗ | ? | ? | ? | ~ | ~ |
| ServiceNow Mentoring [6][7] | ✓ | ? | ✗ | ✗ (verified skills rank, not gate) | ✗ | ? | ? | ? | ~ |
| MentorcliQ [8] | ~ | ~ | ? | ? | ? | ? | ~ | ? | ~ |
| Together (Absorb) [9] | ~ | ? | ? | ? | ? | ✓ LinkedIn-shareable | ~ | ? | ~ |
| Mentorloop [10] | ~ | ~ capacity cap + toggle | ? | ? | ? | ? | ? | ? | ~ |
| Qooper [11][12] | ~ | ? | ? | ? | ? | ~ | ✓ | ~ | ~ |
| Moodle quiz (component) [13] | ✗ | ✗ | ✓ | ✗ | ✓ | ? | ~ | ? | ✗ |
| iMocha (component) [14] | ✗ | ✗ | ? | ✗ | ✓ | ? | ? | ? | ? |
| Credly via quiz tools (component) [15][16] | — | — | ~ | — | ? | ✓ | — | — | — |

**Approval workflows that come closest to the Gold rule.**
- **SAP SuccessFactors:** has a "Require Mentor Approval" option. The approver is an admin or the mentor's manager. Under admin approval the mentor uploads supporting documents for review; under manager approval the manager is simply notified. It also offers caps on mentees per mentor, an "Unavailable" status, and accept/decline with a note that notifies the mentee [3][4]. The approval is a manual step with no link to any assessment, and no retake-style waiting rule was found. *(Medium confidence: read from search extracts of SAP's help pages.)*
- **Chronus:** supports both admin-approved applications and automatic eligibility rules based on profile answers [1]. If an integration filled in an "assessment level 3 passed" profile field, that could act as an indirect Gold gate. This is untested.
- **PushFar:** blocks relationships until an admin approves the user [2].

**Assessment components that could be reused.**
- **Moodle (open source):** has "Grade to pass", conditional unlocking (so level 2 stays locked until level 1 is passed), and an "Enforced delay between attempts" configurable up to weeks [13]. That covers R3 and R5 out of the box.
- **iMocha:** has a configurable "cooling period" between retakes [14].
- **Credly:** quiz tools already issue Credly badges through its API (CredSpark, Skilljar, Workato) [15], and Degreed auto-issues them [16].

**Nearest to a skills-aware mentoring product.**
- **ServiceNow:** scores mentors higher when their skills are verified, but does not exclude unverified mentors [6].
- **SkillsTX:** uses a formal skills assessment to drive matching, but not to decide who can mentor [26].

**Vendor stability: consolidation is the 2024–2026 pattern.**
- Absorb (an LMS vendor) acquired Together in December 2024 [17][18]. Together is still sold on its own site and also as "Mentoring in Absorb LMS" [24][25].
- Thrive (a learning platform) bought Guider in July 2025 [19].
- Chronus bought MentorStrat and Imperative in 2024 [20].
- MentorcliQ's last disclosed capital was more than $80M from PSG in 2023 [22].
- Gloat, a talent-marketplace vendor, cut 20% of staff in March 2026 after some customers did not renew, and is pivoting to AI agents [21]. *(Medium confidence: single news source, read via search extract.)*

Buying means betting on a vendor that may be absorbed or repositioned within the contract term.

**Market size: thin.** 2025 estimates for "mentoring software" range from $0.4B to $1.8B, with one outlier at $18.6B. All come from resellers of paid reports with no visible method [23]. This doesn't affect the decision.

## 2. Pricing and total cost of ownership

**Prices are mostly hidden.**
- Mentorloop publishes **Pro from $299/month** [27].
- MentorcliQ publishes **CliQ Start from $9,900/year for 100 employees** [28].
- Together, Qooper, Chronus, iMocha, Degreed and Gloat are contact-sales. Together bills only actively matched participants and charges no setup fee [30].

**What buyers actually pay (Vendr transaction data, mostly undated):**
- **MentorcliQ:** median **$29.5k/yr**, range $25.7k–$41.9k [29] *(unverified, single source)*.
- **Degreed (learning platform):** median **$170.9k/yr** [34] *(unverified)*.
- **Credly:** median **$8k/yr**, from 43 purchases as of February 2026 [36].

**Chronus pricing is disputed.** We report all three figures and do not average them:
- Vendr's transaction median is **$11.6k/yr** [31];
- G2 lists a "Core" plan at **$14,995/yr** [32];
- an unsourced spend aggregator estimates **$72k–$144k/yr** [33].

**Lower-cost components.**
- **Accredible (badges):** Launch plan from **$45/month** for 50 recipients, with no setup fee [37].
- **360Learning (learning platform):** **$8/user/month** for up to 100 users [35].

**HR-suite add-ons are paid, and their prices aren't public.**
- **SAP SuccessFactors:** mentoring needs the Career & Talent Development bundle or an Opportunity Marketplace licence [38].
- **Workday:** publishes no mentoring or Talent Marketplace price. One unsourced negotiation advisor puts Workday Learning at $24–$58 per employee per year, with $120k–$420k or more to implement [39] *(low confidence)*.
- If the company **already** pays for one of these modules, the extra cost is close to zero. That makes it the cheapest buy option.

**Hidden costs of buying.** Zylo's 2026 SaaS Management Index [40] found that:
- 79% of IT leaders faced price increases at renewal in the past 12 months;
- 77% reported unexpected costs after signing (no time window stated);
- measured licence utilisation was only 54% in 2025.

**Cost to build: disputed, and the weakest evidence in the report.**
- **Agency estimates:** software agencies quote **$40k–$80k** for a custom learning-platform MVP and $120k–$300k+ for a full platform [42]. They are low-confidence marketing material.
- **Wage-based estimate:** costing a team from the US BLS median developer wage of **$135,980** (May 2025) [41], 3–4 developers for 6 months comes to **≈$204k–$272k in base wages alone**. That excludes benefits, design, product and QA. This is our own arithmetic, and it is roughly 2.5–7× the agency figures.
- **Maintenance:** a rule of thumb and one small 24-product benchmark put it at **15–25% of build cost per year** [43] *(low–medium confidence)*.
- **Proof it's been done:** LinkedIn built its own internal mentoring platform, but published no cost [45].
- **Analyst view:** Josh Bersin (May 2026) cautions that building HR software is "not as easy as it looks". He frames the choice as deciding *which parts* to build versus buy, using vendor APIs and plugins [44].

**3-year cost, derived from the figures above and not a sourced total:**

| Path | Year 1 | Years 2–3 | 3-year total | Basis |
|---|---|---|---|---|
| Buy: mentoring platform + credential issuer | $10.4k–$70.9k | same per year, before renewal increases | **$31k–$213k** + setup | [28][29][36][37] |
| Build (wage basis) | $204k–$272k | 15–25%/yr maintenance | **$265k–$408k** | [41][43] |
| Build (agency basis) | $40k–$80k | 15–25%/yr maintenance | **$52k–$120k** | [42][43] |
| Suite module already licensed | ~configuration effort | — | **lowest; not quantified** | [38] |

## 3. Pain points and unmet needs

**Reviews of the tools you would buy.**
- Mentoring tools score **4.4–4.9★** on G2 and Capterra, and critical reviews are rare.
- **The most persistent complaint** is friction with integrations and calendars: Outlook, Zoom, and "another system" to use. It appears for five vendors from 2018 to 2026 [46][47][48][49][50].
- **Next come** dated UI and learning-curve complaints (four vendors), then limits on customisation. One Chronus admin wrote: "I often feel as if I have to run everything past Chronus" [47]. A Together reviewer wanted competencies tailored to their industry [48].
- **Qooper's** users prefer scheduling in their own calendar [49]. That fits GrowMate's choice to keep conversations outside the app.

*(Medium confidence: G2 and Capterra blocked direct reading, so these quotes come from search extracts.)*

**Mentor supply is the core pain, and it exists before any gating.**
- Robert Half (March 2025, about 1,000 US workers): finding a mentor is new workers' top challenge, and **45% said they lacked one** early in their careers [53]. *(Medium confidence: the source page blocked direct reading, so this comes from search extracts.)*
- Future Skills Centre (2025): **47% of Canadian workers** lack a peer mentor [54].
- UK HR directors cite lack of time (47%) and difficulty matching (39%) as the top barriers [52].
- HBR (December 2024) reports that 98% of Fortune 500 companies run mentoring programmes, yet only 37% of professionals benefit. The 98% figure is vendor-sourced [51].

**What predicts good mentoring.** Allen, Eby & Lentz (2006, Journal of Applied Psychology) found that participants' **perceived input into the mentoring process** and **training perceived as high quality** were consistently linked to better mentoring outcomes [55].
- **Correction:** round 1 had overstated this as "input into matching", and that wording has been overturned.
- **Weak statistic:** the widely repeated Clutterbuck figure on how many relationships succeed without training traces back to a 2005 practitioner article with no stated method [56]. It is low confidence.

**How mentors are qualified in practice: not by skill test.**
- Chronus uses a self-assessment checklist [57].
- Peer-reviewed work recommends building desired mentor traits into both selection *and* development [58].
- **No organisation was found gating mentors with a multi-level skill test.** This absence was confirmed independently by the pain-points research and the products research.

**Retake norms.**
- **Microsoft:** 24 hours after the first failure, then 14 days between attempts, with a cap of 5 attempts a year. Its Applied Skills labs need only 72 hours [59].
- **AWS:** 14 days [60].

A one-month first wait is stricter than both. **No evidence was found** on how waiting periods affect learners' motivation.

**Verified skills and badges.**
- **The trust problem is documented:** the Open Badges standard does not prescribe criteria, which feeds worries about credibility and badge inflation [61].
- **Positive figures come from interested parties.** Deloitte's skills-based-organisation figures are correlational and were read only in summary [64]. The IBM and Credly retention claims are vendor-reported [65].
- **Nothing independent** shows that *internally* issued badges increase internal mobility.

**Skills platforms struggle in practice.**
- Mercer's 2024 survey of 47 organisations found only 43% use a talent marketplace, and nearly three-fifths are unsure it is working [62].
- Aspen Institute advises reusing existing skills taxonomies rather than building a proprietary one [63].

## Cross-dimension insights

1. **The features that rule out buying are the ones with the least evidence behind them.** R3–R5 (multi-level assessment, Gold-qualifies-mentor, one-month retake wait) are both the only requirements no vendor meets (Section 1) and the requirements the research gives no support for (Section 3). The build-vs-buy decision is therefore mostly a product decision about how firm the Gold gate is.
2. **GrowMate's other mentor routes map onto what vendors already sell.** GrowMate's design already has two routes besides Gold: admin approval at registration and admin assignment to groups. Those map directly onto Chronus, PushFar and SAP admin approval [1][2][3] and Workday's admin-assign report [5]. A bought platform could run those two routes on day one. Only the Gold route needs custom work, as either a manual admin check or an integration.
3. **Keeping conversations outside the app works in GrowMate's favour.** The most persistent complaint about bought tools is calendar and integration friction [46][49]. A product that never tries to host the conversation avoids that, whether built or bought.
4. **Buy prices are low, but the vendor may change under you.** Mentoring platforms cost tens of thousands a year (Section 2), but the category is consolidating into LMS vendors (Section 1). Lock-in and roadmap risk cost more than the licence fees suggest.

## Recommendations

| # | Recommendation | Confidence and basis | Feeds |
|---|---|---|---|
| 1 | **Decide the Gold gate first.** If Gold is the main route to becoming a mentor, build. If it is one route among several, buy. | Medium: the fit finding is verified [1][3][6]; the supply-risk finding is verified [53][54]. | Product brief: problem and opportunity |
| 2 | **If you build, build thin.** Write custom code only for mentor eligibility, matching/requests and the admin dashboard. Reuse a quiz engine with pass marks and enforced delays (Moodle, open source) [13] and an Open Badges / Credly-compatible issuer [15][37] rather than writing your own. | Medium: the components are primary-documented; cost savings are not quantified. | Architecture: component boundaries |
| 3 | **Before building, check existing licences.** Find out whether the company already has SAP SuccessFactors Career & Talent Development, Workday Talent, or ServiceNow HR. If so, pilot that mentoring module first, using admin approval as the interim Gold check [3][5][6][38]. | Medium: packaging is from official SAP docs; Workday and ServiceNow details are medium confidence. | Product brief: constraints |
| 4 | **Reconsider the one-month retake wait.** Microsoft and AWS use 14 days or less [59][60], and GrowMate's wait would further delay mentor supply. Make it an admin-configurable setting rather than hard-coded. | Medium on the norms; low on effects on motivation (no evidence found). | PRD: assessment rules |
| 5 | **Invest in mentor training quality and participant input, not only mentor testing.** This is the peer-reviewed predictor of good outcomes [55]. | High for the finding; the step to GrowMate is an inference. | PRD: mentor onboarding; design-thinking Ideate phase |
| 6 | **Don't make "verified skills on your résumé" the headline value.** Value for internal mobility is unproven [61][64][65]. Do issue Open Badges-standard credentials so they can be carried outside the company, which is cheap if built on the components in recommendation 2. | Low–medium. | PRD: differentiation |
| 7 | **If you buy, negotiate protections.** Ask for multi-year price caps and data export, given renewal-increase prevalence [40] and vendor consolidation [17][19][21]. | Medium. | Purchasing / GTM |

**Strongest counter-arguments.** These are not from a red-team pass; red teaming was off for this run.
- **Bersin warns that building HR software is harder than it looks** [44]. The wage-based 3-year build cost ($265k–$408k) is higher than even the top of the 3-year buy range ($213k) [41].
- **The overlap with buy prices rests only on agency estimates.** If those estimates are wrong, as the wage basis suggests, building costs more than buying on every scenario we priced.

## Open questions

| Question | How to answer it |
|---|---|
| Does the company already license an HR-suite mentoring module? | Internal check with HRIS/IT. This is the cheapest lever. |
| What would a GrowMate MVP actually cost here? | Internal estimate from your own engineering team, using fully loaded rates. No primary public benchmark exists. |
| Can SAP mentor approval or Chronus eligibility rules be triggered automatically by an assessment result? | Vendor demos, or a deeper research run on SAP's test scripts and Chronus's profile-field sync. |
| How do retake waits affect motivation and completion? | No evidence found. Pilot a configurable wait and measure it. |
| How many mentors should there be per mentee, and how many applicants become mentors? | No corporate benchmark found. Use your internal pilot data. |
| Chronus price ($11.6k vs $15k vs $72k–$144k/yr) | Request a quote. |
| Is Together still sold standalone long-term, or folded into Absorb? | Mixed evidence [24][25]. Ask the vendor. |
| Are internal verified badges worth anything for internal mobility? | No independent evidence. A deeper research run (OneTen 2024, LinkedIn Workplace Learning Report). |

## Source appendix

| # | Claim/finding it supports | Publisher | Pub date | Accessed | Confidence |
|---|---|---|---|---|---|
| [1] | Chronus enrollment: admin-approved applications; eligibility rules on profile answers | [Chronus help centre](https://chronusmentor.chronus.com/en/articles/9183844-enrollment-methods-all-the-options) | 2026-09 | 2026-10-30 | high |
| [2] | PushFar admin approval at organisation and programme level | [PushFar support](https://support.pushfar.com/knowledge-base/approval-process-users) | undated | 2026-10-30 | high |
| [3] | SAP SuccessFactors Mentoring: admin or manager mentor approval (documents under admin approval), mentee caps, Unavailable status | [SAP Help Portal](https://help.sap.com/docs/successfactors-succession-and-development/using-mentoring/managing-mentoring-programs) | undated | 2026-10-30 | medium |
| [4] | SAP mentee requests, mentor accept/decline with note, mentee notified | [SAP test script 2411](https://help.sap.com/doc/f1ee8a4804ca486683a41cb9f03b4e8a/2411/en-US/Mentoring_in_SAP_SuccessFactors_Test_Script_3VF.pdf) | 2024-11 | 2026-10-30 | medium |
| [5] | Workday Manage Mentorship process, availability opt-out, admin/HR assign via Find Mentor | [Workday admin guide](https://doc.workday.com/admin-guide/en-us/human-capital-management/talent/mentors-and-connections/rgv1469574188930.html) | undated | 2026-10-30 | medium |
| [6] | ServiceNow Mentoring: verified skills weight the match score, do not gate eligibility | [ServiceNow docs](https://www.servicenow.com/docs/r/employee-service-management/mentoring/exploring-mentoring-egd.html) | 2026-09 | 2026-10-30 | high |
| [7] | ServiceNow Zurich: access criteria, connection requests; no capacity or approval documented | [ServiceNow release notes](https://www.servicenow.com/docs/r/zurich/release-notes/mentoring-rn.html) | 2025-07 | 2026-10-30 | high |
| [8] | MentorcliQ admin/suggested/self matching, configurable limits, HRIS integration | [MentorcliQ](https://mentorcliq.com/mentoring-software/matching-participants) | undated | 2026-10-30 | medium |
| [9] | Together (Absorb): goals/skills matching, LinkedIn-shareable badges, reporting | [Absorb Software](https://www.absorbai.com/products/mentoring-software) | undated | 2026-10-30 | medium |
| [10] | Mentorloop max-matches cap and availability toggle | [Mentorloop help hub](https://helphub.mentorloop.com/hc/en-us/articles/8356482367503) | undated | 2026-10-30 | medium |
| [11] | Qooper feature list: self/admin matching, dashboards, milestones | [Qooper](https://www.qooper.io/hubfs/llms-full.txt) | undated | 2026-10-30 | medium |
| [12] | Qooper badges and certificate of completion | [Qooper knowledge base](https://qooper.io/knowledge/how-badges-work-in-qooper) | undated | 2026-10-30 | medium |
| [13] | Moodle quiz: grade to pass, conditional unlock, enforced delay between attempts | [Moodle docs](https://docs.moodle.org/en/Quiz_settings) | 2026-09 | 2026-10-30 | high |
| [14] | iMocha configurable cooling period between retakes | [iMocha help](https://help.imocha.io/how-to-set-up-cooling-period-between-the-retakes-of-a-test) | undated | 2026-10-30 | medium |
| [15] | Quiz result → Credly badge via API (CredSpark; also Skilljar, Workato) | [CredSpark support](https://support.credspark.com/support/solutions/articles/73000525998-credly-integration) | undated | 2026-10-30 | medium |
| [16] | Degreed auto-issues Credly badges; needs a Credly subscription | [Degreed integrations](https://integrations.degreed.com/listings/credly) | undated | 2026-10-30 | medium |
| [17] | Absorb acquired Together (closed Dec 2024) | [Fasken](https://www.fasken.com/en/experience/2024/12/absorb-software-inc-acquires-together-inc) | 2024-12 | 2026-10-30 | high |
| [18] | Absorb to fold mentoring into its LMS | [BetaKit](https://betakit.com/absorb-to-acquire-together-in-bid-to-bring-mentorship-to-its-learning-software/) | 2024-12 | 2026-10-30 | high |
| [19] | Thrive acquired Guider (Jul 2025) | [Thrive](https://www.thrivelearning.com/blog-news/thrive-announces-strategic-acquisition-of-guider-the-uks-leading-mentoring-and-coaching-platform) | 2025-07 | 2026-10-30 | high |
| [20] | Chronus acquired MentorStrat (2024) | [Chronus](https://chronus.com/chronus-acquires-mentorstrat) | 2024-07 | 2026-10-30 | high |
| [21] | Gloat 20% layoff, customer non-renewals, AI-agent pivot | [Globes](https://en.globes.co.il/en/article-1001536470) | 2026-03 | 2026-10-30 | medium |
| [22] | MentorcliQ >$80M growth investment from PSG | [MentorcliQ press release](https://www.mentorcliq.com/news/leading-employee-mentorship-software-mentorcliq-secures-over-80-million-growth-investment-from-psg-to-help-enterprises-globally-build-more-inclusive-cultures-and-reduce-employee-turnover) | 2023-03 | 2026-10-30 | high |
| [23] | Mentoring-software market estimates $0.4B–$1.8B (reseller figures, no method) | [MarketResearch.com / VPA](https://www.marketresearch.com/VPA-Research-v4245/Mentoring-Software-Size-Share-Outlook-40859235) | 2025 | 2026-10-30 | low |
| [24] | Together still sold standalone on its own site | [Together](https://www.togetherplatform.com/) | undated | 2026-10-30 | medium |
| [25] | "Mentoring in Absorb LMS" uses Together's matching engine | [Training Industry](https://trainingindustry.com/press-release/performance-management/absorb-software-launches-mentoring-in-absorb-lms-redefining-human-connection-in-adult-learning/) | 2025 | 2026-10-30 | medium |
| [26] | SkillsTX matches via skills assessment and gap (no eligibility gate) | [SkillsTX release notes](https://skillstx.atlassian.net/wiki/spaces/STXWN/pages/2373156866/2024+March+28+-+Tailored+Mentorship+release) | 2024-03 | 2026-10-30 | medium |
| [27] | Mentorloop Pro from $299/month | [Mentorloop pricing](https://www.mentorloop.com/pricing) | undated | 2026-10-30 | high |
| [28] | MentorcliQ CliQ Start from $9,900/yr for 100 employees | [MentorcliQ pricing](https://www.mentorcliq.com/pricing) | undated | 2026-10-30 | high |
| [29] | MentorcliQ buyer median $29.5k/yr (range $25.7k–$41.9k) | [Vendr](https://www.vendr.com/marketplace/mentorcliq) | undated | 2026-10-30 | medium |
| [30] | Together bills active matched users only; no setup fee | [Together pricing](https://www.togetherplatform.com/pricing) | undated | 2026-10-30 | high |
| [31] | Chronus buyer median $11.6k/yr (disputed) | [Vendr](https://www.vendr.com/marketplace/chronus) | undated | 2026-10-30 | low |
| [32] | Chronus "Core" listed at $14,995/yr (disputed) | [G2](https://www.g2.com/compare/chronus-vs-mentorloop-mentoring-software) | undated | 2026-10-30 | medium |
| [33] | Chronus estimate $6k–$12k+/month (disputed; unsourced) | [Spendbase](https://www.spendbase.co/it/?p=37052) | undated | 2026-10-30 | low |
| [34] | Degreed buyer median $170.9k/yr | [Vendr](https://www.vendr.com/marketplace/degreed) | undated | 2026-10-30 | medium |
| [35] | 360Learning Team $8/user/month, up to 100 users | [360Learning pricing](https://360learning.com/pricing/) | undated | 2026-10-30 | high |
| [36] | Credly buyer median $8k/yr (range $4k–$28.95k, n=43) | [Vendr](https://www.vendr.com/marketplace/credly) | 2026-02 | 2026-10-30 | medium |
| [37] | Accredible Launch from $45/month, 50 recipients, no setup fees | [Accredible pricing](https://www.accredible.com/pricing) | undated | 2026-10-30 | high |
| [38] | SAP mentoring needs Career & Talent Development bundle or Opportunity Marketplace licence | [SAP Learning](https://learning.sap.com/courses/sap-successfactors-career-development-planning-and-mentoring-administration/explaining-the-prerequisites-dependencies-and-permissions-3) | undated | 2026-10-30 | high |
| [39] | Workday Learning $24–$58/employee/yr; implementation $120k–$420k+ (unsourced) | [WorkdayNegotiations](https://workdaynegotiations.pages.dev/blog/workday-learning-pricing-breakdown/) | 2026-04 | 2026-10-30 | low |
| [40] | 79% faced renewal price increases; 77% unexpected costs; 54% licence utilisation | [Zylo](https://zylo.com/blog/saas-statistics) | 2026-02 | 2026-10-30 | medium |
| [41] | US software developer median wage $135,980 (May 2025) | [US BLS](https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm) | 2025-05 | 2026-10-30 | high |
| [42] | Custom LMS build: MVP $40k–$80k; full $120k–$300k+ (agency) | [Cleveroad](https://www.cleveroad.com/blog/how-much-does-it-cost-to-build-an-lms/) | 2025 | 2026-10-30 | low |
| [43] | Maintenance ≈15–25% of build cost per year | [Wavect](https://wavect.io/blog/software-maintenance-cost-benchmark-dach-saas.md) | undated | 2026-10-30 | low |
| [44] | Bersin: building HR software "not as easy as it looks"; build-what vs buy-what | [Josh Bersin Company](https://joshbersin.com/podcast/build-vs-buy-its-so-easy-to-build-hr-software-now-or-is-it/) | 2026-05 | 2026-10-30 | medium |
| [45] | LinkedIn built an internal mentoring platform (no cost given) | [LinkedIn Engineering](https://engineering.linkedin.com/blog/2022/career-stories--taking-linkedin-to-bellevue--and-mentorship-glob) | 2022 | 2026-10-30 | medium |
| [46] | MentorcliQ: UI "outdated", "adds another system" | [Capterra](https://capterra.com/p/146511/MentorcliQ-Employee-Mentoring/reviews/) | undated | 2026-10-30 | medium |
| [47] | Chronus: "run everything past Chronus", Outlook link issue | [Capterra](https://capterra.com/p/140234/Chronus-Mentoring-Software/reviews/) | 2019–2026 | 2026-10-30 | medium |
| [48] | Together: no Outlook/Zoom integration, limited competency customisation | [Capterra](https://www.capterra.com/p/177744/Together/reviews) | 2018–2026 | 2026-10-30 | medium |
| [49] | Qooper: integration and calendar issues; users prefer own calendar | [G2](https://www.g2.com/compare/mentorloop-mentoring-software-vs-qooper) | undated | 2026-10-30 | medium |
| [50] | 360Learning cons: limited customisation, integration issues, learning curve | [G2](https://www.g2.com/products/360learning/details) | undated | 2026-10-30 | medium |
| [51] | 98% of Fortune 500 run mentoring; only 37% of professionals benefit | [Harvard Business Review](https://hbr.org/2024/12/why-mentoring-programs-fail-and-how-to-make-them-worthwhile) | 2024-12 | 2026-10-30 | medium |
| [52] | Barriers: lack of time 47%, matching 39%, budget 38% | [Association of Business Mentors](https://associationofbusinessmentors.org/why-underfunded-mentoring-programmes-fail-to-deliver-business-impact/) | undated | 2026-10-30 | low |
| [53] | Finding a mentor is new workers' top challenge; 45% lacked one early in their careers | [Staffing Industry Analysts (Robert Half)](https://www.staffingindustry.com/news/global-daily-news/finding-mentors-is-top-challenge-for-new-workers-robert-half) | 2025-04 | 2026-10-30 | medium |
| [54] | 47% of Canadian workers lack a workplace peer mentor | [Future Skills Centre](https://fsc-ccf.ca/wp-content/uploads/2025/04/mentorship-in-the-workplace-employee-participation-and-perspectives-1.pdf) | 2025-04 | 2026-10-30 | medium |
| [55] | Perceived input into the mentoring process and high-quality training predict outcomes | [J. Applied Psychology via PubMed](https://pubmed.ncbi.nlm.nih.gov/16737355/) | 2006-05 | 2026-10-30 | high |
| [56] | Clutterbuck: <1/3 succeed with minimal training, >9/10 with both trained (no method) | [Clutterbuck Associates (Scottish Mentoring Network)](https://media.scottishmentoringnetwork.co.uk/Whatmakesagoodmentor_6ea9dc8804.pdf) | 2005-10 | 2026-10-30 | low |
| [57] | Chronus mentor readiness uses a self-assessment checklist, not a skill test | [Chronus help centre](https://chronusmentor.chronus.com/en/articles/9183713-guide-to-assessing-recruiting-and-preparing-mentors-for-your-program) | undated | 2026-10-30 | medium |
| [58] | Build mentor characteristics into selection and development | [Personnel Review (Emerald)](https://www.emerald.com/insight/content/doi/10.1108/PR-08-2022-0535) | 2024 | 2026-10-30 | medium |
| [59] | Microsoft retake: 24h, then 14 days; 5/yr cap; Applied Skills 72h | [Microsoft Learn](https://learn.microsoft.com/en-us/credentials/support/retake-policy) | 2026-07 | 2026-10-30 | high |
| [60] | AWS retake: 14 days | [AWS Certification FAQ](https://aws.amazon.com/certification/faqs/) | undated | 2026-10-30 | high |
| [61] | Open Badges sets no criteria; credibility and inflation concerns | [IBE](https://www.ibe.edu.pl/en/news/3106-how-to-build-trust-in-digital-microcredentials) | undated | 2026-10-30 | medium |
| [62] | Only 43% use a talent marketplace; ~3/5 unsure it is working | [Mercer](https://www.mercer.com/en-us/insights/talent-and-transformation/skill-based-talent-management/survey-report-insights-global-skills-technology-and-adoption/) | 2024-10 | 2026-10-30 | medium |
| [63] | Harmonise existing skills taxonomies rather than build proprietary ones | [Aspen Institute](https://www.aspeninstitute.org/blog-posts/missing-demand-may-miss-the-opportunity-research-insights-for-states-building-talent-marketplaces-that-work/) | undated | 2026-10-30 | medium |
| [64] | Skills-based orgs "107% more likely to place talent effectively" (correlational, summary only) | [Deloitte](https://d1lzrgdbvkolkd.cloudfront.net/Skills_Based_Organization_24fdd44eb4.pdf) | 2022 | 2026-10-30 | low |
| [65] | IBM/Credly badge retention claims (vendor-reported) | [Credly](https://resources.credly.com/hubfs/how-employers-use-digital-credentials-to-make-workforce-decisions.pdf) | 2015 | 2026-10-30 | low |

## Staleness map

These dates were computed by `recon_kit.py staleness` from the claims ledger, using the market pack's freshness windows:

- features, integrations and pricing: 3 months;
- vendor stability and build or total-cost benchmarks: 12 months;
- market size: 18 months;
- behaviour, outcomes, pain points and credentials: 24 months.

Undated vendor pages are dated by when we read them (2026-10).

**Already past their window: 10 of 28 ledger claims.** For most of these, the age doesn't change the decision.

| Claim | Window ended | What it means |
|---|---|---|
| Vendor acquisitions: Absorb–Together [17], Thrive–Guider [19], Chronus–MentorStrat [20] | 2025-07 to 2026-07 | These are historical events, so they remain true. Re-check where each vendor is heading now. |
| Allen, Eby & Lentz 2006 [55]; the overturned paraphrase of it | 2008-05 | A foundational peer-reviewed finding. Newer replication evidence would strengthen it. |
| Clutterbuck training statistic [56] | 2007-10 | Already low confidence. Do not rely on it. |
| US BLS developer wage [41] | 2026-05 | Update when BLS publishes its May 2026 wage data. |
| Build-cost dispute [42] | 2026-06 | Replace with an internal engineering estimate. |
| Credly buyer median [36] | 2026-05 | Re-check against Vendr or a real quote. |
| Mercer talent-marketplace survey [62] | 2026-10 | Look for Mercer's 2026 edition. |

**Next re-checks:**
- **2026-12-01:** all feature-fit claims [1][3][6][13]. This is the earliest date a live claim expires, and the fit finding is what the recommendation rests on.
- **2026-12-01:** market size [23].
- **2027-01-01:** pricing claims [28][29][31][34][38].

Use a Refresh run when those dates arrive.
