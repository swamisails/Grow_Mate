# GrowMate — extract of planning inputs (for PRD)

Sources and tags:
- **[BS-H]** brainstorm-growmate-product-plan/brainstorm.html (closing report, 24 Oct 2026)
- **[BS-M]** brainstorm-growmate-product-plan/.memlog.md (running log of the same session; contains ideas later replaced)
- **[FG-M]** forge-growmate/.memlog.md (26 Oct 2026, defend mode)
- **[FG-R]** forge-growmate/forge-report.html
- **[PM]** party-mode/memories/installed/.memlog.md (26 Oct 2026)

Scope: only material that adds to, refines or contradicts the README, forge brief and design-thinking points already captured. Order of sessions: brainstorm (24 Oct), then forge (26 Oct), then party mode (26 Oct). Where they conflict, the later session is the more recent decision. Section 8 lists those conflicts.

---

## 1. Product vision and goals

- Headline: "The course outlives the mentor." "A person can step off. The course stays on the path, and someone else can be accepted onto it." [BS-H]
- Core framing: GrowMate is a **"match-and-proof loop"**. In order: "Courses are published. A mentor is accepted. Talks stay outside the app. Course Completed opens bronze, then silver, then gold. Gold is only the right to mentor that course." [BS-H, BS-M]
- "Gold is not a prize, it is permission to mentor that course." [BS-M]
- "Admin group assignment is just a way to create many one-to-one matches at once. Quit is normal, and the course outlives any one mentor." [BS-M, BS-H]
- POC success definition (a coach decision that the user then confirmed): "GrowMate proves one loop — admin publishes a course and bronze/silver/gold assessments, a learner is matched to a mentor, they talk offline, the mentor opens the assessment, and passing gold makes the learner eligible to mentor that course while admin tracks points." [BS-M] (The "points" part was dropped later. See section 8.)
- The stated goal when the session opened was "learn skills, find mentors, pass assessments, earn badges, and put verified skills and certificates on their resumes" [BS-M frontmatter]. **The session's outcome does not keep the badge, certificate or resume parts** (sections 3 and 8).
- Forge outcome: "GrowMate holds." Course Completed is "a readiness judgment. It opens the assessment and nothing else." [FG-R]
- Problem as voiced (role-play, coach as new hire): "I want a mentor this week for a skill I already use, and I fear the three-level assessment plus a one-month reattempt lockout blocks both proof and mentorship eligibility for months." [BS-H, BS-M] This was answered later by the forge's registration route (section 3).

## 2. Users and roles

- **Learner (employee)**
  - Requests a mentor for a course. The request carries no reason. [BS-H]
  - After Accept, sees only the "Quit Course" action. **Cannot** mark the course complete and **cannot** open the assessment early. [BS-H]
  - Sees the progress bar and status. [BS-H]
  - Can quit at any time. The quit needs no approval. [BS-H]
  - Takes the bronze, silver and gold assessments once the mentor clicks Course Completed. [BS-H]
- **Mentor (employee)**
  - Is a mentor per course, never globally. [BS-M, FG-M]
  - On an incoming request, the only action is **Accept**. There is no Reject. Not accepting means doing nothing. [BS-H]
  - After Accept, sees "Course Completed" and "Quit Course". [BS-H]
  - Has **no obligation** after ignoring a request: "no required follow-up, and no change they must make". [BS-H]
  - Accepts an Admin-assigned group with a single Accept. [BS-H]
  - Every mentor gets the same half-blue bar, whichever route made them a mentor. [PM]
- **Admin**
  - The brainstorm closed a fixed list, "Nothing more" [BS-H]:
    1. Add courses, visible to all employees.
    2. Upload the bronze, silver and gold assessments and set their pass marks.
    3. See the leaderboard, for tracking ("The same list everyone can open").
    4. Stay out of the request flow.
    5. Assign a group of people to one mentor and one course.
  - The forge added **one** feature beyond that list: approving or refusing each course in the registration mentor check. [FG-M]
  - The forge also widened item 5: Admin may assign **anyone** as the mentor, not only an existing mentor. [FG-M, FG-R]
  - Admin **cannot or does not**: take part in the request reminder, auto-cancel or re-request ("No admin queue, and no admin visibility") [BS-H]; act from the leaderboard ("does not assign, approve, or message anyone from that list") [BS-M]; edit mentor calendars, suspend mentors or handle appeals (all dropped, section 4) [BS-H].
- **Other roles**: none were introduced. The forge persona list names "the people who would fill the form, approve it, or live under it" (Sam, Rafi, Imani, Priya, Noor) as test personas only. [FG-R]

## 3. Decided features and rules

### Signup / profile
- Employee registration includes a **mentor check** where the employee names courses they claim they can mentor. [FG-M]
- The check "names more than one course". [FG-M] (Whether that means at least two or that several are allowed is ambiguous. See section 5.)
- Admin decides on each named course separately: "Admin's decision only. No score and no second assessment." [FG-M]
- Admin may approve some named courses and refuse others. "A refusal does not block the approved courses." [FG-M]
- Approved courses are "requestable immediately". Refused courses are not. The mentor still has to Accept each request. [FG-M]
- A refused course can be mentored later "only by passing gold, and only if the employee chooses to pursue it. Registration is not rerun." [FG-M]
- Admin's decision is "a bare yes/no", and that is "ordinary". [PM]
- No other signup or profile rules appear in these five files.

### Skills / courses
- The unit everywhere is the **course**, not the skill. Admin adds courses, and they are "visible to all employees". [BS-M, BS-H]
- Each course has three assessment stages: bronze, silver and gold. "The stages belong to the course, not the match." [BS-H]

### Matching / requests
- The request has **no reason**: "The request itself is enough." This replaced an earlier rule that a reason was required. [BS-H, BS-M]
- The mentor sees: "[Learner name] wants you to guide him with [Course name]", with only an **Accept** button. [BS-H]
- **Request clock** [BS-H]:
  - Day 0: the request is sent.
  - Day 3: an in-app reminder goes to **both the learner and the mentor** if there is no decision.
  - Day 6: the request auto-cancels. Only those two people are notified, and the learner is told to send a new request.
  - "Only day 0, day 3, and day 6 do anything. The quiet days are empty on purpose."
- The day-6 cancel is "not a rejection": "Day 6 clears the request without calling it a rejection." [BS-H]
- "Silence is a finished outcome. The product never nags the mentor after an ignored request." [BS-H]
- "If a mentor never answers, the learner requests other mentors and keeps learning." [BS-H]
- On Accept, the learner sees: "He accepted your request. [Mentor name] is your mentor for this [Course]." [BS-H]
  - This screen does not show which route made the person a mentor ("The door is not shown"). [PM]
- On Accept, the mentor sees the learner name and the course. [BS-H]
- **Admin group assignment** [BS-H, BS-M]:
  - Admin assigns a group to one mentor and one course. The assignment creates the requests.
  - The mentor still has to Accept, and accepts the whole group at once ("not one Accept per person").
  - The group follows the same day-3 reminder and day-6 cancel. Admin stays out of it.
  - After Accept, each person is their own match, with their own Quit and their own Course Completed. One person's quit or Course Completed does not change the others.
  - A person who quits an assigned match can send an ordinary one-to-one request for the same course.
  - "After Accept, the match forgets how it started."
- Admin may assign **anyone** as the mentor [FG-M]:
  - That person becomes a mentor for the course afterwards, not only for the group, but only once they Accept.
  - If they never Accept, they are not a mentor for that course.

### Mentorship lifecycle
- There are **three routes** to being a mentor for a course [FG-M, FG-R]:
  - pass gold on that course;
  - have that course approved by Admin at registration;
  - Accept an Admin assignment for that course.
- The match goes live on Accept. "GrowMate stores the pairing." The match screen is "a pairing record: no message thread, no in-app calls." [BS-H]
- Conversation happens outside the app: "It will happen in Teams or somewhere else." GrowMate "does not connect to Teams, and it does not track the talks." [BS-H]
- **Quit** [BS-H]:
  - Either the learner or the mentor can quit. There is no accept or reject on the quit, and it "takes effect when it is sent".
  - The other person gets an in-app acknowledgement whose body is the quitter's free-text reason ("write whatever they want"; "There is no required sentence").
  - The mentor is "free for the next learner immediately".
- "A mentor quitting mid-course is normal. A new mentor comes and they talk." GrowMate "does not preserve the old talks, and it does not block the next match." [BS-H]
- "Quit is the only place a reason is written." [BS-H]
- **Course Completed** is clicked by the mentor only. It "itself gives the learner the assessment". There is no separate Enable Assessment step. [BS-H]
- Course Completed means "the mentor judges this person ready for the assessment. It does not mean the sessions are merely over." [FG-M]
- "The mentor's Course Completed click only opens the assessment. Only passing gold makes the person a mentor." [FG-M]
- A live match ends only when someone quits or the mentor clicks Course Completed. "The product does not cancel it on its own." There is no timer after Accept. [FG-M, FG-R]

### Assessments / badges / retakes
- Admin uploads the assessment for each stage and sets its pass mark. "The mark is whatever Admin sets. It is not a fixed product rule." [BS-H]
- Course Completed reveals **bronze only**. Silver appears only after bronze is cleared, and gold only after silver. [BS-H]
- **Retake rule** (this refines the README's one-month retake) [BS-H, BS-M]:
  - After a failed stage, the learner may retake once immediately.
  - A second failure locks that stage for one month.
  - After the month, the learner gets two tries again.
  - "Two tries, then a month, then two tries again. The month resets the pair. It repeats, and it never drops to a single try."
  - The next stage stays hidden while the current one is locked.
- Bronze and silver "give nothing of their own". They only open the next stage. [BS-H]
- Gold makes the person eligible to mentor **that course**. "After gold, nothing else stays on the learner's record." [BS-H]
- **No badge** is awarded. [BS-H, BS-M]

### Certificates / resume
- "No certificate, no badge, and no resume line is added." [BS-H, BS-M] This contradicts the README (section 8).

### Notifications
All notifications mentioned are **in-app**. No email or other channel is mentioned.
- Day-3 reminder to the learner and the mentor. [BS-H]
- Day-6 cancel to those two only, telling the learner to send a new request. [BS-H]
- On Accept, the confirmation to the learner. [BS-H]
- On quit, the acknowledgement to the other person, carrying the free-text reason. [BS-H]
- Admin gets no request-flow notifications. [BS-H]

### Admin
- See the fixed list in section 2, plus the forge additions:
  - per-course yes/no on the registration list;
  - assigning anyone as a group's mentor. [BS-H, FG-M]
- The registration list "needs no score" [PM]. "No evidence standard was set. That was accepted, not solved." [FG-R]

### Progress tracking
- The leaderboard was reduced to "a list of employees who are upskilling. Nothing more." [BS-H]
  - "Everyone can open it. It is for tracking only."
  - "It does not match a mentor, grant a reward, or give Admin an action."
  - "Rank does not trigger anything."
- Bar and status [PM]:
  - Half-blue is "the in-progress paint for the whole live match", not a claim that the course is half done.
  - "The learner's screen stays a plain unfinished bar until the mentor clicks Course Completed."
  - There is no line that says the mentor is the record.
  - A learner sitting on an unchanged half-blue bar for the whole match is normal.
- The status words listed are "Not yet started, in progress, Completed, rejected". The fourth was painted as Quit (red). [BS-H, PM]
  - The report notes: "A request that dies on day 6 is a cancel, not this bar." [BS-H]

## 4. Rejected ideas (with reason where given)

- **Admin verification of experienced mentors** (published criteria, transparent decision, an appeal citing the failed checklist item, a "two doors" Gold-or-tenure model) was rejected: "Verification, appeals, calendars, and suspension never entered the closed list of Admin features." [BS-H] (The forge later reintroduced a scoreless Admin yes/no at registration, without criteria or appeal. See section 8.)
- **Mentor availability calendar** (months and hours set by the mentor; Admin can suspend but not edit) was rejected: "There is no availability calendar in the plan that closed." [BS-H]
- **Day-6 extras** from the coach were rejected because "Admin was then kept out, and the calendar was not part of the plan that closed" [BS-H]:
  - showing other mentors with open hours;
  - a request limit that dead requests don't count against;
  - an Admin view of ignored requests.
- **Reject button on requests**: it was offered, removed, briefly returned ("Accept and Reject"), then removed again. The final rule is Accept only. [BS-H, BS-M]
- **A required reason on requests** (at first any non-empty reason was valid) was replaced by "The request itself is enough." [BS-M]
- **"The mentor cannot drop out until every test and badge is done, unless the learner asks to stop"** was set down and replaced by "either can quit". [BS-H]
- **A stop that needs the mentor's approval** (the learner gives a reason and the mentor accepts the stop) was replaced by a unilateral quit. [BS-H]
- **"Experienced people taking the Gold badge exam do not need a mentor"** was set down. [BS-H] (Bronze still appears only after Course Completed.)
- **An Enable Assessment step after Course Completed** was replaced: "the click itself gives the learner the assessment." [BS-H]
- **A leaderboard ranked by bronze, silver and gold points**, gold passers only, per course, was set down. An **Admin-only board** was also set down. "Both sketches were set down. Rank does not trigger anything." [BS-H]
- **Bronze and silver as points or rewards**: "The picture they then called fine does not score the stages." [BS-H]
- **The README's three levels, Gold badge and one-month wait as fixed rules**: they were declared "unset, not decided rules". Three stages and a month wait were later re-chosen in a different form. [BS-H]
- Forge rejections [FG-R]:
  - Course Completed meaning "the sessions are merely over".
  - Gold as the only route; mentorship granted at registration without an Admin decision.
  - A registration check naming only one course, or "one stamp for the whole list".
  - Assignment limited to existing mentors, limited to the group only, or starting when Admin selects the person rather than on Accept.
  - A timer that ends a live match after Accept.
- **In-app chat** was refused (Winston: "refuses to build chat"). Sally wanted the gap "felt", and Sitadevi sided with Winston. [PM]
- **Winston's "lamp"** was overruled by Sitadevi. The bar stays plain. [PM]
- A **"halfway-done" reading of the half-blue bar** was dropped. [PM]

## 5. Open questions / unresolved items

- **Evidence standard for Admin's registration yes/no**: none. "That was accepted, not solved." [FG-R]
- **"Names more than one course"**: it is unclear whether the registration check needs at least two courses or simply allows several. [FG-M]
- **Is the registration mentor check optional or required for every employee?** Not stated. [FG-M]
- **How a learner finds or chooses a mentor for a course**: not specified. The only hint is "requestable" for approved courses. The "other mentors with open hours" suggestion was rejected. [FG-M, BS-H]
- **Leaderboard or upskilling list**: these are not defined:
  - who appears on it (anyone in a live match? anyone who has started?);
  - whether it is per course or global;
  - which fields it shows.
  - Whether points exist at all is also unclear (section 8). [BS-H, BS-M]
- **Status label "rejected" versus "Quit"**: the four statuses were spoken as Not yet started, in progress, Completed, rejected, but the fourth colour is "Quit". The final label is unresolved. [BS-H, PM]
- **What moves a match from "Not yet started" to "in progress"**: no trigger is defined. Accept makes the match live, and the bar is half-blue "for the whole live match". [BS-H, PM]
- **What happens to the bar or status when the mentor clicks Course Completed versus when gold is passed** is not spelled out beyond "Completed is full green". [BS-H]
- **Gendered strings** ("guide him", "He accepted"): the user said "Ignore small wording questions", so this is unresolved and was deprioritised. [BS-M]
- **Mind mapping** was named but "left unopened". [BS-H]
- **Can someone assigned by Admin, who then Accepts, mentor one-to-one requests for that course afterwards?** Yes, that is locked [FG-M]. But whether a person can hold several live matches or groups at once is not stated.
- The forge personas raised points that were not locked:
  - "Amelia — two doors need two records";
  - "Maya — show approved and refused apart";
  - "Omar — the dropped checkbox".
  - No decisions are recorded on them. [FG-R]

## 6. Constraints and non-functional notes

- **Scope**: POC. "GrowMate proves one loop." [BS-M]
- **No integration** with Teams or any conversation tool. Talks are out of scope, and GrowMate stores only the pairing. [BS-H]
- **No chat and no calls in the app.** [BS-H, PM]
- **Privacy and visibility** [BS-H]:
  - Admin has no visibility of the request flow ("No admin queue, and no admin visibility").
  - Old talks are not preserved.
  - The quit reason reaches only the other person in the match.
- **Shippability**: "Dana — yes or no is enough to ship" (the scoreless registration decision). [FG-R]
- Platform, scale, team, timeline and tech stack: **nothing stated** in these five files.
- Dates: brainstorm 24 Oct 2026, forge and party mode 26 Oct 2026. Party mode closed into design-thinking DEFINE. [BS-H, FG-M, PM]

## 7. Qualitative intent (tone, feel, principles)

- "The course outlives the mentor." The product is built around the course, not around people. [BS-H]
- "Quit is normal." A mid-course mentor quit "is not a failure". "Nothing in the mentorship match flow is a problem." [BS-H]
- "After Accept, the match forgets how it started." A group assignment and a one-to-one request are "the same door". [BS-H]
- "Silence is a finished outcome." The product never nags. "The quiet days are empty on purpose." [BS-H]
- **Admin is kept out on purpose**: "Admin is not invited to wind" the request clock. Admin's chair during the request clock is "Empty. Not in this flow." Admin's feature list is a "closed hand". [BS-H]
- "Quit is the only place a reason is written." Everything else is bare (bare request, bare yes/no). [BS-H, PM]
- "The click is the record. Talks stay outside GrowMate." / "the click is the wall" (Winston). [PM, FG-R]
- Gold is permission, not a prize: there is no score and no reward. "Bronze and silver give nothing of their own." [BS-H]
- These are all to be treated as "normal" or "ordinary", not as gaps to fix [PM]:
  - the empty middle (unchanged half-blue);
  - the mentor's click;
  - Admin's scoreless list.
- The learner "waits on a person" (Sally), and that wait is acceptable because the click means the mentor judges them ready. [FG-R, FG-M]
- Keep it minimal: "Ignore small wording questions." The brainstorm was "kept loose". [BS-M, BS-H]

## 8. Contradictions between files (and against README or earlier points)

- **Badge, certificates, resume**:
  - The README and the brainstorm's opening goal include a Gold badge, certificates and resume lines.
  - The brainstorm's outcome: "No certificate, no badge, and no resume line is added." [BS-H, BS-M]
- **Retake**:
  - The README says a one-month retake wait.
  - The brainstorm refines it to two immediate tries, a one-month lock, then two tries again, repeating. [BS-H]
- **Who can become a mentor**:
  - The brainstorm closed on gold as the only route, with Admin verification rejected [BS-H; FG-M note: "Standing rule: only passing gold makes someone a mentor"].
  - The forge (later) added a registration route needing Admin approval, plus the assignment route. It also added a sixth Admin feature to the "Nothing more" list. [FG-M]
- **Admin assignment**:
  - The brainstorm implies assigning a group to an existing mentor.
  - The forge allows "anyone", who becomes a course mentor on Accept. [FG-M]
- **Leaderboard and points**:
  - [BS-M] still records a per-course board ranked by points, and "the points Admin already tracks". The POC loop says "while admin tracks points".
  - [BS-H] (the closing report) says the board "lost its scores" and is just a list. Admin item 3 is "See the leaderboard, for tracking".
  - **Whether any points or ranking exist remains contradictory.** The final words favour no scores.
- **Request Reject button**: [BS-M] shows Reject removed, re-added and removed again. The final rule is Accept only. [BS-H]
- **Mentor nagging**: the day-3 reminder goes to the mentor too, while "the product never nags the mentor after an ignored request". This is consistent if read as "after day 6", but worth stating explicitly. [BS-H]
- **Status wording**: "rejected" as a spoken status versus the red "Quit" paint, and versus the rule that a request is never rejected (no Reject; day 6 is "not a rejection"). [BS-H, PM]
- **Problem statement versus outcome**: the new-hire fear ("a mentor this week for a skill I already use") was not solved in the brainstorm. The forge registration route serves it, but only through an Admin yes/no. [BS-H, FG-M]
