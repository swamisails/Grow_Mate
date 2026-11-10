---
name: GrowMate
description: In-house match-and-proof loop for learning. Desktop web, plain CSS. Purple brand bar and actions on a pale canvas with white rounded cards, following the project owner's reference internal-tool screens; the four Progress colours stay reserved for the Progress bar.
status: final
sources:
  - ../initiative-growmate.md
  - ../architecture-growmate/architecture-growmate.md
imports:
  - imports/ref-list-screen.png
  - imports/ref-detail-screen.png
updated: 2026-11-10
colors:
  # Light mode. Values sampled from the reference screens (accepted 2026-11-10).
  brand: '#4B2AAD'
  brand-hover: '#3D2290'
  brand-foreground: '#FFFFFF'
  brand-subtle: '#ECE8F8'
  nav-indicator: '#A8E3EE'
  surface-base: '#F7F8FC'
  surface-raised: '#FFFFFF'
  surface-band: '#EEF2FA'
  ink-primary: '#1E1F26'
  ink-secondary: '#5F6370'
  ink-heading: '#14151B'
  ink-disabled: '#A3A7B3'
  border: '#DFE2EA'
  border-strong: '#B8BCC8'
  link: '#4B2AAD'
  focus-ring: '#4B2AAD'
  error: '#B3261E'
  # Progress bar (PRD FR-20). Fixed hues; used only by the Progress bar.
  status-track: '#E6E8EF'
  status-not-started: '#80868B'
  status-in-progress: '#2F6FDB'
  status-completed: '#1E8E3E'
  status-quit: '#C5221F'
  # Dark mode. Not in the reference screens; derived to match.
  brand-dark: '#2E1B70'
  brand-hover-dark: '#3A2390'
  brand-foreground-dark: '#FFFFFF'
  brand-subtle-dark: '#2C2650'
  nav-indicator-dark: '#A8E3EE'
  action-dark: '#9D8CF2'
  action-hover-dark: '#B3A6F6'
  action-foreground-dark: '#14121F'
  surface-base-dark: '#121219'
  surface-raised-dark: '#1C1C26'
  surface-band-dark: '#252536'
  ink-primary-dark: '#E9E9F2'
  ink-secondary-dark: '#A4A7B5'
  ink-heading-dark: '#F5F5FA'
  ink-disabled-dark: '#5E6170'
  border-dark: '#33343F'
  border-strong-dark: '#5A5D6B'
  link-dark: '#B3A6F6'
  focus-ring-dark: '#B3A6F6'
  error-dark: '#F28B82'
  status-track-dark: '#2C2D38'
  status-not-started-dark: '#8A9096'
  status-in-progress-dark: '#6C9EF0'
  status-completed-dark: '#4CB46A'
  status-quit-dark: '#E5605C'
typography:
  # Lexend (headings, nav, table headers) + Nunito Sans (body), self-hosted; system-ui fallback. User: any fonts are fine.
  title:
    fontFamily: 'Lexend, system-ui, sans-serif'
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
  heading:
    fontFamily: 'Lexend, system-ui, sans-serif'
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  nav:
    fontFamily: 'Lexend, system-ui, sans-serif'
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1.2'
  body:
    fontFamily: '"Nunito Sans", system-ui, sans-serif'
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: '"Nunito Sans", system-ui, sans-serif'
    fontSize: 15px
    fontWeight: '600'
    lineHeight: '1.4'
  table-header:
    fontFamily: 'Lexend, system-ui, sans-serif'
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0.08em
  meta:
    fontFamily: '"Nunito Sans", system-ui, sans-serif'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 8px
  md: 10px
  lg: 16px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 28px
  '7': 40px
  page-gutter: 28px
  min-viewport: 1024px
components:
  app-header:
    background: '{colors.brand}'
    foreground: '{colors.brand-foreground}'
    height: 72px
    active-indicator: '2px solid {colors.nav-indicator}'
  page-title-tile:
    background: '{colors.brand}'
    foreground: '{colors.brand-foreground}'
    size: 48px
    radius: '{rounded.md}'
  button-primary:
    background: '{colors.brand}'
    foreground: '{colors.brand-foreground}'
    radius: '{rounded.sm}'
    padding: '{spacing.3} {spacing.5}'
    typography: '{typography.label}'
  button-secondary:
    background: '{colors.surface-raised}'
    foreground: '{colors.brand}'
    border: '1px solid {colors.border-strong}'
    radius: '{rounded.sm}'
    padding: '{spacing.3} {spacing.5}'
    typography: '{typography.label}'
  text-input:
    background: '{colors.surface-raised}'
    foreground: '{colors.ink-primary}'
    border: '1px solid {colors.border-strong}'
    radius: '{rounded.sm}'
    height: 46px
    padding: '0 {spacing.4}'
  card:
    background: '{colors.surface-raised}'
    border: '1px solid {colors.border}'
    radius: '{rounded.lg}'
    shadow: '0 2px 8px rgba(20, 21, 40, 0.06)'
  card-header:
    background: '{colors.surface-band}'
    border-bottom: '1px solid {colors.border}'
    padding: '{spacing.4} {spacing.5}'
    typography: '{typography.heading}'
  list-row:
    border-bottom: '1px solid {colors.border}'
    padding: '{spacing.3} {spacing.5}'
  table:
    header-typography: '{typography.table-header}'
    header-foreground: '{colors.ink-primary}'
    row-height: 60px
    divider: '1px solid {colors.border}'
  tag:
    background: '{colors.surface-raised}'
    foreground: '{colors.ink-primary}'
    border: '1px solid {colors.border-strong}'
    radius: '{rounded.sm}'
    typography: '{typography.meta}'
  progress-bar:
    track: '{colors.status-track}'
    border: '1px solid {colors.border-strong}'
    height: 10px
    width: 160px
    radius: '{rounded.full}'
  dialog:
    background: '{colors.surface-raised}'
    radius: '{rounded.lg}'
    width: 480px
    shadow: '0 12px 32px rgba(20, 21, 40, 0.18)'
  field-error:
    foreground: '{colors.error}'
    typography: '{typography.meta}'
---

## Brand & Style

GrowMate is a small internal tool that records a pairing, a readiness click and three Assessment results, and nothing else. Its look follows the project owner's reference screens of an internal tool (`imports/ref-list-screen.png`, `imports/ref-detail-screen.png`). A solid purple top bar carries the navigation. Below it is a pale, almost-white canvas with white cards. Each card has rounded corners and a tinted header band. Purple is used for actions and links.

The style is calm and administrative, which suits a product whose middle (the weeks between Accept and Course Completed) is meant to be empty. GrowMate takes the reference's colours, type, shapes and layout, but none of its name or logo. The header says "GrowMate" in text.

It is built in plain CSS with no component library. Every component below is hand-built from these tokens. [`mockups/course-page.html`](mockups/course-page.html) shows the tokens applied to the Course page in both modes.

## Colors

- **Brand purple (`{colors.brand}`).** Used for the top bar, primary buttons, links, the page-title tile and the focus ring. It is the one colour that means "you can act here".
- **Nav indicator (`{colors.nav-indicator}`).** The pale cyan underline under the current link in the top bar. It is used nowhere else.
- **Surfaces.** `{colors.surface-base}` is the canvas. `{colors.surface-raised}` is used for cards, inputs and dialogs. `{colors.surface-band}` is the pale blue-grey band behind card headers. `{colors.brand-subtle}` is used only behind the current item in a selection list.
- **Ink.** `{colors.ink-heading}` is used for titles. `{colors.ink-primary}` is used for body text. `{colors.ink-secondary}` is used for labels in label/value rows, dates and empty-state lines.
- **Status.** `{colors.status-not-started}`, `{colors.status-in-progress}`, `{colors.status-completed}` and `{colors.status-quit}` are used only by the Progress bar.
  - The bar's blue (`#2F6FDB`) is kept clearly bluer than the brand purple, so "half blue" (FR-20) never reads as a brand element.
  - The reference's green "Active" pills and green check icons are **not** adopted. GrowMate has no status pills, and green means Completed and nothing else.
- **Error.** `{colors.error}` is used only for validation and refusal messages, as text.
- **Dark mode.** The reference shows light mode only. The dark tokens keep the same structure: a deep purple bar (`{colors.brand-dark}`), dark surfaces and a lighter violet for actions and links (`{colors.action-dark}`), so actions and links stay readable on dark surfaces.

Contrast: ink on surfaces, white on `{colors.brand}`, and `{colors.link}` on white all meet WCAG AA 4.5:1. Status fills meet 3:1, or are outlined by `{colors.border-strong}`.

## Typography

Two families, as in the reference: a geometric sans for headings, navigation and table headers, and a humanist sans for body text. They are Lexend and Nunito Sans, self-hosted as woff2 files, with `system-ui` as the fallback. The project owner has no font preference, so these stand.

- `title` (28px semibold) is the page title, next to its page-title tile.
- `heading` (20px semibold) is used for card headers.
- `nav` (16px medium) is used for top-bar links.
- `body` (15px) is used for all readable text and table cells.
- `label` (15px semibold) is used for buttons and form labels.
- `table-header` (13px, uppercase, letter-spacing 0.08em) is used for column headers.
- `meta` (14px) is used for dates, label/value labels, empty-state lines and errors.

There is no numeric styling, because the product shows no counts or scores.

## Layout & Spacing

- **Desktop only.** The supported width is `{spacing.min-viewport}` (1024px) and up, and nothing reflows below it.
- **Top bar.** Full width and 72px high. Its contents are under Components, App header.
- **Page header.** A 48px `page-title-tile`, with a white icon in a purple rounded square, sits next to the `title`. At most one primary button sits at the right edge of the same row, for example New Course or Assign. There is no result count under the title.
- **Content.** Uses the full width, with a `{spacing.page-gutter}` (28px) gutter on each side, as in the reference.
  - Detail pages (Course page, Match) lay their cards out in a two-column grid with a 28px gap.
  - List pages (Upskilling list, Admin Courses, Registration decisions) use one full-width table card.
  - Home also uses the two-column card grid.
  - All other pages (Courses, Requests, Notices, Assessment and its result, Course editor, Group assignment, Sign in, Sign up and the Mentor check) use a single column of full-width cards.
- **Spacing in use:** `{spacing.5}` (20px) is the horizontal padding of card headers and rows, `{spacing.6}` (28px) separates cards and is the page gutter, `{spacing.3}` (12px) is a row's vertical padding, and `{spacing.2}` (8px) separates an icon from its label.
- **No section sidebar.** The reference's left sidebar serves records with many sections, and no GrowMate screen has more than three.

## Elevation & Depth

- Cards use a soft, low shadow (`0 2px 8px` at 6%) plus a 1px border, as in the reference.
- Dialogs use a deeper shadow over a 40% black scrim (60% in dark mode).
- Nothing else is elevated, and nothing lifts on hover.

## Shapes

- `{rounded.sm}` (8px) is used for buttons, inputs and tags.
- `{rounded.md}` (10px) is used for the page-title tile.
- `{rounded.lg}` (16px) is used for cards and dialogs.
- `{rounded.full}` is used only for the Progress bar.

There are no avatars and no circular icons.

## Components

- **App header.** A `{colors.brand}` bar.
  - "GrowMate" is set in `heading`, in white.
  - Each link is a white 20px icon plus a `nav` label. The current link has a 2px `{colors.nav-indicator}` underline.
  - On the right are the theme toggle (a white sun icon in light mode, a moon icon in dark mode), the signed-in name and Sign out.
  - No badges, counts or dots appear on any link.
- **Icons.** Material Symbols (outlined), inlined as SVG. They are used only in the top-bar links, the page-title tile, the theme toggle and page-header actions. Rows, other buttons and notices have no icons.
- **Button, primary.** A `{colors.brand}` fill with white `label` text and `{rounded.sm}` corners. An optional leading icon is used only on page-header actions ("+ New Course"). In dark mode it uses `{colors.action-dark}` with dark text. Disabled: a `{colors.border}` fill with `{colors.ink-disabled}` text, the same for primary and secondary buttons.
- **Button, secondary.** A white fill, a `{colors.border-strong}` outline and `{colors.brand}` text, like the reference's Clear button. Used for Quit Course, Skip and Cancel. On Registration decisions, Approve and Refuse are **both** secondary buttons, so neither answer is visually favoured.
- **Text input, select and textarea.** 46px high, outlined with `{colors.border-strong}` and `{rounded.sm}` corners. The label floats into the top border once the field has a value or focus, as in the reference's filter fields. On focus, the border turns 2px `{colors.focus-ring}`. A `field-error` message sits below the field.
- **Option list.** Native radio buttons and checkboxes, using `accent-color: {colors.brand}`, each with a text label.
- **Card.** White, with `{rounded.lg}` corners, a border and a soft shadow. A `card-header` band in `{colors.surface-band}` holds the card title, such as "Mentors", "Stages" or "Mentor check".
  - The body holds list rows or label/value rows.
  - A label/value row has the label on the left in `meta`, `{colors.ink-secondary}`, and the value aligned at the card's midline. Rows are separated by a hairline.
  - An empty card shows its empty-state line centred, in `meta`, like the reference's "No active Grow product."
- **List row.** A name or sentence on the left and at most one button on the right, with hairline dividers.
- **Table.** Lives inside a card.
  - The header row uses `table-header` text on white with a bottom divider.
  - Rows are 60px high with hairline dividers.
  - A name that opens a record is shown as a `{colors.link}` link, as in the reference's first column.
  - There is no zebra striping, no sort arrows, no check-icon columns and no action-icon columns.
  - No pagination is needed at practice scale.
- **Tag.** A small outlined box with neutral text, like the reference's "Lite" tag. Used only for plain record states other than Progress status: Draft and Published on Admin Courses, Approved and Refused on Registration decisions. It has no colour fill and no dot.
- **Progress bar.** A 160×10px track in `{colors.status-track}` with a `{colors.border-strong}` outline.
  - Not yet started: fully filled with `{colors.status-not-started}`.
  - In progress: the left half filled with `{colors.status-in-progress}`.
  - Completed: fully filled with `{colors.status-completed}`.
  - Quit: fully filled with `{colors.status-quit}`.
  - No status: no bar at all.

  The bar has no numbers, ticks, markers or animation. The state name ("In progress") sits beside it as plain `meta` text in `{colors.ink-secondary}`, so the state never depends on colour alone.
- **Dialog.** A white box, 480px wide, with `{rounded.lg}` corners. It has a `heading` title, its content and right-aligned buttons, secondary then primary.
- **Notice row.** A list row inside the Notices card, with the sentence in `body` and the date in `meta`. A Quit note shows its reason as quoted text below the sentence. There is no read or unread styling.
- **Stage block** (epic 3). A row in the "Stages" card: the Stage name in `label` on the left, and on the right either a primary button or a `meta` line. EXPERIENCE.md, Component Patterns, says which one appears and which Stages render.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use `{colors.brand}` for the top bar, primary actions, links and the page-title tile | Use brand purple for the Progress bar, or blue for actions |
| Put each topic in a white rounded card with a tinted header band | Use green status pills, check-icon columns or coloured dots from the reference |
| Show the four bar states exactly: full grey, half blue, full green, full red | Add numbers, percentages, ticks, glows or animation to the bar |
| Use neutral outlined tags for Draft, Published, Approved and Refused | Colour-code a Refused tag red or an Approved tag green |
| Style Quit Course and Refuse as secondary buttons | Make Quit or Refuse red or "dangerous" |
| Drop counts like "5 results" from page headers | Show counts, unread badges or "1 active"-style chips anywhere |
| Keep Gold's result as plain as Bronze's | Celebrate Gold with confetti, a trophy, a certificate or colour (C8) |
| Write "GrowMate" as text in the top bar | Reuse the reference tool's logo, name or product sections |
