## 1. Design system foundation

- [x] 1.1 Create `web/style/tokens.css` with primitive tokens (indigo/amber/gray scales, space, radius, shadow, type scale, motion) and semantic tokens for the light theme
- [x] 1.2 Add dark theme remaps in `tokens.css` for `:root[data-theme="dark"]` and `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])`
- [x] 1.3 Create `web/style/base.css`: modern reset (no global `font-family`), Inter via Google Fonts + system fallback, `@font-face` for Alte Haas Grotesk, body/heading defaults, `:focus-visible` ring, `prefers-reduced-motion` guard
- [x] 1.4 Create `web/style/components.css` with buttons (primary/secondary/ghost/icon), inputs, search field, badge/chip, card, table, segmented control, modal shell, toast, skeleton, empty state, stepper
- [x] 1.5 Create `web/src/ts/components/theme.ts` (read/write `leo.theme`, apply `data-theme`, cycle light→dark→system) and a tiny inline `<head>` script snippet that applies the stored theme and sidebar state before paint

## 2. App shell

- [x] 2.1 Copy `design/LeoPlaner_Logo.svg` to `web/assets/img/` and create `web/style/shell.css` (grid body, sidebar, collapsed rail, overlay drawer <1024px, page header)
- [x] 2.2 Rewrite `navbar.ts`: semantic `<nav>/<ul>/<a>` with Tabler icons, `aria-current="page"`, Hilfe item, collapse toggle persisted to `leo.sidebar`, footer with theme toggle + account chip
- [x] 2.3 Add the shared `.page-header` markup pattern and a mobile menu button that opens the drawer
- [x] 2.4 Update all six app pages' `<head>` to load `tokens.css`, `base.css`, `components.css`, `shell.css`, the Tabler webfont and the inline theme script; remove the FontAwesome kit and `essentials.css` links

## 3. UI feedback primitives

- [x] 3.1 Create `components/toast.ts` (`toast.success`, `toast.error`, aria-live container, stack ≤3, 4 s auto-dismiss, close button)
- [x] 3.2 Create `components/skeleton.ts` (`renderSkeleton(target, n, kind)` / `clearSkeleton(target)`)
- [x] 3.3 Extend `components/emptyState.ts` with `renderEmptyState(target, { illustration, title, hint, ctaLabel?, onCta? })`, keep `toggleEmptyState`; add inline SVG illustrations for Lehrer, Fächer, Räume, Klassen and "Keine Treffer"
- [x] 3.4 Replace `components/popup.ts` with `components/modal.ts` (`openModal`, `closeModal`, `is-open` class, focus trap, `Esc`/backdrop close, focus restore) and update all imports
- [x] 3.5 Wire `toast.error` into `utils/apiHelpers.ts` failure paths

## 4. Dashboard

- [x] 4.1 Rewrite `dashboard.css` on tokens (stat cards, quick actions, data-management cards, dark-mode legible) and drop legacy rules
- [x] 4.2 Update `dashboard.html`/`dashboard.ts` to the shared page header and Tabler icons; verify counts, import, export and links still work

## 5. Data-management pages

- [x] 5.1 Lehrer: rebuild `teacher.html` on the page template; restyle table (sticky header, hover, actions cell, subject chips), modal with stepper, availability grid and avatar upload in `teacher.css`; add skeleton + empty state; verify create/edit/search
- [x] 5.2 Fächer: rebuild `subjects.html`; card grid with colour top bar, colour selector restyled in `subjects.css`; skeleton + empty state; verify create/edit/search
- [x] 5.3 Räume: rebuild `rooms.html`; card grid with room-type badge, room-type selector restyled in `rooms.css`; skeleton + empty state; verify create/edit/search
- [x] 5.4 Klassen: rebuild `classSubjects.html`; table view, subject/teacher selectors and overview box restyled in `classSubjects.css`; skeleton + empty state; verify create/edit/search
- [x] 5.5 Restyle shared feature widgets (`searchElement.ts`, `subjectSelector.ts`, `selectedItems.ts`, `imagePreview.ts`, `editObj.ts`) to component classes; remove any remaining inline style toggles in favour of classes

## 6. Timetable workbench

- [x] 6.1 Rewrite `timetable.html` structure: page header with segmented view switcher + picker slot, `.workbench` grid with `.canvas` and `.rail`; remove `.loader`, `#optimizing-text`, orange `#header`
- [x] 6.2 Rewrite `timetable.css`: grid rows from `units`, lesson cards with colour stripe and `color-mix()` fill, lunch-break band, rail layout, responsive stacking <1280px
- [x] 6.3 Update `timetable.ts`: lesson cards use `grid-row: span duration` (remove `ROW_HEIGHT`), render Saturday column only when needed, update header title on view change
- [x] 6.4 Update `graph.ts`: move option/class pickers into the segmented control + searchable picker, move optimize/randomize/export/slider/hint into the rail, inline status chip states, "Erweitert" disclosure, success toast on completion
- [x] 6.5 Read ECharts colours from tokens via `getComputedStyle` and redraw on theme change (listen for a `leo:themechange` event dispatched by `theme.ts`)

## 7. Landing page

- [x] 7.1 Rewrite `index.html` and `index.css`: hero with logo, headline, subtitle, two CTAs, CSS-only animated timetable mosaic (static under reduced motion), three feature tiles, responsive below 768px

## 8. Cleanup & verification

- [x] 8.1 Delete `web/style/essentials.css`; grep `web/` for `fa-`, `--leo-`, `vw`/`vh` (outside shell/backdrops) and inline `style.display` toggles; fix remaining hits
- [x] 8.2 Run `npm run build` in `web/`, rebuild `web/dist`, and click through every page in light and dark theme at 1024px, 1440px and 2560px
- [x] 8.3 Verify keyboard flow: tab through sidebar, open/close each modal with `Esc`, focus returns to trigger; check `prefers-reduced-motion` disables animations
- [x] 8.4 Refresh screenshots in `documentation/frontend` and update the `web-interface` spec purpose line
