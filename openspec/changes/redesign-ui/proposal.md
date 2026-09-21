## Why

LeoPlaner's UI grew page by page: every screen ships its own CSS file, sizes are
expressed in `vw`/`vh` so nothing scales sanely below a 1080p monitor, the
sidebar is a stack of `<div>`s with inline-style active states, two icon
libraries are loaded, and there is no shared vocabulary for spacing, type,
colour, focus or motion. "Appealing UI/UX" is a stated project goal, and the
core product — the timetable workbench — currently looks like a debug view.
The data model and API are now stable enough that a proper visual system can be
laid over them without chasing a moving target.

## What Changes

- **Introduce a design system** (`web/style/tokens.css` + `base.css`):
  semantic colour tokens with light **and dark** themes, a modular type scale,
  spacing/radius/shadow scales, motion tokens with `prefers-reduced-motion`
  support, and a global focus-ring style. All `vw`/`vh` sizing is replaced by
  `rem`-based, container-aware layout.
- **Rebuild the app shell**: a collapsible sidebar (`<nav>` with real links,
  keyboard navigable, active state via class), the real LeoPlaner logo from
  `design/`, a theme toggle, and a consistent page header (title, subtitle,
  actions) shared by every page.
- **Redesign the landing page** as a hero with an animated timetable mosaic and
  clear entry points, replacing the centered button stack.
- **Unify the four data-management pages** (Lehrer, Fächer, Räume, Klassen)
  behind one component vocabulary: toolbar (search + primary action), data
  table / card grid, skeleton loading, illustrated empty states, and a shared
  modal shell (header, scrollable body, sticky footer, `Esc` to close, focus
  trap).
- **Redesign the timetable workbench**: full-height timetable canvas with
  subject-coloured lesson cards, a segmented view switcher (Klasse / Lehrer /
  Raum) with a searchable picker, and a right-hand optimizer rail housing the
  cost chart, live progress, temperature slider and hint copy. Optimization
  progress becomes an inline state instead of a full-screen loader.
- **Add UI feedback primitives**: toast notifications (success / error),
  skeletons and empty states, replacing `console.error`-only failure handling.
- **Consolidate icons** on Tabler Icons; drop the FontAwesome kit.
- **Restyle the dashboard** onto the new tokens (structure unchanged).
- **BREAKING (internal)**: `--leo-primary-color1`, `--leo-primary-color2`,
  `--leo-secondary-color`, `--leo-background-color`, `--leo-text-color` are
  replaced by semantic tokens (`--color-primary`, `--color-surface`,
  `--color-text`, …). Per-page CSS files and `essentials.css` are rewritten.
  No API or data-model changes.

## Capabilities

### New Capabilities
- `design-system`: colour/typography/spacing/radius/shadow/motion tokens,
  light and dark themes, focus styling, base element styles.
- `app-shell`: sidebar navigation, collapse behaviour, theme toggle, page
  header, responsive layout rules shared by all pages.
- `landing-page`: hero, animated timetable mosaic, entry points.
- `data-management-pages`: shared toolbar, list/table, skeleton, empty state
  and modal behaviour for Lehrer, Fächer, Räume and Klassen.
- `timetable-workbench`: timetable canvas, lesson cards, view switcher,
  optimizer rail, inline optimization state.
- `ui-feedback`: toast notifications, loading skeletons, empty-state component.

### Modified Capabilities
- `web-interface`: "Dashboard overview layout" no longer references the
  `--leo-*` palette; it SHALL use design-system tokens and the new app shell.

## Impact

- **Files rewritten**: `web/style/*.css` (all), `index.html`, `web/pages/*.html`.
- **TypeScript touched**: `pages/navbar.ts` (rebuilt), `components/popup.ts`
  (becomes `modal.ts`), `components/emptyState.ts`, new `components/toast.ts`,
  `components/skeleton.ts`, `components/theme.ts`; page scripts
  (`teachers.ts`, `subjects.ts`, `rooms.ts`, `classSubjects.ts`, `timetable.ts`,
  `graph.ts`, `dashboard.ts`) updated for new class names / element ids only —
  data flow and API calls are unchanged.
- **Dependencies**: FontAwesome kit removed; Tabler Icons webfont (already used
  on dashboard) and one web font (Inter) added via CDN. ECharts stays.
- **Backend**: none.
- **Docs**: `documentation/frontend` screenshots become stale and should be
  refreshed after implementation.
