---
title: 'Admin publishes a Course and Employees see it'
type: 'feature'
ticket: '4'
created: '2026-11-12'
status: 'built'
baseline_revision: 'cad084687d81fc75014d0060289356ddd1447089'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md'
  - '{project-root}/_bmad-output/initiative-growmate/ux-growmate/DESIGN.md'
  - '{project-root}/_bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Courses remain drafts; Employees cannot discover them.

**Approach:** Publish a complete saved Course after confirmation, freeze its editor and API writes, and expose published Courses through Employee list/detail pages. Covers epic 1 R6.

## Boundaries & Constraints

**Always:** API owns completeness and returns `can_publish`. Require Bronze, Silver and Gold, each with a whole-number Pass mark 1–100, at least one nonblank question, at least two nonblank options and exactly one correct option; title is nonblank. Keep partial-draft saving. Publish and Save lock the same Course row inside transactions. Published Courses reject all edits. Incomplete/repeated Publish and frozen writes return 409 with a Courses error code. Employee responses contain only id, title and description. Use role policies, Sanctum, JsonResources and matching TypeScript types.

Publish operates on saved content: disable it during unsaved edits or pending requests; Save remains explicit. Confirm with “Published courses can't be edited.” Cancel changes nothing. Refetch after success or 409. Published editor shows its tag and no mutation controls. Dialog supports keyboard focus, Escape and focus restoration (Cancel/Esc return focus to Publish; after a successful Publish, focus moves to the page `<h1>`). All SPA wording lives in `copy.ts`.

**Never:** unpublish/delete, Mentor lists, Stage-taking UI, progress, notifications, autosave, or assessment data in Employee responses. Preserve the existing untracked walkthrough folder.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Publish | Complete saved draft, confirm | Published; read-only editor; Employee visibility | — |
| Cancel | Confirmation dismissed | Remains draft | — |
| Incomplete | Missing Stage/question/mark or invalid options | Disabled Publish; direct API refuses | 409 |
| Unsaved | Local edits | Publish disabled until saved/refetched | Existing Save 422s |
| Frozen/stale | Save or repeat Publish after publishing | No stored changes; refetch read-only state | 409 |
| Hidden | Employee requests draft/unknown id | Same Not found | 404 |
| Access | Guest reads; Employee publishes | No access or mutation | 401; 403 |
| Empty | No published Courses | “No courses yet.” | — |

</frozen-after-approval>

## Code Map

- `api/app/Modules/Courses/`: Save already locks; `published_at` needs explicit assignment; Resources derive status. Authoring includes answers; Requests allow partial drafts.
- `api/routes/api.php`: retain role-before-lookup and numeric-id constraints.
- `web/src/features/courses/CourseEditor.tsx`: saved Course plus Draft; reuse refetch/field errors and `web/src/app/forms.ts` conflict handling.
- `api/tests/Feature/Courses/CoursesTestCase.php`: role/document helpers. `e2e/run.sh` resets the e2e stack.

## Tasks & Acceptance

**Execution:**
- [ ] `api/composer.json`, `api/composer.lock`, `api/AGENTS.md` — satisfy the required Laravel Boost setup before application edits; reread generated guidelines.
- [ ] `api/app/Modules/Courses/Actions/`, `Queries/PublishEligibility.php`, `ErrorCode.php`, `Exceptions/CourseRuleViolation.php` — add PublishCourse, guard SaveCourseDraft, share completeness and refusals. Relative paths here are under Courses.
- [ ] `api/app/Modules/Courses/Http/`, `Queries/`, `Policies/CoursePolicy.php`, `CoursesServiceProvider.php`, `api/routes/api.php` — publish endpoint, authoring eligibility, protected published-only list/detail Queries and minimal Resources.
- [ ] `api/app/Modules/Courses/Database/Seeders/CoursesSeeder.php`, `api/database/seeders/DatabaseSeeder.php` — idempotent complete demo Courses including Python Basics, through Actions after Accounts, only in local/e2e.
- [ ] `web/src/api/courses.ts`, `web/src/api/types/courses.ts` — matching contracts and calls.
- [ ] `web/src/features/courses/CourseEditor.tsx`, `PublishConfirmation.tsx`, `web/src/app/PageHeader.tsx`, `copy.ts`, `styles.css` — eligibility, dirty handling, confirmation, Published tag, read-only state and refusal/refetch.
- [ ] `web/src/features/courses/EmployeeCourses.tsx`, `CoursePage.tsx`, `routes.ts`, `web/src/app/layout.tsx`, `web/src/features/accounts/Home.tsx` — list/detail, navigation, Home link and page states.
- [ ] `api/tests/Feature/Courses/`, `web/src/features/courses/*.test.tsx`, `web/src/app/roles.test.tsx`, `e2e/tests/course-publishing.spec.ts` — matrix, privacy, freeze, seeding and dialog keyboard tests.
- [ ] `e2e/tests/admin-sign-in.spec.ts`, `employee-accounts.spec.ts` — update seeded-list and Courses navigation expectations; keep empty-list coverage separately.

**Acceptance Criteria:**
- Given a complete saved draft, when Admin confirms Publish, then Employees can browse it and UI/API edits are refused.
- Given Employee requests, when list/detail checks run, then drafts and answers remain hidden.
- Given the seeded Docker stack, when verification runs, then publishing and existing account/draft journeys pass.

## Implementation Notes

## Plan Change Log

- 2026-11-12, review loop 1: triage finding 3 (focus dropped to `<body>` after confirming Publish) was an intent_gap. The human renegotiated the Intent: after a successful Publish, focus moves to the page `<h1>`. The human chose to fix in place rather than revert and rebuild. Known-bad state avoided: focus restored to a disabled, then removed, Publish button. KEEP: all existing implementation, which passes verification; Cancel/Esc still return focus to Publish.

## Review Triage Log

Loop 1 (quick lens):

| # | Location | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | `api/app/Modules/Courses/Exceptions/CourseRuleViolation.php` | Every 409 refusal is reported/logged with a stack trace | medium | Extends RuntimeException with only `render()`; no `report()`, `ShouldntReport` or `dontReport`; `bootstrap/app.php` sets only `shouldRenderJsonWhen` | patch |
| 2 | `CoursesSeeder.php` | Partial seed (Create committed, Save/Publish threw) is never repaired | low | Real only if fixed demo content becomes invalid or the DB fails mid-seed; fix adds transaction wrapping. Unlikely in everyday use | rejected |
| 3 | `PublishConfirmation.tsx` + `CourseEditor.tsx` `handlePublish` | Focus drops to `<body>` after confirming Publish | medium | `setConfirming(false)` and `setSaving(true)` commit together; the unmount cleanup focuses the opener after it is already `disabled`; the published view then removes it. EXPERIENCE.md says focus returns to the opener, which no longer exists after success; no app pattern decides the target | intent_gap |
| 4 | `e2e/tests/admin-sign-in.spec.ts` | Admin "No courses yet." e2e check removed, not kept separately | low | The plan's task says to keep empty-list coverage separately; the only new empty test covers the Employee page | patch |
| 5 | `CoursePage.tsx`, `CourseEditor.tsx` `PublishedCourse` | Null description renders an empty Description card/value | low | `description` is nullable; both render unguarded, while `EmployeeCourses.tsx` guards it | patch |
| 6 | `CourseEditor.tsx` `PublishedCourse` | ` (Correct)` brackets hard-coded in JSX | low | Intent: all SPA wording lives in `copy.ts`; `copy.courseEditor.correct` is `'Correct'` | patch |
| 7 | `PublishEligibility.php`, `CoursesSeederTest.php`, `PublishCourseTest.php` | Untyped closure param; data providers lack PHPDoc array shapes | low | Boost guidelines in `api/AGENTS.md` require both; the sibling closures are typed | patch |

## Verification

- `cd api && php artisan test` — API, freeze, privacy and seed tests pass.
- `cd web && npm run lint && npm test && npm run build` — clean frontend checks.
- `./e2e/run.sh` — full browser suite passes on built Docker images, including confirmation keyboard behavior.
