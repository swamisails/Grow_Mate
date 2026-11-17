# Review log: story-1-11-app-shell

Target: commit f86e381cb8dfbe597247d34bb02562e4278195c8 on branch story/1-11-app-shell (story 1.11 implementation: app shell — theme, page header and page states).

## 1 — whole target — orientation

Timestamp: 2026-11-12T11:30:24+05:30

- Action: Walkthrough started.
- Result: Intent taken verbatim from the plan file (no story ticket file exists for entry 1.11).
- Evidence: _bmad-output/initiative-growmate/tickets/epic-accounts-courses-first-mentors/tickets/story-the-app-shell-theme-page-header-and-page-states-plan.md

## 2 — whole target — resume

Timestamp: 2026-11-17T10:56:43+05:30

- Action: Walkthrough resumed in a new session.
- Result: Narrative was at block 1 (Intent, in progress); blocks 2–8 not visited. Since commit f86e381, later stories (1.2–1.10) changed 22 of the referenced files (e.g. web/src/app/App.tsx, forms.ts, layout.tsx, styles.css, SignIn.tsx, AdminCourses.tsx), so narrative line references point at working-tree files that have drifted from the target commit.
- Evidence: `git diff --stat f86e381c HEAD` over the referenced paths: 22 files, 1324 insertions, 148 deletions.

## 3 — whole target — branch move

Timestamp: 2026-11-17T11:24:48+05:30

- Action: Walkthrough moved to branch docs/1-11-walkthrough (from origin/main); user decided the reviewed notes will be raised as a docs PR once the walkthrough is finished. Epic 2 work is owned by another contributor (open PRs #10, #13, #15), so this session does nothing on epic 2.
- Result: Story 1.11 code confirmed already merged (PR #1, PR #4); commit f86e381 is an ancestor of origin/main.
- Evidence: `git merge-base --is-ancestor f86e381c origin/main` succeeded.

## 4 — block 1 Intent — accepted

Timestamp: 2026-11-17T11:25:35+05:30

- Action: Reviewer marked block 1 done.
- Result: Intent accepted as stated in the plan. Block 2 entry-point links re-pointed to current main lines (App.tsx CurrentPage now line 17, PageHeader line 19); index.html:8, client.ts:38, forms.ts:12 unchanged.
- Evidence: reviewer said "done".

## 5 — block 2 Broad strokes — accepted

Timestamp: 2026-11-17T11:32:46+05:30

- Action: Reviewer marked block 2 done; block 3 presented.
- Result: Block 2 accepted. Block 3 links re-pointed to current main; theme.ts, ThemeToggle.tsx and index.html unchanged since f86e381; layout.tsx:52 is now the shared signed-in bar used by both Admin and Employee layouts (factored after 1.11).
- Evidence: reviewer said "done"; `git diff --stat f86e381c HEAD -- web/src/app/theme.ts web/src/app/ThemeToggle.tsx web/index.html` empty.

## 6 — block 3 Theme — accepted

Timestamp: 2026-11-17T11:33:40+05:30

- Action: Reviewer marked block 3 done; block 4 presented.
- Result: Block 3 accepted. Block 4 links re-pointed to current main; all 10 Epic 1 pages (SignIn, SignUp, MentorCheck, Home, EmployeeCourses, CoursePage, Notices, AdminCourses, CourseEditor, RegistrationDecisions) use PageHeader; PageStates.tsx and documentTitle.ts unchanged since f86e381.
- Evidence: reviewer said "done"; grep of web/src/features for PageHeader; `git diff --stat f86e381c HEAD -- web/src/app/PageStates.tsx web/src/app/documentTitle.ts` empty.

## 7 — block 4 Page header and page states — accepted

Timestamp: 2026-11-17T11:34:48+05:30

- Action: Reviewer marked block 4 done; block 5 presented.
- Result: Block 4 accepted. Block 5 links re-pointed to current main; CurrentPage's 1.11 check order (loading, `/`, not found, signed out → sign-in with return, guest page when signed in) intact; story 1.6 inserted the Mentor-check redirect (pending check wins over return path; final gate sends Employee pages to the step).
- Evidence: reviewer said "done"; web/src/app/App.tsx:17-74 on main.

## 8 — block 5 Routing, 401 and the return path — accepted

Timestamp: 2026-11-17T11:36:13+05:30

- Action: Reviewer marked block 5 done; block 6 presented.
- Result: Block 5 accepted. Block 6 links re-pointed; narrative's "No page sends a 409-producing request yet" was stale and replaced (useConflict now used by RegistrationDecisions, MentorCheck, CourseEditor; focusFirstInvalid gained fieldset/group-key handling in later stories).
- Evidence: reviewer said "done"; `git diff f86e381c HEAD -- web/src/app/forms.ts`; grep of web/src for useConflict.

## 9 — block 6 Form errors: 422 and 409 — accepted

Timestamp: 2026-11-17T11:39:45+05:30

- Action: Reviewer marked block 6 done; block 7 presented.
- Result: Block 6 accepted. Block 7 links re-pointed (admin-sign-in.spec.ts changed assertions now at lines 33 and 43); ticket verify items map to app-shell.spec.ts tests at lines 5, 18, 69, 105, 126.
- Evidence: reviewer said "done"; grep of e2e/tests/app-shell.spec.ts and admin-sign-in.spec.ts on main.

## 10 — block 7 Tests — accepted

Timestamp: 2026-11-17T11:40:24+05:30

- Action: Reviewer marked block 7 done; block 8 presented.
- Result: Block 7 accepted. Block 8 links re-pointed (copy.ts theme strings now line 18, states line 22; styles.css header focus ring now line 108); tokens.css unchanged since f86e381.
- Evidence: reviewer said "done"; grep of web/src/app/copy.ts and styles.css on main.

## 11 — block 8 Periphery — accepted

Timestamp: 2026-11-17T11:42:17+05:30

- Action: Reviewer marked block 8 done.
- Result: Block 8 accepted.
- Evidence: reviewer said "done".

## 12 — whole target — wrap-up

Timestamp: 2026-11-17T11:42:18+05:30

- Action: Review finished; all 8 blocks accepted by the reviewer.
- Result: Story 1.11 (commit f86e381, merged via PR #1 and #4) reviewed against current main; no defects found; narrative links re-pointed to current main where later Epic 1 stories moved code. Follow-through agreed with reviewer: open a docs PR from branch docs/1-11-walkthrough with the walkthrough notes only (api/.env.example excluded).
- Evidence: reviewer said "done" on every block.
