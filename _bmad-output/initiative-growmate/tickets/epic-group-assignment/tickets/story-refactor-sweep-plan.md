---
title: 'Refactor sweep (epic 4)'
type: 'refactor'
ticket: '4'
created: '2026-11-18'
status: 'built'
baseline_revision: '7817803affc8e220242f48e975422571ef81c5e4'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 4 left two deferred cleanups:
- `AcceptRequest` looks up the Mentor's name and the Course title again for every Learner in a group, though they are the same for the whole group. This was rejected as low in the 4.2 review.
- The "Assignment created" live region on Group assignment is hidden with `display: none` while empty, so it may not be announced when it appears. This was deferred from the 4.3 review.

**Approach:**
- Resolve the name and title once per Accept and pass them to the per-Request step.
- Keep the empty live region in the accessibility tree, cancelling the flex gap instead of hiding it, so the page looks the same.
- No API response, notice, test expectation or visible layout changes.

</frozen-after-approval>

## Implementation Notes

Oneshot: two small edits, `AcceptRequest.php` and `styles.css`, well under 100 lines, with no new behaviour to test.

Left out:
- The uncommitted `api/.env.example` edit. It is the user's and is epic 1 retro item 8.
- The four `hidesSecrets` copies across e2e specs. Three belong to epic 2's specs, and epic 1 retro item 4 covers consolidating them.

Changed:
- `api/app/Modules/Matching/Actions/AcceptRequest.php`: a new private `noticeFields()` resolves the Mentor name and Course title once per Accept, and `accept()` takes them as arguments.
- `web/src/app/styles.css`: the empty created-card live region cancels the flex gap with a negative margin instead of `display: none`.

## Review Triage Log

- Quick review: high 0, medium 0, low 2, false 0, maybe-false 0. No unmet acceptance criteria and no bugs.
  - low, patch: an inline comment above `$fields` broke the api CLAUDE.md "prefer PHPDoc" rule. Its reason moved into `noticeFields()`'s PHPDoc.
  - low, patch: spreading a string-keyed array into `accept()`'s named parameters made a rename fail at runtime (`Unknown named parameter`) with nothing to catch it. `noticeFields()` now returns a list, destructured and passed explicitly.

## Verification

**Commands:**
- `cd api && php artisan test --compact && vendor/bin/pint --dirty --format agent`: unchanged results (only the known rate-limit test fails).
- `cd web && npm run lint && npm test && npm run build`: clean.
- `./e2e/run.sh`: unchanged results (only the 5 known failures).
