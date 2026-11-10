# Reconcile: forge session (26 Oct 2026) against the PRD and addendum

Sources read: `forge-growmate/forge-growmate.md` (summary), `forge-growmate/.memlog.md` (lock log), `forge-growmate/forge-report.html` (report with the Locked, Rejected, Still thin and Who pressed lists).
Targets: `prd-growmate.md` (PRD) and `addendum.md`. The PRD was not edited.
Precedence: the forge overrides the brainstorm (24 Oct). Within the forge, later locks in `.memlog.md` override earlier ones. Design-thinking (26 Oct) can override the forge.

---

## Gaps

### G1. The refused-course rule ignores the later "assign anyone" door
- **Source:** memlog (earlier lock): "A refused course can be mentored later only by passing gold, and only if the employee chooses to pursue it." Memlog (later decision): "Admin can select anyone, not only someone who already has gold or registration approval for that course." Then: "Mentorship for a course now has three doors."
- **PRD:** FR-3 says "A refused Course can then be gained only by Gold pass." UJ-3 says "The refused course is open to Sam only by passing gold as a learner." FR-10 says Admin can choose "any Employee". FR-11 says Accept makes that Employee a Mentor.
- **Problem:** the PRD contradicts itself. Under FR-10 and FR-11, Admin could assign Sam to a group on the refused course, and Sam would become a Mentor on Accept. The forge's "only gold" lock on refusals came before the "anyone" lock, so the later lock arguably wins. The forge never ruled on this exact case.
- **Fix:** decide the case explicitly and record it as a decision. Option (a): reword FR-3 and UJ-3 to "a refused Course can't be gained through registration again. It can be gained by Gold pass or by an accepted Group assignment." Option (b): add an FR-10 rule that Admin can't choose an Employee for a Course Admin refused them at registration. Option (b) narrows "anyone", so it needs the user's ruling. Until then, add it to §9 Open Questions.

### G2. The forge's Rejected list is only partly carried into addendum §A
- **Source:** forge-growmate.md: "Rejected: gold as the only door. Mentorship granted at registration without Admin. One course only. One stamp for the whole registration list. Assignment limited to people who are already mentors. Assignment applying only to the group. Course mentorship starting when Admin selects them. A timer that ends a live match." The report adds: "Course Completed meaning the sessions are merely over."
- **Addendum §A has:** gold as the only route, one stamp, assignment limited to existing Mentors, and the timer.
- **Absent:**
  1. "Mentorship granted at registration without Admin." The §A row on "Admin verification with criteria and appeals" covers something else.
  2. "One course only" (the registration check limited to one primary course).
  3. "Assignment applying only to the group."
  4. "Course mentorship starting when Admin selects them."
  5. "Course Completed meaning the sessions are merely over."
- **Fix:** add five rows to addendum §A, each sourced "Forge (26 Oct)". Reasons: (1) registration needs an Admin decision per Course; (2) the check names several Courses; (3) an accepted assignment makes the person a Mentor for the Course for future Requests too; (4) mentorship starts at Accept, not at selection (Paige: "selection and Accept are different times"); (5) the click is a readiness judgment.

### G3. "Show approved and refused apart" (Maya) has no requirement
- **Source:** report, Who pressed: "🎨 Maya — show approved and refused apart". Memlog: "Admin may approve some courses named in the registration check and refuse others. A refusal does not block the approved courses."
- **PRD:** absent. FR-3 has only "The Employee is notified of each decision. `[ASSUMPTION]`". No FR says where the Employee, or Admin, sees which Courses were approved and which were refused. §8 says "Mentor routes are invisible to everyone", which can be read as hiding them even from the Employee.
- **Fix:** add a bullet to FR-3: "The Employee can see their Registration decisions, with approved and refused Courses shown separately. Admin's decision screen also shows them separately." Then drop the `[ASSUMPTION]` tag from the notification, because the view grounds it. Make §8 say that hiding routes applies to other Employees, not to the Employee's own Registration decisions.

### G4. Refusals and Registration decisions are not stored as records ("two doors need two records")
- **Source:** report: "💻 Amelia — two doors need two records". Also "🪵 Splinter — the stamp is per course" and "📏 Level — approval needs courses attached".
- **PRD:** partly captured. The glossary defines Mentor route, and §8 stores "Mentor-route records". But §8 doesn't store Registration decisions, refusals included. Without a refusal record, the product can't enforce the rule in FR-3 or G1 that a refused Course isn't regained through registration. It also can't show refused Courses (G3). No FR says a Mentor record names its route and its Course.
- **Fix:** in §8 Data kept, add: "one Mentor record per Employee, Course and route (Gold pass, Registration approval, Group assignment accepted); one Registration decision record per Course named, approved or refused."

### G5. "Registration is not rerun" lacks its consequences
- **Source:** forge-growmate.md: "A refused course returns only if they later choose to pass gold. Registration is not rerun." Memlog: "...and only if the employee chooses to pursue it."
- **PRD:** FR-2 says the check "can't be rerun later", and FR-3 covers refusals. Three points are absent:
  - **Choice:** pursuing Gold on a refused Course is the Employee's own choice. The product doesn't prompt, enrol or nudge them toward it.
  - **Admin can't revisit:** nothing says whether Admin can reverse a decision later. "Not rerun" implies a decision is final.
  - **Later Courses:** FR-2 limits the check to Courses published at signup. A Course published later can never be gained through registration, only through Gold or assignment.
- **Fix:** in FR-3, add "Registration decisions are final. Admin can't reopen them, and the Employee can't appeal or reapply." Add "No prompt toward Gold follows a refusal." In FR-2, note that Courses published after signup can't be named in the check.

### G6. Course Completed: "does not mean the sessions are over" and "the learner can wait" are dropped
- **Source:** forge-growmate.md: "It does not mean the sessions are over. The learner can wait for that. The click only opens the assessment." Memlog: "The learner can wait for Course Completed because it means the mentor thinks they are ready." Report: "🎨 Sally — the learner waits on a person", "Arun — he can leave if the click never comes", "🔬 Dr. Quinn — quit is already the exit", "🧪 Murat — the click is not a pass".
- **PRD:** the readiness meaning is captured (glossary, Vision step 4, FR-14). These points are absent:
  - The click is not a statement that the talks have ended. The pair may keep talking outside the app after it.
  - Waiting is intended. The Learner has no "ask for the click" or nudge action.
  - If the click never comes, the remedy is Quit and nothing else. That is why FR-15 carries no timer.
  - "Only opens": the click grants nothing besides Bronze access. It isn't a pass or a stage result, and it doesn't make anyone a Mentor.
- **Fix:** expand the glossary entry for Course Completed: "It doesn't mean the talks are over, and it isn't a pass." Under FR-14, add "The click opens Bronze and grants nothing else." Under FR-15, add a rationale line: "A Learner whose Mentor never clicks can Quit and request another Mentor. No timer, nudge or escalation exists."

### G7. Omar's "dropped checkbox" and John's "becoming requestable": why the registration door exists
- **Source:** report: "Omar — the dropped checkbox", "📋 John — the job is becoming requestable", "📊 Mary — registration was not in the record". Memlog: "Logs have no registration-time mentor check. Early Admin verification of experienced mentors was replaced." Then: "(decision) Both doors are required: a mentor check at employee registration, and passing gold."
- **PRD:** UJ-3 shows the mechanics, but the reason is absent. Experienced Employees such as Omar would otherwise have to go through the learner path (Course Completed, then Bronze, Silver and Gold) on Courses they already teach. A registration checkbox once existed and was dropped before the forge restored it. §2.1 has no job for the experienced Employee. Its Mentor job doesn't cover "become requestable on Courses I already know."
- **Fix:** add a §2.1 job: "Experienced Employee: 'Become requestable on Courses I already know without relearning them.'" Add the rationale to addendum §A, in the "Gold as the only Mentor route" row.

### G8. Admin's closed feature list grew by exactly one item, and the PRD doesn't say so
- **Source:** memlog: "(decision) Admin gains one feature beyond the closed list: approve the registration mentor check. Gold still needs no Admin approval."
- **PRD:** the §1.1 principle "Admin is kept out on purpose" lists the Registration decision among Admin's duties. It doesn't flag the decision as the single, deliberate exception added to the brainstorm's closed list, or say that Gold never needs Admin.
- **Fix:** add one sentence to that principle: "The Registration decision is the only Admin feature added after the brainstorm's closed list. Gold pass never involves Admin."

---

## Distortions

### D1. "More than one course" became "one or more"
- **Source:** forge-growmate.md: "At registration, name more than one course." Memlog: "The registration mentor check names more than one course." Rejected: "One course only." Report: "🎯 Yui — the count had to be fixed".
- **PRD:** FR-2: "name one or more published Courses". Glossary: "names one or more Courses".
- **Analysis:** the forge's lock settled a crack ("unclear whether the check names one course or several"). The intent was to reject a single "primary course" limit, not to require a minimum of two. "One or more" is probably the intended meaning, but it reads differently from the source text.
- **Fix:** keep "one or more", and record in addendum §A: "Rejected: a check limited to one primary Course (forge). 'More than one' means several are allowed, not a minimum of two." If the user meant a minimum of two, FR-2 must change.

### D2. "Yes or no is enough to ship" is reopened as an open question
- **Source:** report, Still thin: "Admin's registration decision is a yes or no on a claim. No evidence standard was set. That was accepted, not solved." Who pressed: "🚢 Dana — yes or no is enough to ship."
- **PRD:** §9 Q2 asks "Does Admin need any guidance text?" without saying that the bare yes/no was accepted for shipping.
- **Fix:** reword Q2: "Accepted for MVP (forge: 'yes or no is enough to ship'). Post-MVP, should Admin get guidance text?" Mark Q2 as non-blocking.

### D3. "One Accept covers a whole Group assignment" is attributed to forge content it doesn't come from
- **Source:** the forge says only "They become a mentor for that course only when they Accept... After Accept, each person in the group is their own match."
- **PRD:** the glossary's Accept entry ("One Accept covers a whole Group assignment") and FR-11 ("Accept the whole group with one Accept"). This doesn't contradict the forge, but the forge doesn't say it. The forge also doesn't say whether the chosen Employee can accept some Learners and not others.
- **Fix:** check whether party mode or design-thinking sources the single Accept. If neither does, tag it `[ASSUMPTION]` and add it to §10.

---

## Confirmed well-captured

- **Course Completed as part of the idea:** it is the Mentor's readiness judgment, it ends the Match and it opens Bronze (Vision step 4, glossary, FR-14). The Learner can't trigger it. Progress stays In progress (Murat: "the click is not a pass").
- **Gold route:** passing Gold makes someone a Mentor without Admin. Bronze and Silver grant nothing (FR-18).
- **Registration route:** Admin decides per Course with no score. Approved Courses are requestable immediately, a refusal doesn't block the approved ones, and the Mentor still Accepts (FR-3, FR-8, UJ-3). Rejecting one stamp for the whole list is recorded.
- **Assignment route:** Admin may choose any Employee. Mentorship starts on Accept, not on selection, and applies to the Course for future Requests. No Accept means no mentorship, and each Learner gets their own Match (FR-10, FR-11, UJ-4).
- **How a Match ends:** only Quit or Course Completed, with no timer (FR-15, §5, addendum §A).
- **"The click is the record":** no chat or Teams integration (Helen; Dana's "do not rebuild Teams"), in §1.1 and §5.
- **"Still thin" evidence standard:** carried as §9 Q2 (see D2 for the framing).
- **Mentor status is per Course:** three named Mentor routes in the glossary, and Mentor-route records in §8 (partial, see G4).
