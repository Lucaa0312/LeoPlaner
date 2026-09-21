## Context

The frontend is vanilla TypeScript compiled by `tsc` into `web/dist`, seven
static HTML pages, and one hand-written CSS file per page plus
`essentials.css`. There is no bundler, no framework, no CSS preprocessor.
Backend is a Quarkus API on `localhost:8080`; the timetable page additionally
opens a WebSocket for optimizer progress and renders a cost chart with ECharts.

Current pain points that shape the design:

- Layout is expressed in viewport units (`width: 15vw`, `font-size: 2rem`
  with `*` reset), so the UI breaks below ~1400 px and inflates on 4K.
- `#main-content { overflow-y: hidden }` plus fixed-position modals means pages
  cannot scroll; long lists are cut off.
- Active nav state, modal visibility and overlay are set by inline styles from
  TS; CSS cannot theme them.
- Two icon libraries, two fonts (Roboto never loaded, Alte Haas Grotesk
  commented out).
- No feedback on failures beyond `console.error`.
- The timetable page — the product — has a raw grid, an orange debug header
  rule, and the optimizer controls are scattered.

Constraints: keep vanilla TS + static HTML (no framework migration), keep all
API calls, element ids that TS code depends on may be renamed only together
with their TS usage, German UI copy stays.

## Goals / Non-Goals

**Goals:**
- One coherent visual language across landing, dashboard, four data pages and
  the timetable workbench.
- Works from 1024 px laptops to 4K; sidebar collapses at tablet width.
- Light and dark theme from a single token layer.
- Timetable workbench feels like the centre of the product.
- Keyboard and screen-reader basics: real `<nav>`/`<a>`/`<button>`,
  focus-visible rings, `Esc` closes modals, live region for toasts.
- Zero behavioural regressions in data flow.

**Non-Goals:**
- Framework/bundler migration, component library adoption.
- New features (auth, settings page, drag-and-drop editing of the timetable).
- Backend changes.
- Pixel-perfect mobile phone layouts (tablet-and-up is the target; phone must
  not be broken, but is not optimised).

## Decisions

### D1. Token architecture: three layers in `tokens.css`
```
primitives  → --indigo-500, --amber-500, --gray-50…950, --space-1…12, …
semantic    → --color-primary, --color-surface, --color-surface-raised,
              --color-text, --color-text-muted, --color-border, --color-accent,
              --color-success/--color-danger, --shadow-sm/md/lg, --radius-*
theme       → :root (light) and :root[data-theme="dark"] /
              @media (prefers-color-scheme: dark) remap semantic → primitives
```
Components only ever reference semantic tokens. *Why not keep `--leo-*`?* They
are raw hex values named by role-less numbers (`color1`, `color2`); a dark
theme is impossible without a semantic layer. Alternative considered: Tailwind
via CDN — rejected because it fights the existing hand-written class
vocabulary and pulls a large runtime script.

Brand colours are kept: indigo `#4f46e5` primary, amber `#f59e0b` accent. Grey
scale moves from `#ebebeb` flat background to a layered
`surface / surface-raised / surface-sunken` model so cards have depth without
heavy shadows.

### D2. Typography: Inter for UI, Alte Haas Grotesk for display
Inter (Google Fonts, `font-display: swap`) for body/UI; the bundled Alte Haas
Grotesk (free for commercial use) is activated via `@font-face` for page
titles and the landing hero — it gives LeoPlaner a face without a paid font.
A modular scale (`--text-xs … --text-4xl`, 1.2 ratio at 16 px root) replaces
ad-hoc `2rem`/`3rem` values. The global `* { font-family }` reset is removed;
inheritance from `body` is used instead.

### D3. Layout: CSS grid shell, rem sizing, `dvh`
`body` becomes `display: grid; grid-template-columns: var(--sidebar-w) 1fr;
height: 100dvh`. `--sidebar-w` is `16rem` expanded, `4.5rem` collapsed
(`data-collapsed` on `<html>`, persisted in `localStorage`). Below 1024 px the
sidebar becomes an overlay drawer toggled from the page header. `main` is the
only scroll container (`overflow-y: auto`); modals are portalled to `body`
and use `position: fixed; inset: 0`.

### D4. Sidebar rebuilt as semantic markup
`navbar.ts` renders `<nav aria-label="Hauptnavigation"><ul><li><a href …>`.
Active state is `aria-current="page"` styled via CSS — no inline styles. The
footer holds the theme toggle and the (static) account chip. The help entry
becomes a regular nav item at the bottom. Logo: `design/LeoPlaner_Logo.svg`
copied to `web/assets/img/`.

### D5. Modal component replaces `popup.ts`
`components/modal.ts` exports `openModal(el)` / `closeModal(el)` operating on a
`.modal` element with `.modal__header / __body / __footer`. It toggles the
`is-open` class, sets `aria-modal`, traps focus, closes on `Esc` and backdrop
click, and restores focus to the trigger. *Why not `<dialog>`?* The teacher
form is multi-step and existing code manipulates the container freely; a
class-based modal keeps the migration mechanical. The teacher form's step
indicator becomes a real stepper component in the modal header.

### D6. Data pages: one page template
Each of Lehrer/Fächer/Räume/Klassen uses the same skeleton:

```
<header class="page-header">  title · subtitle · <div class="toolbar"> search · primary button
<section class="data-view">    table (Lehrer, Klassen) or card grid (Fächer, Räume)
<div class="empty-state">      illustration · headline · CTA
<div class="modal">            create / edit form
```
Shared styles live in `components.css`; per-page files shrink to what is
truly page-specific (e.g. availability grid, colour picker, room-type
selector). Tables get sticky headers, row hover, and an overflow "⋯" actions
cell; subject cards show the subject colour as a top bar.

### D7. Timetable workbench layout
```
┌ page-header: "Stundenplan" · [Klasse|Lehrer|Raum] segmented · picker ─ ⋯ ┐
│ ┌────────────────── canvas ──────────────────┐ ┌── optimizer rail ────┐ │
│ │ time gutter | Mo Di Mi Do Fr (Sa)          │ │ status chip           │ │
│ │ lesson cards: colour stripe + tinted fill  │ │ cost chart (ECharts)  │ │
│ │ lunch break rendered as a soft band        │ │ temperature slider    │ │
│ └────────────────────────────────────────────┘ │ [Optimieren] [Würfeln]│ │
│                                                │ export · hint         │ │
└────────────────────────────────────────────────┴───────────────────────┘
```
- The canvas is a CSS grid with `grid-template-rows` derived from `units`;
  lesson cards use `grid-row: span duration` instead of pixel heights
  (`ROW_HEIGHT * duration - 10`). This removes the magic `86` constant.
- The rail is `22rem` wide, collapsible to icons; on <1280 px it stacks below
  the canvas.
- The full-screen `.loader` + `#optimizing-text` is replaced by an inline
  progress state on the rail (pulsing status chip, disabled buttons) so the
  user can keep looking at the timetable while it improves.
- The "Stundenplan für Fortgeschrittene" toggle becomes an "Erweitert"
  disclosure inside the rail that reveals the slider and per-iteration chart.
- `graph.ts` keeps its logic; DOM construction moves to class names defined in
  `timetable.css`; ECharts theme colours read from tokens via
  `getComputedStyle` so the chart follows dark mode.

### D8. Feedback: toast, skeleton, empty state
`components/toast.ts` — `toast.success(msg)`, `toast.error(msg)` rendering
into a single `aria-live="polite"` region, auto-dismiss 4 s, max 3 stacked.
`components/skeleton.ts` renders N placeholder rows/cards while a fetch is
pending. `emptyState.ts` grows to accept `{ title, hint, ctaLabel, onCta }`
and an inline SVG illustration per entity. API helpers surface failures via
`toast.error` instead of only logging.

### D9. Landing page
Hero split: left copy + two CTAs (Stundenplan öffnen / Daten verwalten),
right an animated mosaic — a 5×8 grid of tinted tiles that slowly shuffle
(pure CSS keyframes, paused under `prefers-reduced-motion`). Below: three
feature tiles (Daten, Regeln, Optimierung) matching the README's promise.

### D10. Icons: Tabler only
Tabler webfont is already loaded on the dashboard and is open-licensed; the
FontAwesome kit is tied to a personal account. All `fa-*` classes become
`ti ti-*`. Inline SVGs for the "add" rocket and warning triangle are dropped
in favour of icon glyphs.

### D11. Motion
`--ease-out`, `--dur-fast: 120ms`, `--dur-base: 200ms`. Cards lift on hover,
modals fade+scale in, toasts slide in, nav collapse animates width. Everything
is gated by `@media (prefers-reduced-motion: reduce)`.

## Risks / Trade-offs

- [Every page's CSS and markup changes at once → large diff, hard to review]
  → Ship in the task order below: tokens + shell first (visually applies to
  every page immediately), then one page per task group, each independently
  verifiable in the browser.
- [Renaming ids/classes breaks TS selectors silently] → Keep every id that TS
  references unless the task explicitly renames both sides; run `npm run
  build` and click through each page after each task group.
- [Dark theme surfaces hard-coded colours (e.g. `rgba(r,g,b,0.4)` lesson
  fills, ECharts colours)] → Lesson cards use `color-mix(in srgb,
  var(--block-color) 18%, var(--color-surface-raised))`; chart colours are
  read from tokens at draw time and the chart is re-drawn on theme change.
- [Inter via Google Fonts fails offline at school] → `font-display: swap`
  and a system-ui fallback stack; the UI remains usable without it.
- [Removing the FontAwesome kit drops icons used somewhere not audited] →
  grep for `fa-` after migration must return zero hits in `web/`.
- [Full-screen loader removal changes perceived behaviour during
  optimization] → the rail status chip, disabled buttons and a subtle
  progress bar under the page header communicate the same state.

## Migration Plan

1. Land tokens/base/components CSS and the new shell; old page CSS still
   loads on top so nothing is worse than before.
2. Migrate pages one by one (dashboard → data pages → timetable → landing),
   deleting each page's legacy rules as it is migrated.
3. Delete `essentials.css`, remove FontAwesome, rebuild `web/dist`.
Rollback is `git revert` of the change; no data or API impact.

## Open Questions

- Should the account chip stay as a static "Admin" placeholder, or be hidden
  until authentication exists? (Design assumes: keep, static.)
- Saturday column: always shown or only when data contains Saturday lessons?
  (Design assumes: rendered only when a lesson falls on Saturday.)
