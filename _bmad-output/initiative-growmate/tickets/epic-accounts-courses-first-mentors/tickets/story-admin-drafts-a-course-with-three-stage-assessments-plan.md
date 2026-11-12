---
title: 'Admin drafts a Course with three Stage Assessments'
type: 'feature'
ticket: '2'
created: '2026-11-12'
status: 'built'
baseline_revision: 'f86e381cb8dfbe597247d34bb02562e4278195c8'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md'
  - '{project-root}/_bmad-output/initiative-growmate/architecture-growmate/architecture-growmate.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admin has no way to author a Course. Publishing (entry 4), the Mentor check (entry 6) and taking Assessments (epic 3) all need Courses with Bronze, Silver and Gold Assessments to exist.

**Approach:** Create the Courses module (epic 1, entry 2; covers R5). It has a Course → 3 Stages → questions → options schema, admin endpoints to create, read and save a draft as one document, and the authoring rules enforced by the API. In the SPA, Admin Courses lists Courses with Draft tags and a New Course button, and a Course editor saves explicitly and reloads the saved state.

## Boundaries & Constraints

**Always:**
- AD-3:
  - Code lives in `api/app/Modules/Courses/` (Actions, Models, Queries, Http, Policies, `ErrorCode.php`).
  - Controllers validate, then call one Action or Query, then return a `JsonResource`.
  - Each Action runs in one transaction.
  - Routes sit under `/api/v1/admin/courses`, behind `auth:sanctum` and `can:admin`.
- AD-4: published state is stored as a nullable `published_at`, with no status column. It stays null throughout this story.
- AD-10: 422 field errors use Laravel's dot keys (`stages.0.questions.1.options.0.text`). The SPA hand-writes `web/src/api/types/courses.ts` in the same commit as the Resource.
- AD-2: after Save, the editor re-fetches the Course and shows the server state. There is no autosave and no optimistic update.
- Stages are exactly three per Course, created with it: Bronze, Silver, Gold, in that order. Questions and options keep the order Admin authored them in.
- The SPA uses entry 11's primitives: `PageHeader`, `Loading`, `NotFound`, `fieldErrors` and `focusFirstInvalid`. A missing Course, or a Course id that isn't a number, shows Not found. Every string goes in `copy.ts`.
- EXPERIENCE.md patterns apply:
  - Every input has a visible `<label>`.
  - Each question's correct option is a radio in a `<fieldset>` with a `<legend>`.
  - Draft and Published are neutral outlined tags.
  - "+ New Course" is the page header's primary action.

**Decisions (2026-11-12):**
- Save checks only what is present:
  - Every question present must have ≥2 options and exactly 1 correct.
  - Every Pass mark entered must be a whole number from 1 to 100.
  - Title is required.
  - A Stage with no questions, or a blank Pass mark, saves as an incomplete draft. Entry 4's Publish refuses it, so the ticket's "Stage with no question … refused" check belongs to entry 4.
- The plan is kept whole (~2,700 tokens) by choice; no split.

**Never:** publishing, the read-only published editor, and refusing edits to a published Course (all entry 4); delete or unpublish; the Employee side; demo Course seeding (entry 4); a leave-page warning; a rich-text editor.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Create | New Course, title + description, Save | Course created with 3 empty Stages; editor at `/admin/courses/{id}` | — |
| Full draft round-trip | all 3 Stages filled, Save, reload | identical content and order | — |
| No title | blank title, Save | refused; message under Title | 422 `title` |
| One option | a question with 1 option | refused under that question | 422 `stages.n.questions.m.options` |
| Two correct | 2 options marked correct | refused under that question | 422 `stages.n.questions.m.options` |
| Pass mark 0 / 101 / 50.5 | out-of-range or non-whole | refused under that Pass mark | 422 `stages.n.pass_mark` |
| Partial draft | Silver and Gold empty, Gold Pass mark blank, Save | saved; reload shows Bronze filled, Silver and Gold empty | — |
| Question with no correct | 2 options, none marked correct | refused under that question | 422 `stages.n.questions.m.options` |
| Not Admin | Employee session on admin courses API | refused | 403 |
| Unknown Course | `/admin/courses/999` | Not found page | 404 |

</frozen-after-approval>

## Code Map

- `api/routes/api.php` -- the admin group, `prefix('admin')->middleware('can:admin')`. Add the courses routes there.
- `api/app/Modules/Accounts/` -- the pattern to copy:
  - a ServiceProvider registered in `api/bootstrap/providers.php`;
  - invokable controllers;
  - `JsonResource`s with an `@mixin` docblock.
  Courses depends on Accounts, never the reverse.
- `api/database/migrations/` -- migrations live here, not inside modules (entry 1). Use timestamped files.
- `api/database/seeders/DatabaseSeeder.php` -- don't add a Courses seeder; entry 4 seeds demo Courses.
- `api/tests/Feature/Accounts/AccountsTestCase.php` -- stateful-Referer setup. Tests run on in-memory SQLite (`phpunit.xml` forces it), so schema and queries must work on both SQLite and MySQL 8.4.
- `api/app/Modules/Accounts/Models/User.php` -- `#[UseFactory]` and the factory pattern, including the `admin()` state.
- `web/src/app/router.ts`, `App.tsx` -- routes match by exact `path ===`. This story needs `/admin/courses/new` and `/admin/courses/:id`, so add `:param` matching and expose the params, for example through `useRouter().params`. Keep the existing exact routes working.
- `web/src/app/forms.ts` -- `fieldErrors` and `focusFirstInvalid` match inputs by `name`. Name the editor inputs with the API's dot keys. Group-level keys (`…questions`, `…options`) have no input, so render their message inside the group and focus that group's first control.
- `web/src/app/PageHeader.tsx` -- the `action` slot is for "+ New Course". Add the icons the pages need to `icons.tsx`.
- `web/src/features/courses/AdminCourses.tsx`, `routes.ts` -- the static empty page. It becomes the real list.
- `web/src/api/client.ts` -- `api` has only `get` and `post`. Add `put`.
- `e2e/tests/` -- the `signIn` helper pattern from `app-shell.spec.ts`. `run.sh` resets the database before each run.

## Tasks & Acceptance

**Execution:**
- [x] `api/database/migrations/*_create_courses_tables.php` -- create four tables:
  - `courses`: title, description, `published_at` nullable, timestamps.
  - `stages`: `course_id`, `level` (bronze, silver or gold, unique per course), `pass_mark` nullable unsigned tinyint.
  - `questions`: `stage_id`, `position`, text.
  - `options`: `question_id`, `position`, text, `is_correct`.
  Cascade deletes from course downward.
- [x] `api/app/Modules/Courses/Models/*` -- `Course`, `Stage`, `Question` and `Option`, with relations ordered by `position` (stages by level order), and factories.
- [x] `api/app/Modules/Courses/Actions/CreateCourse.php`, `SaveCourseDraft.php` -- create the Course and its 3 Stages; save the whole document in one transaction, replacing each Stage's questions and options.
- [x] `api/app/Modules/Courses/Queries/AdminCourses.php`, `CourseForAuthoring.php` -- the list (newest first) and the full authoring read, including `is_correct`.
- [x] `api/app/Modules/Courses/Http/*` -- endpoints and resources:
  - `GET` and `POST /admin/courses`, `GET` and `PUT /admin/courses/{course}`.
  - Form Requests holding the authoring rules, applied only to what is present: per question, at least 2 options and exactly 1 correct; a Pass mark, when given, an integer from 1 to 100; trimmed non-empty text. Questions may be empty and Pass marks null.
  - `CourseResource` (with `status` derived as `draft`) and `CourseListItemResource`.
- [x] `api/app/Modules/Courses/CoursesServiceProvider.php`, `ErrorCode.php`, `api/bootstrap/providers.php`, `api/routes/api.php` -- wiring. `ErrorCode` starts empty; entry 4 adds the first code.
- [x] `api/tests/Feature/Courses/*` -- one test per I/O row, plus ordering and a non-Admin 403 on each endpoint.
- [x] `web/src/app/router.ts`, `App.tsx` -- `:param` routes and `params`.
- [x] `web/src/api/client.ts`, `web/src/api/types/courses.ts`, `web/src/api/courses.ts` -- `put`, the hand-written types and the calls.
- [x] `web/src/features/courses/AdminCourses.tsx`, `CourseEditor.tsx`, `routes.ts`, `web/src/app/copy.ts`, `styles.css`, `icons.tsx` -- the pages:
  - The list: a table card with a title link and a Draft tag; "+ New Course"; and an empty state of "No courses yet."
  - The editor: one column of cards (Course details, then one card per Stage). Each Stage card has Add question and Remove question, Add option and Remove option, a Correct radio per option, the Pass mark field, and Save.
- [x] `web/src/features/courses/*.test.tsx` -- nested 422 errors land under the right control and focus it; Save re-fetches.
- [ ] `e2e/tests/course-drafts.spec.ts` -- create, fill all three Stages, save, reload and compare; save a partial draft; a one-option question and a Pass mark of 101 are refused under their fields.

**Acceptance Criteria:**
- Given a saved draft, when Admin reloads its editor, then every Stage shows the same questions, options, correct choices and Pass marks in the same order.
- Given `php artisan test`, `npm run lint`, `npm test`, `npm run build` and `./e2e/run.sh`, when they run, then all pass.

## Implementation Notes

- **No route model binding for `{course}`.** Laravel runs `SubstituteBindings` before the `can:admin` middleware, so binding would answer a non-Admin 404 for a missing Course and 403 for an existing one. `CourseForAuthoring` and `SaveCourseDraft` take the id and `findOrFail` instead, so a non-Admin always gets 403. Routes use `whereNumber('course')`, so a non-numeric id is a 404.
- **Group-level 422 keys.** Each question's options sit in a `<fieldset name="stages.n.questions.m.options">` (legend "Options"), nested in the question's `<fieldset>` (legend "Question m"). `focusFirstInvalid` now focuses a matched fieldset's first control. Keys with no control in the editor (e.g. `stages`) show their message next to Save.
- **One Save button**, at the end of the form after the Gold card, rather than one per Stage card, because the save is a single whole-document PUT.
- **Copy with numbers**, so each control has a distinct accessible name: "Question 1" (legend), "Option 1" (label), radio "Correct" (visible) named "Correct, option 1", "Remove option 1", "Add option to question 1", "Remove question 1". The page name while loading is "Course editor".
- **New Course** shows only the Course details card. Its Save POSTs, then replaces the URL with `/admin/courses/{id}`, which loads the Course from the API. A new question starts with two empty options.
- **No `Policies/` in Courses.** Access is the existing `admin` gate (Accounts' `AdminPolicy`) on the route group.
- Factories live in `api/database/factories/`, following `UserFactory`. `CourseFactory` creates the three Stages, as `CreateCourse` does.

## Plan Change Log

## Review Triage Log

### Review pass 1 (quick lens, 2026-11-12) — high 0, medium 1, low 1, false 1

| # | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|
| 1 | Unparseable Pass mark (`1e`, `-`) saves as blank with no refusal | medium | patch | `type="number"` reports bad input as `''`; `toRequest` sends `null`; the API accepts an incomplete draft and the field still shows `1e` |
| 2 | Overflowing numeric Course id returns 500, not 404 | low | patch | `whereNumber` accepts `99999999999999999999`; PHP throws `TypeError` coercing it to `int $course` (checked with `php -r`); fix is a one-line route constraint |
| 3 | e2e task unchecked, so the all-checks acceptance criterion lacks evidence | false | reject | `./e2e/run.sh` ran green in step 3 (16 passed, including `course-drafts.spec.ts`); the fix would only edit this plan |

## Design Notes

- **Whole-document save** (`PUT` with the full Course) fits AD-3's "one Action", and gives AD-2's re-fetch a single source. Replacing a Stage's questions and options on each save is safe: drafts have no attempts, and Assessments' `stage_attempts` reference Stages, which are never replaced.
- **Copy where the UX docs are silent** (adjust at approval): editor title "New Course", or the Course's title; buttons "Add question", "Remove question", "Add option", "Remove option", "Save"; radio label "Correct"; field labels "Title", "Description", "Question", "Option", "Pass mark (%)".
- **Lengths** are not specified anywhere: title and option text ≤ 255, description and question text ≤ 2000. No cap on the number of questions or options.

## Verification

**Commands:**
- `cd api && php artisan test` -- expected: Accounts and Courses feature tests pass.
- `cd web && npm run lint && npm test && npm run build` -- expected: clean.
- `./e2e/run.sh` -- expected: all specs green, including `course-drafts.spec.ts`.
