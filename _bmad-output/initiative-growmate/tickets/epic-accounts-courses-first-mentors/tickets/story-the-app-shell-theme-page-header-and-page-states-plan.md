---
title: 'The app shell: theme, page header and page states'
type: 'feature'
ticket: '11'
created: '2026-11-12'
status: 'built'
baseline_revision: '1a15865d203ddba626c43335c8d1aa7644e7a357'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-growmate/ux-growmate/EXPERIENCE.md'
  - '{project-root}/_bmad-output/initiative-growmate/ux-growmate/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Entry 1 left a bare SPA: no theme toggle, no page header, a blank screen while loading, unknown URLs silently redirected, and no shared handling for 401, 422 or 409. Every later page needs these.

**Approach:** Complete the shell from EXPERIENCE.md (epic 1, entry 11; covers R11): a sun/moon theme toggle, a `PageHeader` with its title tile, and shared page-state primitives for Loading, Not found, 401 → Sign in → back, 422 field errors and 409 refusals. Sign in and Admin Courses adopt them.

## Boundaries & Constraints

**Always:**
- Copy is verbatim from EXPERIENCE.md: "Loading…", "Page not found.", "Switch to dark mode" / "Switch to light mode". All strings go in `web/src/app/copy.ts` (AD-16). API `message` text is shown as sent, never rewritten (AD-10).
- Theme: on a first visit, follow `prefers-color-scheme`. After a click, store the choice in `localStorage` (the only key; nothing auth-related, AD-9). Apply it as `data-theme` on `<html>` before first paint, so the page never flashes.
- Page header: a 48px tile (`brand` background, white 24px Material Symbol, radius 10px), an `<h1>` in the `title` style, and an optional single primary action slot. `<title>` becomes `{page} · GrowMate` on every navigation.
- 403 and 404 look the same: "Page not found." with a link to the user's home (`homePath`).
- 422: show each field's first message under that field, linked with `aria-describedby` and `aria-invalid`, and focus the first invalid field. 409: show `message` in `field-error` inside an `aria-live="polite"` region next to the action, then re-fetch.
- The 401 return path is same-origin only: it must start with `/` and not `//`. Anything else falls back to home.
- Plain CSS with DESIGN.md tokens, no new runtime dependencies, no router library.

**Decisions (2026-11-12):**
- The theme toggle also sits in the signed-out (bare) bar, so a visitor can switch before signing in; the choice carries over.
- `web/` gets Vitest and Testing Library (dev dependencies only) with an `npm test` script; the 422 focus and 409 re-fetch primitives are proved by unit tests there.
- The plan is kept whole (~2,200 tokens) by choice; no split.

**Never:** the Employee top bar or Employee pages (entry 3); real Course data or New Course (entry 2); skeletons or spinners; a 500 or network-error design beyond the existing generic message; persisting anything auth-related in the browser.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First visit, OS dark | no stored theme, OS prefers dark | dark tokens, button "Switch to light mode" | — |
| Toggle and reload | click toggle, reload | the chosen theme persists | `localStorage` unavailable → toggle still works for this page view |
| Session boot | `/api/v1/me` pending | "Loading…" in `main` | — |
| Unknown URL | `/nope`, signed in or out | "Page not found." + link home, inside the matching layout | — |
| Signed out on admin page | `/admin/courses`, no session | Sign in; after success, back to `/admin/courses` | — |
| Session expires mid-use | any API call returns 401 | user cleared → Sign in with the return path → back after sign-in | — |
| Hostile return path | `/sign-in?return=//evil.com` | after sign-in → home | ignored |
| Wrong password | Sign in, bad password | message under Email, focus on Email | 422 `errors.email` |
| Rule refusal | an action gets 409 | `message` announced next to the action; data re-fetched | 409 `{message, code}` |

</frozen-after-approval>

## Code Map

- `web/src/app/App.tsx` -- `CurrentPage` returns `null` while loading and `<Navigate to={homePath}>` for unknown paths. It changes to Loading, Not found, and the 401 redirect with a return path.
- `web/src/app/session.ts`, `SessionProvider.tsx` -- `homePath(user)`, `signIn`, `signOut`. Keep this API; add an unauthorised hook-up so a 401 from any call clears `user`.
- `web/src/api/client.ts` -- the single `request()` and `ApiError {status, code, errors}`. Add an `onUnauthorized` listener and fire it on any 401 except `GET /api/v1/me` at boot (that call's 401 just means signed out).
- `web/src/app/Router.tsx` / `router.ts` -- a hand-written History router. `path` is the pathname only, so `?return=` must be read from `window.location.search`. Reuse `Link`, `NavLink` and `Navigate`.
- `web/src/app/layout.tsx` -- `BareLayout` and `AdminLayout`. Add the toggle to the Admin bar between the nav and the name. The inline-SVG icon pattern (`CoursesIcon`) is the one to copy.
- `web/src/app/tokens.css` -- light and dark tokens already keyed on `:root[data-theme='dark']`. Keep that selector.
- `web/src/app/styles.css` -- `.card`, `.field*`, `.field-error`, `.button*`, `.page`. Extend; don't rename these classes, because the e2e tests and entry 1 use them.
- `web/src/features/accounts/SignIn.tsx` -- shows `ApiError.message` in one `role="alert"`. Switch it to the 422 field-error primitive; e2e expects the text "These credentials do not match our records."
- `web/src/features/courses/AdminCourses.tsx` -- adopt `PageHeader` (menu_book tile) with the empty card below it.
- `web/index.html` -- add the pre-paint theme script.
- `e2e/tests/admin-sign-in.spec.ts` -- the existing tests must stay green. Its `localStorage.length === 0` check runs without a toggle click, so it still holds.

## Tasks & Acceptance

**Execution:**
- [x] `web/index.html`, `web/src/app/theme.ts`, `web/src/app/ThemeToggle.tsx` -- pre-paint script, `useTheme` hook, sun/moon button -- no flash; remembered choice.
- [x] `web/src/app/PageHeader.tsx`, `web/src/app/PageStates.tsx` -- `PageHeader {title, icon, action?}` (sets `document.title`), `Loading`, `NotFound` -- shared by every page.
- [x] `web/src/app/forms.ts` -- `fieldErrors(error)`, `focusFirstInvalid(form, errors)`, `ConflictMessage` / `useConflict(refetch)` -- 422 and 409 primitives.
- [x] `web/src/api/client.ts`, `web/src/app/SessionProvider.tsx`, `web/src/app/session.ts` -- 401 listener clears the user; `returnPath()` helper validates `?return=`.
- [x] `web/src/app/App.tsx` -- Loading on boot; Not found for unknown paths and wrong-role routes; signed-out admin routes go to `/sign-in?return=<path>`; Sign in success goes to the validated return path.
- [x] `web/src/app/layout.tsx`, `web/src/app/copy.ts`, `web/src/app/styles.css` -- toggle in both the bare and Admin bars; new copy; `.page-header`, `.page-header__tile`, `.meta` styles.
- [x] `web/src/features/accounts/SignIn.tsx`, `web/src/features/courses/AdminCourses.tsx` -- adopt the primitives.
- [x] `web/package.json`, `web/vite.config.ts` (or `vitest.config.ts`), `web/src/app/forms.test.tsx`, `web/src/app/session.test.ts` -- Vitest + Testing Library + jsdom dev deps and `npm test`; unit tests for 422 field errors and focus, 409 message and re-fetch, and `returnPath()` rejecting `//`, absolute and non-`/` values.
- [x] `e2e/tests/app-shell.spec.ts` -- one test per I/O row that the browser can reach. Use `page.emulateMedia({colorScheme})` for the OS setting and `context.clearCookies()` to expire the session. Include the toggle on Sign in.

**Acceptance Criteria:**
- Given any page, when it opens, then the `<h1>` and `<title>` name that page and the theme matches the stored choice (or the OS when nothing is stored).
- Given `npm run lint`, `npm test` and `npm run build` in `web/`, when they run, then all pass, and `dependencies` in `package.json` is unchanged (only `devDependencies` grow).

## Implementation Notes

- **Existing e2e edits (unavoidable).** `admin-sign-in.spec.ts` had two assertions the plan's behaviour changes: after Sign out, opening `/admin/courses` now lands on `/sign-in?return=%2Fadmin%2Fcourses` (was `/sign-in$`), and the wrong-password message is now a field error described on Email rather than a `role="alert"` (asserted with `toHaveAccessibleDescription`, same text). Nothing else in that file changed; the `localStorage.length === 0` check stands.
- **`/` stays a redirect home.** Only paths that are neither `/` nor a route show Not found, so `page.goto('/')` still lands on Sign in.
- **Sign in adopts `PageHeader`** (`login` tile) so its `<h1>`/`<title>` follow the shell; the card keeps the form without a header band. Non-field failures (500, network, 429) still show in one `role="alert"` line.
- **Not found** shows "Page not found." as the `<h1>` (no tile), `<title>` "Page not found · GrowMate", and links home labelled "Home" when signed in or "Sign in" when signed out.
- **`Navigate` skips stale redirects** (it only fires if the browser is still on the path it rendered for), so Sign out's own navigation to `/sign-in` can't be overwritten by the cleared session's `?return=` redirect.
- **`returnPath()`** also rejects `/\...` (browsers read it as `//`) and anything whose resolved origin differs.
- **`ConflictMessage`** lives in `forms.ts` via `createElement` (no JSX in a `.ts` file); its `aria-live` region is always rendered so the message is announced.
- **Header focus ring** is white inside `.app-header` (the brand ring is invisible on the brand bar).
- **Test deps** pinned for the local Node 20 as well as the Node 26 image: vitest 4.1, jsdom 29, Testing Library react 16 / dom 10. `theme.test.ts` added for the "localStorage unavailable" row.

## Plan Change Log

## Review Triage Log

### Review pass 1 (quick lens, 2026-11-12) — high 0, medium 3, low 1, false 2

| # | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|
| 1 | `/sign-in?return=/sign-in` leaves a signed-in Admin on a blank page | medium | patch | guest branch navigates to the same pathname; `navigate` → `setPath` unchanged, no re-render, `CurrentPage` keeps rendering an empty `Navigate` |
| 2 | 422 with errors on fields not in the form shows nothing | false | reject | the login API only ever returns `email`/`password` keys (`SignInController` rules, `SignIn` action `withMessages(['email'])`), both rendered by Sign in |
| 3 | No `<h1>`/`<title>` during session boot | low | reject | the frozen matrix defines the boot state as "Loading…" in `main` (met); it lasts one `/me` round trip; fixing it adds route-title branches |
| 4 | Every `GET /api/v1/me` is exempt from the 401 listener, not just boot | false | reject | `getMe()` is called only from `SessionProvider`'s mount effect; no later `/me` call exists |
| 5 | Field error not announced when Email already has focus | medium | patch | Enter from the Email field: `focus()` on the active element fires no focus event, so the new `aria-describedby` is never read; the old `role="alert"` was removed |
| 6 | No test proves mid-use 401 → Sign in with `?return=` | medium | patch | unit test only checks the user is cleared; the e2e redirect comes from the boot `/me` after a reload, not the listener |

## Design Notes

- **Forbidden vs signed out.** Signed out on an admin route is a 401 → Sign in with return. Signed in without the role is a 403 → Not found. An unknown path is Not found for everyone. This matches E's "a forbidden page looks the same as a missing one".
- **Tile in dark mode.** Use DESIGN.md's `brand` and white tokens in both modes. The mock-up's `action-dark` tile isn't in the spine.
- **Return path in the query string** (`?return=`), not in storage, so it survives a reload and keeps the browser free of state.

## Verification

**Commands:**
- `cd web && npm run lint && npm test && npm run build` -- expected: clean, unit tests green.
- `./e2e/run.sh` -- expected: `admin-sign-in.spec.ts` and `app-shell.spec.ts` green.

**Manual checks (if no CLI):**
- `npm run dev` with `php artisan serve`: toggle the theme and reload; open `/nope`; sign out, open `/admin/courses`, sign in, and land back on Courses.
