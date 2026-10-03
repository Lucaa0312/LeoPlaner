# Tasks

Verification for every task: `cd web && npm run build` finishes without errors, plus the browser
check named in the task (backend running, page served as described in README).

## 1. Design tokens and base styles

- [x] 1.1 Rewrite `web/style/essentials.css` with the light and dark tokens from the dummy, base styles and the fonts Hanken Grotesk / IBM Plex Mono (Google Fonts link); verify both themes by setting `data-theme="dark"` on `<html>` in the dev tools
- [x] 1.2 Add `web/style/components.css` with sidebar, page header, buttons, chips, table, side panel, dialog, toast and week grid styles; verify by build and later page checks
- [x] 1.3 Add `web/assets/js/themeInit.js` (plain classic script, sets `data-theme` from `localStorage` with try/catch) and `src/ts/utils/periods.ts` (days and 1.–10. EH with times); verify that a stored dark theme shows no light flash on reload

## 2. App shell and shared building blocks

- [x] 2.1 Create `components/appShell.ts` (groups Planung / Stammdaten / Daten, active entry, collapse saved in `localStorage`, theme switch, no account entries) replacing `pages/navbar.ts`; verify on one page that collapse and theme survive a reload
- [x] 2.2 Add `algorithmApi.ts` and the running dot via `isAlgorithmRunning` in the shell; verify the dot appears while a run is active
- [x] 2.3 Create `pageHeader.ts`, `toast.ts`, `confirmDialog.ts`, `placeholder.ts`; verify each by using it on the first page in group 3
- [x] 2.4 Create `sidePanel.ts`, `chipSelect.ts`, `toggleSwitch.ts`, `weekGrid.ts`; verify each by using it on the pages below
- [x] 2.5 Add `deleteRequest` to `apiHelpers.ts` and `deleteTeacher`, `deleteRoom`, `deleteSubject` to the API modules; rewrite `putJson` with `await` instead of `.then()`; verify a delete request with the browser network tab

## 3. Master data pages

- [x] 3.1 Rooms: rewrite `rooms.html` / `rooms.ts` / `rooms.css` as table with search, side panel (number, name, short, room types with at least one type) and delete with confirmation; verify create, edit, search, delete and the missing-type error
- [x] 3.2 Subjects: rewrite `subjects.*` as table (short, name, required room types, teachers, color) with side panel including the existing color selector and delete with confirmation; verify that a changed color is stored
- [x] 3.3 Teachers: rewrite `teacher.html` / `teachers.ts` / `teacher.css` as table (name, short, subjects as chips, weekly hours) with side panel (name, short, subjects) that keeps the existing availability; verify that editing a teacher keeps his "kann nicht" slots
- [x] 3.4 Classes: new `classes.html` / `classes.ts` listing name, home room, subject count and weekly hours; "Neu", edit and delete call `showNotAvailable()`; verify no request is sent in the network tab
- [x] 3.5 Class-subjects: rewrite `classSubjects.*` as table with class filter chips; add `createClassSubject`; form with class, subject, teacher filtered by subject, hours > 0, two switches; edit and delete as placeholders; verify that a created class-subject appears after reload (if the backend ignores a field, follow the risk note in design.md and ask before continuing)
- [x] 3.6 Availability: new `availability.html` / `availability.ts` with teacher list and summary, week grid cycling verfügbar / möchte nicht / kann nicht, saving right after each click, "Alle zurücksetzen"; verify that a marked slot is still there after reload

## 4. Übersicht and Import / Export

- [x] 4.1 New `overview.html` / `overview.ts` with count tiles (Lehrer, Klassen, Räume, Fächer, Klassen-Fächer; 0 on error) linking to their pages; turn `dashboard.html` into a redirect; verify counts against the tables
- [x] 4.2 (dropped again in 8.1) Add the pre-optimization check list with badge, first affected record and fix link to the Übersicht; verify by creating a class-subject without a fitting teacher or a room without type
- [x] 4.3 New `importExport.html` / `importExport.ts` reusing `importButton.ts` and `exportButton.ts`, plus "Demodaten laden" / "Daten zurücksetzen" moved from `dashboard.ts` (feature flags, confirmation, 409 message); verify import result list, export file name, and hidden admin actions when flags are off
- [x] 4.4 Change root `index.html` to forward to `web/pages/overview.html`; verify that opening the root URL shows the Übersicht and creates no data

## 5. Stundenplan and Optimierung

- [x] 5.1 Rewrite `timetable.html` / `timetable.ts` / `timetable.css`: header with "Excel-Export" and "Optimieren", view switch Klasse / Lehrer / Raum with selection list, `weekGrid` with subject colors and double periods, first class as default, empty grid without errors on an empty database; verify all three views
- [x] 5.2 Show the "Optimierung läuft" banner on the timetable page when `isAlgorithmRunning` is true; verify during a run
- [x] 5.3 (Standard mode dropped again in 8.2) New `optimization.html` / `optimization.ts` (takes over `graph.ts`): mode switch, Standard mode with "Optimieren" (automatic mode remembered as in design.md), finished state with link to the timetable; verify a full standard run until "Fertig"
- [x] 5.4 Fortgeschritten mode: Start / Pause / Stopp with status, echarts cost graph using the theme tokens, temperature slider sending `temperature:<n>`; verify pause, resume, slider and stop during a run
- [x] 5.5 (dropped again in 8.1) Block both modes when the pre-optimization check has errors (reuse the check from 4.2), with warning and fix link; verify with a broken record

## 6. Cleanup and integration

- [x] 6.1 Remove Font Awesome script tags, `pages/navbar.ts`, `pages/graph.ts`, `pages/dashboard.ts` and the selectors / popup modules no page imports anymore; verify with `grep -r "fa-\|kit.fontawesome" web/pages web/src` returning nothing and a clean build
- [x] 6.2 Check the code style rules on all changed files (named handlers, no `? :` / `&&` for values, no method chains, no emojis); verify with `grep -nE "addEventListener\([^,]+, *\(|\?[^.?]*:|\.filter\(.*\)\.map\(" web/src/ts -r` and review of the hits
- [ ] 6.3 Click through every page in light and dark design and with collapsed sidebar; verify that every scenario in `specs/web-interface/spec.md` behaves as described

## 7. Large screens (done in the merged change data-check-overview-and-large-screens)

- [x] 7.1 Fluid root size in `essentials.css`, every stylesheet converted from px to rem / em, only 1–2px borders, outlines and the nav divider keep px; verify with `grep -n "px" web/style/*.css`
- [x] 7.2 `.page` max width `150rem`, large-screen breakpoint for the cost graph, echarts sizes scaled by the root size, color wheel click scaling; verify screenshots at 1280, 2560 and 3840 CSS px

## 8. Follow-ups after review

- [x] 8.1 Remove the data check: delete `features/dataCheck.ts`, `utils/fixLink.ts`, `flagRow` / `scrollToFlaggedRow` and `.row-flagged`, the fix-link code in `teachers.ts` / `rooms.ts` / `classes.ts`, the `.issue-list` styles and the block notice in `optimization.ts`; verify with `grep -rn "dataCheck\|fixLink\|row-flagged\|issue-list" web/src web/style` returning nothing and a clean build
- [x] 8.2 Optimierung: remove the mode switch and the Standard card, the former advanced area is the only view; on load toggle the automatic mode off once if `leoplaner-automatic-mode` is `true`, then remove both stored keys; verify a run keeps going until Stopp
- [x] 8.3 Stundenplan: remove the "Optimieren" header button and its handler, keep "Excel-Export" and the running banner; verify the banner still appears during a run
- [x] 8.4 Move "Demodaten laden" / "Daten zurücksetzen" into a shared feature module used by Import / Export and Übersicht; verify both pages behave the same (flags, confirmation, 409 message)
- [x] 8.5 Übersicht: replace the check card with the quick actions card and the two status cards from design.md (decision 10), all sizes in rem; verify the running status during a run, the availability text and the total weekly hours against the class-subjects table
- [ ] 8.6 Start one run with the current (inconsistent) demo data and confirm the backend runs and the timetable fills; if it fails, stop and report
- [x] 8.7 Check the code style rules on all changed files, same grep as 6.2
- [x] 8.8 Add `components/searchSelect.ts` (design.md decision 12) with its styles in `components.css` (rem only); verify open, typing, arrow keys, Enter, Escape, click outside and "Keine Treffer" on the Stundenplan page
- [x] 8.9 Use the search select on the Stundenplan page for Klasse, Lehrer and Raum, entries sorted alphabetically, default selection unchanged (first class from the backend); verify "chitm" lists only the CHITM classes and choosing one loads its timetable, and that switching the view refills the list
- [x] 8.10 `searchSelect.ts`: optional pinned first entry for `setOptions` (not sorted, still searchable); Klassen-Fächer: replace the filter buttons with a search select ("Alle Klassen" pinned and default), keep the preselected class in the form; verify the scenarios "Filter by class", "All classes" and "Filter preselects the form"
- [x] 8.11 Klassen-Fächer form: class and subject as search selects, picking a subject refills the teacher `<select>`; verify the scenario "Search a subject in the form" and that creating a class-subject still works
- [x] 8.12 `searchSelect.ts`: multi mode (chips with remove button, "+ Fach hinzufügen", list with "<Kürzel> · <Name>" and check mark, click / Enter toggles, list stays open until Escape or click outside, `getSelected()` like `chipSelect`); use it for the teaching subjects in the Lehrer form; verify the scenarios "Add subjects by search", "Search by name", "Remove a subject" and "Edit keeps availability"
- [x] 8.13 Cost graph on the Optimierung page like the former `graph.ts` (design.md decision 9b): zoom bar and mouse wheel zoom, "Zoom zurücksetzen" button in the card header, own tooltip, line colored by cost (high orange, low accent), area gradient, "Min" mark after 500 ms without progress, y axis "Kosten"; theme colors from the tokens, sizes scaled with the root size; verify the scenarios "Zoom into the cost graph", "Read a point" and "Minimum after a pause" during a run, in light and dark design
- [x] 8.14 Temperature thermometer (design.md decision 9c): new `components/temperatureGauge.ts` (vertical tube, bulb, log scale 0,1 to 10 000 with labels, fill gradient accent to `--chart-high`, drag / click / keyboard, `role="slider"`), replaces the range input on the Optimierung page, start value 100, live updates paused while dragging, styles in rem; verify the scenarios "Change temperature", "Thermometer scale" and "Live temperature" in light and dark design
