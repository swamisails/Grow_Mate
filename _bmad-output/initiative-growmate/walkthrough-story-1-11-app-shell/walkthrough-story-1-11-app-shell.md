# Walkthrough — The app shell: theme, page header and page states (story 1.11)

Target: commit `f86e381` on branch `story/1-11-app-shell` — the implementation of story 1.11, including the three review fixes. It builds on story 1.1 (`a22a86c`) and the dev proxy commit (`1a15865`), which are not walked through.

Current block: **Review complete** — all blocks accepted 2026-11-17.

## Blocks

### [x] 1 — Intent (done)

From the story's plan file, [story-the-app-shell-theme-page-header-and-page-states-plan.md](../tickets/epic-accounts-courses-first-mentors/tickets/story-the-app-shell-theme-page-header-and-page-states-plan.md), verbatim:

> **Problem:** Entry 1 left a bare SPA: no theme toggle, no page header, a blank screen while loading, unknown URLs silently redirected, and no shared handling for 401, 422 or 409. Every later page needs these.
>
> **Approach:** Complete the shell from EXPERIENCE.md (epic 1, entry 11; covers R11): a sun/moon theme toggle, a `PageHeader` with its title tile, and shared page-state primitives for Loading, Not found, 401 → Sign in → back, 422 field errors and 409 refusals. Sign in and Admin Courses adopt them.

Decisions made while planning (2026-11-12): the toggle also sits on the signed-out bar; `web/` gets Vitest for unit tests; the plan was kept whole.

### [x] 2 — Broad strokes (done)

All of this is front-end only; the API is unchanged. One component decides what each URL shows, and a handful of small shared pieces supply the states and controls every page reuses. Open these in order:

- [web/src/app/App.tsx:17](../../../web/src/app/App.tsx#L17) — `CurrentPage`: the single place that picks Loading, Not found, a redirect to Sign in, or the page itself.
- [web/index.html:8](../../../web/index.html#L8) — the inline script that sets the theme before anything is drawn.
- [web/src/app/PageHeader.tsx:19](../../../web/src/app/PageHeader.tsx#L19) — the header every page now opens with (tile, `<h1>`, optional action, `<title>`).
- [web/src/api/client.ts:38](../../../web/src/api/client.ts#L38) — `onUnauthorized`: how a 401 from any call reaches the session.
- [web/src/app/forms.ts:12](../../../web/src/app/forms.ts#L12) — the 422 and 409 helpers that forms reuse.

### [x] 3 — Theme: first visit, toggle and memory (done)

The theme is a `data-theme` attribute on `<html>`; the existing tokens already switch on it. An inline script in `index.html` sets it before first paint, from the stored choice or, on a first visit, the OS setting, so there is no flash. The toggle flips the attribute and stores the choice under one `localStorage` key, `growmate-theme`; if storage is blocked it still works for the current page view.

- [web/index.html:8](../../../web/index.html#L8) — pre-paint script; keeps working when storage throws.
- [web/src/app/theme.ts:30](../../../web/src/app/theme.ts#L30) — `useTheme`; [`THEME_KEY`](../../../web/src/app/theme.ts#L10) must stay in step with the script ([web/index.html:13](../../../web/index.html#L13)).
- [web/src/app/ThemeToggle.tsx:6](../../../web/src/app/ThemeToggle.tsx#L6) — sun/moon `<button>` named "Switch to dark mode" / "Switch to light mode".
- [web/src/app/layout.tsx:16](../../../web/src/app/layout.tsx#L16) — the toggle in the signed-out bar; [web/src/app/layout.tsx:52](../../../web/src/app/layout.tsx#L52) — the shared signed-in bar (Admin and Employee) that later stories factored out.

### [x] 4 — Page header and page states (done)

Every page now starts with `PageHeader`, which also sets `<title>` to "{page} · GrowMate". `Loading` and `NotFound` are the shared states; Not found links to the user's home, or to Sign in when signed out. Sign in and Admin Courses moved their `<h1>` out of the card into the header.

- [web/src/app/PageHeader.tsx:19](../../../web/src/app/PageHeader.tsx#L19) — tile, title and the single action slot (later stories added `tag` and `titleRef`).
- [web/src/app/documentTitle.ts:5](../../../web/src/app/documentTitle.ts#L5) — the `<title>` hook.
- [web/src/app/PageStates.tsx:9](../../../web/src/app/PageStates.tsx#L9) — `Loading`; [web/src/app/PageStates.tsx:18](../../../web/src/app/PageStates.tsx#L18) — `NotFound` (403 and 404 look the same).
- [web/src/features/courses/AdminCourses.tsx:29](../../../web/src/features/courses/AdminCourses.tsx#L29) — the simplest page using the header.

### [x] 5 — Routing, 401 and the return path (done)

`CurrentPage` checks in order: still loading → Loading; `/` → home; unknown path or wrong role → Not found; signed out on an admin page → `/sign-in?return=<path>`; signed in on Sign in → the return path, or home. A 401 from any call except the boot-time `/me` clears the user, so the same rule sends them to Sign in. The return path is accepted only if it is a same-origin path, and only if it leads somewhere other than the current page. Story 1.6 later added the pending Mentor check to this chain: it wins over the return path after sign-in, and holds every Employee page until it is done.

- [web/src/app/App.tsx:47](../../../web/src/app/App.tsx#L47) — Not found for unknown and forbidden.
- [web/src/app/App.tsx:57](../../../web/src/app/App.tsx#L57) — signed out → Sign in with the return path.
- [web/src/app/App.tsx:61](../../../web/src/app/App.tsx#L61) — after sign-in; the same-page guard is a review fix.
- [web/src/app/session.ts:57](../../../web/src/app/session.ts#L57) — `returnPath`: rejects `//`, `/\`, absolute URLs and anything not starting with `/`.
- [web/src/api/client.ts:80](../../../web/src/api/client.ts#L80) — which 401s fire the listener; [web/src/app/SessionProvider.tsx:36](../../../web/src/app/SessionProvider.tsx#L36) — the listener clears the user.
- [web/src/app/Router.tsx:77](../../../web/src/app/Router.tsx#L77) — `Navigate` now skips a redirect once the browser has left the page it was rendered for, so Sign out isn't overtaken by a stale redirect.

### [x] 6 — Form errors: 422 and 409 (done)

`fieldErrors` keeps the first API message per field of a 422; the form shows each one under its field, links it with `aria-describedby` and `aria-invalid`, and `focusFirstInvalid` moves focus to the first. If that field already has focus, it is blurred and refocused so screen readers read the new message (a review fix). `useConflict` handles a 409 by keeping the API message and re-fetching; `ConflictMessage` is an always-present polite live region. Since 1.11, Registration decisions, the Mentor check and the Course editor use `useConflict`; story 1.2 taught `focusFirstInvalid` to focus the first enabled control of a `<fieldset>` named by a group-level error key.

- [web/src/app/forms.ts:12](../../../web/src/app/forms.ts#L12) — `fieldErrors`; [web/src/app/forms.ts:40](../../../web/src/app/forms.ts#L40) — `focusFirstInvalid`.
- [web/src/app/forms.ts:66](../../../web/src/app/forms.ts#L66) — `useConflict`; [web/src/app/forms.ts:90](../../../web/src/app/forms.ts#L90) — `ConflictMessage`.
- [web/src/features/accounts/SignIn.tsx:35](../../../web/src/features/accounts/SignIn.tsx#L35) — Sign in using them; other errors still show in one alert line.

### [x] 7 — Tests (done)

`web/` now has Vitest with jsdom and Testing Library (dev only) for the logic the browser suite can't reach. The new Playwright spec covers every edge-case row a browser can reach. Two assertions in the existing sign-in spec changed because the behaviour changed: the post-sign-out redirect now carries `?return=`, and the wrong-password message is now the Email field's description rather than an alert (same text).

- [web/src/app/App.test.tsx](../../../web/src/app/App.test.tsx) — mid-use 401 → Sign in with return; return path to Sign in itself goes home.
- [web/src/app/forms.test.tsx](../../../web/src/app/forms.test.tsx) — 422 field errors and focus, 409 message and re-fetch.
- [web/src/app/session.test.ts](../../../web/src/app/session.test.ts) — `returnPath` rejections and the 401 listener.
- [web/src/app/theme.test.ts](../../../web/src/app/theme.test.ts) — toggle and blocked storage.
- [e2e/tests/app-shell.spec.ts:4](../../../e2e/tests/app-shell.spec.ts#L4) — theme, titles, Loading, Not found, return path, wrong password.
- [e2e/tests/admin-sign-in.spec.ts:33](../../../e2e/tests/admin-sign-in.spec.ts#L33) and [e2e/tests/admin-sign-in.spec.ts:43](../../../e2e/tests/admin-sign-in.spec.ts#L43) — the two changed assertions.
- Later stories added [web/src/app/roles.test.tsx](../../../web/src/app/roles.test.tsx) and [web/src/app/router.test.ts](../../../web/src/app/router.test.ts) beside these; they are not part of 1.11.

### [x] 8 — Periphery (done)

- [web/package.json:11](../../../web/package.json#L11) — `npm test`, plus the four dev dependencies (Vitest 4, pinned for Node 20).
- [web/vite.config.ts:19](../../../web/vite.config.ts#L19) — the Vitest settings.
- [web/src/app/copy.ts:18](../../../web/src/app/copy.ts#L18) — new strings for the toggle and the page states.
- [web/src/app/icons.tsx](../../../web/src/app/icons.tsx) — shared inline Material Symbols.
- [web/src/app/styles.css:108](../../../web/src/app/styles.css#L108) — header focus ring, toggle, page header and `.meta` styles.
- [web/src/app/tokens.css](../../../web/src/app/tokens.css) — comment update only.
