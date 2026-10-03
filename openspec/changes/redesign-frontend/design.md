# Design

## Context

- The frontend is plain TypeScript compiled by `tsc` (`web/src/ts` to `web/dist/js`), one HTML file per
  page in `web/pages`, one CSS file per page in `web/style`. The DOM is built step by step with
  `document.createElement`; elements are looked up with `getElement` / `aquireElement`; every page
  starts in `initializeApp()` on `DOMContentLoaded`. API calls live in thin modules in `src/ts/api`.
- The click dummy is a React prototype with inline styles and simulated data. Its look, texts and flows
  are copied; its code is not.
- The backend must not change (see proposal). Available: CRUD for teachers, rooms and subjects; only
  `GET /getAllClasses` for classes; `GET` and `POST /classSubjects`; timetable per class, teacher and
  room; algorithm control via REST (`run/algorithmAllClasses`, `stopAlgorithmAllClasses`,
  `toggleAutomaticMode`, `isAlgorithmRunning`, `isAlgorithmRunningAtLeastOnce`) and the WebSocket
  `/api/algorithm/progress` (messages `pause`, `resume`, `temperature:<n>`; it sends `iteration`,
  `temperature`, `currentCost`, `finished`).

## Goals / Non-Goals

**Goals:**
- One shared shell, one set of design tokens and one set of small UI building blocks used by all pages.
- Code that a team member can read top to bottom: explicit page files, no generic framework.

**Non-Goals:**
- No router, no single-page app, no new build tool, no new runtime framework.
- No backend changes, no login, no undo.
- No rework of `web/javascript/` (legacy, not referenced by any page).

## Decisions

### 1. Multi-page app with a shared shell module
Every page keeps its own HTML file. The body only contains `<aside id="sidebar"></aside>` and
`<main id="main-content">…</main>`. A module `components/appShell.ts` (replaces `pages/navbar.ts`)
renders the sidebar, marks the active entry, handles collapse and theme, and asks
`isAlgorithmRunning` once to show the running dot.
*Alternative:* hash-router single page. Rejected: more new code, and it breaks the current
structure that the whole team knows.

Page files after the change:

```
index.html                 -> forwards to web/pages/overview.html
web/pages/overview.html    Übersicht            (replaces dashboard.html)
web/pages/timetable.html   Stundenplan
web/pages/optimization.html Optimierung         (new, takes over graph.ts)
web/pages/teacher.html     Lehrer
web/pages/classes.html     Klassen              (new)
web/pages/rooms.html       Räume
web/pages/subjects.html    Fächer
web/pages/classSubjects.html Klassen-Fächer
web/pages/availability.html Verfügbarkeit       (new)
web/pages/importExport.html Import / Export     (new)
```

`dashboard.html` is kept as a one-line redirect to `overview.html` so old links still work.

### 2. Design tokens as CSS custom properties, theme set before paint
`style/essentials.css` holds the tokens from the dummy (`--bg`, `--sf`, `--sf2`, `--ink`, `--mu`,
`--ln`, `--ac`, `--aci`, `--acs`, `--act`, `--cl`, `--warn`, `--warns`, `--bad`, `--bads`) on
`:root` for light and on `:root[data-theme="dark"]` for dark, plus base styles and fonts.
A small classic (non-module) script `assets/js/themeInit.js` is loaded in `<head>` of every page
and sets `data-theme` from `localStorage` before the body is drawn, so there is no light flash.
It is plain JavaScript, not TypeScript: `tsc` emits every file as an ES module (`export {}`), which a
classic script cannot load, and a module script runs too late.
All `localStorage` access is wrapped in `try/catch`.

### 3. Shared CSS file for components, slim page CSS
`style/components.css` contains sidebar, page header, buttons, chips, table, side panel, dialog,
toast, week grid. Page CSS files only keep page-specific layout. Styles use classes, not inline
styles; inline styles are only used for computed values (grid position, subject color).

### 4. Small building blocks, explicit pages
Shared modules in `src/ts/components/`:

| Module | Purpose |
|---|---|
| `appShell.ts` | sidebar, collapse, theme switch, running dot |
| `pageHeader.ts` | kicker, title, action buttons |
| `toast.ts` | `showToast(text)` |
| `confirmDialog.ts` | `askConfirmation(text, confirmLabel): Promise<boolean>` |
| `sidePanel.ts` | open / close the edit panel, error line |
| `chipSelect.ts` | multi select as toggle chips (room types, subjects) |
| `toggleSwitch.ts` | on/off switch (double period) |
| `weekGrid.ts` | Mo–Fr x periods grid with header row and period column |
| `placeholder.ts` | `showNotAvailable()` toast for placeholder buttons |

Each master data page builds its own table rows and its own form with these blocks.
*Alternative:* one generic CRUD engine configured per entity (as in the dummy). Rejected: shorter, but
much harder to read and to change for a single page.

Existing feature modules are reused where they still fit (`importButton.ts`, `exportButton.ts`,
`colorSelector.ts`, `searchElement.ts`); `roomTypeSelector.ts`, `subjectSelector.ts`,
`availabilitySelector.ts`, `popup.ts` and `selectedItems.ts` are replaced by `chipSelect.ts`,
`weekGrid.ts` and `sidePanel.ts` and deleted when no page uses them anymore.

### 5. Code style (applies to all new and touched code)
- Named handler functions, no inline arrow functions as event handlers. When a handler needs a row
  object, it is a named function declared inside the function that builds the row.
- `if / else` instead of `? :` and `&&` for choosing values or elements.
- Step-by-step loops instead of chained `filter().map().join()`.
- No emojis, also not as icons; icons are Tabler classes (`ti ti-…`).
- `async/await` instead of `.then()` chains.
- German UI texts, English identifiers and comments, like today.

### 6. API additions in the frontend only
`teacherApi.ts`, `roomApi.ts`, `subjectApi.ts` get `deleteX(id)` for the existing
`DELETE /api/<x>/delete/{id}`; `apiHelpers.ts` gets `deleteRequest(path)`. `classSubjectApi.ts`
gets `createClassSubject` for `POST /api/classSubjects` with the body
`{ subject: {id}, teachers: [{id}], schoolClass: {id}, weeklyHours, requiresDoublePeriod, isBetterDoublePeriod }`.
A new `algorithmApi.ts` bundles the algorithm REST calls.

### 7. Availability saved through the teacher update
The Verfügbarkeit page changes `teacherNonWorkingHours` / `teacherNonPreferredHours` of the selected
teacher and sends the whole teacher with `updateTeacher` right after each click. The Lehrer form sends
the teacher's current slots unchanged. The grid uses the same period list as the timetable
(1. to 10. EH, `schoolHour` 1 to 10), defined once in `utils/periods.ts`.
This also removes the current shift between the availability grid (which started at 0. EH but stored
it as `schoolHour` 1) and the timetable.

### 8. Optimization flow on its own page
`optimization.ts` opens the WebSocket once. On load it asks `isAlgorithmRunning` and
`isAlgorithmRunningAtLeastOnce` to restore the status. There is one view (the former
"Fortgeschritten"); the Standard mode with its one-click automatic run was dropped, because the user
always wants to decide when a run ends.

```
[Start] idle   -> run/algorithmAllClasses     -> Läuft
[Pause]        -> socket "pause"              -> Pausiert
[Start] paused -> socket "resume"             -> Läuft
[Stopp]        -> stopAlgorithmAllClasses     -> Beendet
slider input   -> socket "temperature:<value>"
```

The automatic mode can only be toggled, not read (`isAutomaticMode` returns nothing). The backend
starts with it off. Earlier builds of this page could switch it on and remembered that in
`localStorage` (`leoplaner-automatic-mode`). On load the page therefore toggles it off once if that
key says `true`, then removes the key and the mode key (`leoplaner-optimization-mode`). The page
never switches it on.
The cost graph stays on echarts (already in use, handles live data); its colors are read from the
CSS tokens so it follows the theme.

### 9. Timetable page reuses the existing endpoints
`timetable.ts` keeps `getByClass/getByTeacher/getByRoom` and draws lessons into `weekGrid` with the
subject color as background and `duration` as row span. The randomize button and the "Optimieren"
button are removed from the header; only "Excel-Export" stays. The banner "Optimierung läuft" with
its link stays, because it only informs. The first class stays the default selection (existing
requirement).

### 9b. Cost graph like the former `graph.ts`
The first version of the new graph was plain (no zoom, default tooltip). The options of the former
`graph.ts` come back, with theme colors instead of the old indigo palette:

| Part | Setting |
|---|---|
| Zoom | `dataZoom` of type `inside` (mouse wheel / drag) and `slider` (bar with two handles below the graph) |
| Reset | button "Zoom zurücksetzen" in the card header, dispatches `dataZoom` with `start: 0, end: 100` |
| Tooltip | own formatter "Iteration: <b>n</b>" / "Kosten: <b>n</b>" (`toLocaleString("de-AT")`), background `--sf`, border `--ln`, text `--ink` |
| Line | width 3 (scaled with the root size), vertical gradient from `--chart-high` (orange, top) to `--ac` (bottom); the y axis is logarithmic, so height equals the order of magnitude of the cost |
| Area | vertical gradient from `--ac` at 20% opacity to transparent |
| Minimum | `markPoint` of type `min`, label "Min: {c}", set after 500 ms without progress, cleared on a new start |
| Axes | y axis named "Kosten", x axis "Iterationen", both logarithmic with the k / M labels |

The former `visualMap` (fixed 5 000 to 5 000 000, linear) is replaced by the vertical gradient: a
linear color scale put almost every point below the first big drop at the low end, and with
`sampling: "lttb"` an extra color dimension was dropped. echarts cannot interpolate `oklch`, so the
two gradient colors are converted to rgb through a 1x1 canvas (`withAlpha`). The new token
`--chart-high` (light and dark value) is used because `--warn` looks brown in the light design.
Axis labels use one decimal and the German format ("900,1M", "46,5k"). All colors are read from the
CSS tokens when the chart is built, so the theme switch rebuilds it as today. No title inside the
chart; the card title is enough.

### 9c. Temperature as a vertical thermometer
The backend (`SimulatedAnnealingAlgorithm`) starts at 100, cools down to about 0,1 and accepts any
value sent as `temperature:<n>` without a limit. The old slider was linear from 0 to 1000 and started
at 1000: the range 0 to 10, where a run is decided, was 1 % of its length, and the start value did
not match the backend.

A component `components/temperatureGauge.ts` replaces the `<input type="range">`:

```
  10 000 ┤ ╭─╮
   1 000 ┤ │ │
     100 ┤ │▓│◀━  handle, drag or click on the tube
      10 ┤ │▓│     fill: gradient --ac (bottom) to --chart-high (top)
       1 ┤ │▓│
     0,1 ┤╭┴─┴╮
         ││ ● │    bulb
          ╰───╯
```

- Logarithmic mapping: position `p` (0 at the bottom, 1 at the top) to temperature
  `10^(log10(0.1) + p * (log10(10000) - log10(0.1)))`; every power of ten has the same length.
- Start value 100 (the backend's `INITIAL_TEMPERATURE`), labels in German number format.
- Pointer events with pointer capture for dragging; a click on the tube jumps there. While dragging,
  live values from the socket do not move the handle (same rule as the old slider).
- Keyboard: `role="slider"` with `aria-valuemin/max/now/valuetext`, focusable; ↑/↓ change by a
  tenth of a power of ten, Page Up / Page Down by a whole power of ten, Home / End to the ends.
- Sending: `temperature:<n>` on every change, rounded to at most 3 significant digits.
- Sizes in rem, the tube height follows the card (about the height of the cost graph).
- No backend change.
- The fill uses `linear-gradient(in oklch, …)`, so the middle stays a clear color instead of brown.
- The cost graph card is as tall as the thermometer card next to it; the graph fills it
  (`flex: 1`, chart element `inset: 0`) and a `ResizeObserver` on the chart element calls
  `chart.resize()`, which also covers late font loading and the collapsing sidebar.

### 10. Übersicht without a data check
A pre-optimization check (computed in the browser, with fix links into the master data pages) was
built and then dropped: it blocked runs although the backend does not need consistent data, and it
judged imported data as errors. Removed with it: `features/dataCheck.ts`, `utils/fixLink.ts`,
`flagRow` / `scrollToFlaggedRow` and `.row-flagged`, the URL parameter handling on the Lehrer, Räume
and Klassen pages, `.issue-list` styles, and the block notice on the Optimierung page.

The Übersicht keeps the count tiles and gets, modeled on the former dashboard:

```
┌ Übersicht ─────────────────────────────────────────────────────┐
│ [Lehrer] [Klassen] [Räume] [Fächer] [Klassen-Fächer]           │
│ ┌ Schnellaktionen ───────────────────────────────────────────┐ │
│ │ Stundenplan ansehen · Optimierung · Importieren · Exportieren│
│ │ (Demodaten laden / Daten zurücksetzen behind feature flags)│ │
│ └────────────────────────────────────────────────────────────┘ │
│ ┌ Optimierung ────────────┐  ┌ Stammdaten ──────────────────┐  │
│ │ ● Läuft / Bereit        │  │ Verfügbarkeit: x von y Lehrern│ │
│ │ → zur Optimierung       │  │ Wochenstunden gesamt: n      │  │
│ └─────────────────────────┘  └──────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

Demo data and reset reuse the code of the Import / Export page (moved into a shared feature module,
e.g. `features/adminActions.ts`) so both pages behave the same.

### 11. Fluid sizing for large screens
- `html { font-size: clamp(0.875rem, 0.55rem + 0.35vw, 1.375rem) }`: 14px up to about 1490 CSS px,
  about 15.5px at 1920, 18px at 2560, at most 22px from about 3800 (4K at 100% scaling).
- All sizes in `rem` (former px / 14), media queries in `em` (px / 16). `px` stays only for
  1–2px borders, focus outlines and the 1px nav divider.
- `.page { max-width: 150rem }`: 4K is filled almost completely, only ultrawide screens get a limit.
- One large-screen breakpoint: `min-width: 120em` makes the cost graph `30rem` tall.
- echarts sizes (fonts, grid margins, line width) are scaled by `root font size / 14`; on resize the
  chart is built again when the root size changed.
- The color wheel canvas is drawn at 220 canvas pixels but shown at `10rem`; click positions are
  scaled by `canvas.width / rect.width` (this was already wrong at the old 140px).

### 12. Searchable selection on the Stundenplan page
A native `<select>` cannot be searched (only first-letter jumps), and there are 70 classes,
183 teachers and 91 rooms in real data. A small component `components/searchSelect.ts` replaces the
`<select>` on the Stundenplan page:

```
┌──────────────────────┐        ┌──────────────────────┐
│ 1AHBG              ▾ │ click  │ [ti-search] 5ch_     │  focus in the search field
└──────────────────────┘ ─────▶ ├──────────────────────┤
                                │   5CHIF              │  sorted, filtered while typing
                                │ ▸ 5CHITM             │  ↑/↓ move, Enter picks, Esc closes
                                └──────────────────────┘
```

- API like `createSelect`: options `{ value, label }`, selected value, a change callback, and a
  function to refill the options when the view changes.
- Filtering reuses `matchesSearch` from `dataTable.ts` (case-insensitive, anywhere in the label).
- Options are sorted by label with `localeCompare(…, "de", { numeric: true })`; the default stays the
  first entry from the backend, as the user decided not to change it.
- Closes on Escape, on choosing, and on a click outside (named document handler, removed on close).
- Styles in `components.css`, sizes in rem, list height limited (about 20rem) with its own scroll.
- The Klassen-Fächer page uses it too: for the class filter in the toolbar (replacing the row of
  71 filter buttons) and for class and subject in the "Neu: Zuordnung" form. The teacher field stays a
  plain `<select>`, because it only lists the few teachers of the chosen subject.
- For "Alle Klassen", `setOptions` takes an optional entry that stays first and is not sorted
  (`pinnedOption`). It is still found by the search.
- In the form, picking a subject calls the same refill of the teacher list as the old `change`
  event did.
- The teacher form needs several subjects (153 in real data), so the toggle chips of `chipSelect.ts`
  become a wall of buttons there. `searchSelect.ts` gets a multi mode used only for the teacher
  subjects; rooms and subjects keep `chipSelect` (6 room types):

  ```
  [AM ×] [D ×] [MEDTFI ×]          chosen subjects, short code only
  [ + Fach hinzufügen        ▾ ]   opens the search list
    [ti-search] relig_
    [ti-check] 0RE  · Religion evang. A.B.   a click adds or removes,
               0RI  · Religion Islam         the list stays open
  ```

  The list shows "<Kürzel> · <Name>" so the search finds both; the chips only show the short code.
  The check mark is a Tabler icon. Search, keyboard handling (Enter toggles the active entry) and
  styles are shared with the single mode, and `getSelected()` returns the chosen ids in the same form
  as `chipSelect` did, so the save code of `teachers.ts` stays as it is.
*Alternative:* `<input list>` with `<datalist>`. Rejected: looks different in every browser, does not
follow the theme, and accepts free text that matches no entry.

## Risks / Trade-offs

- [`POST /api/classSubjects` was never used by the frontend; the entity field `isBetterDoublePeriod`
  may be mapped by Jackson as `betterDoublePeriod`] → test the request with real data in the first
  task of that page; if a field is ignored, send both spellings. If creating does not work at all
  without a backend change, the button becomes a placeholder and the user is asked.
- [Automatic mode can only be toggled] → if another browser switched it on, this page cannot see it
  and a run may stop by itself. Accepted: the backend starts with it off and this page never
  switches it on.
- [Runs start without any data check] → inconsistent master data (e.g. a teacher assigned to a
  subject they do not teach) goes straight into the algorithm. Verify with one run on the current
  data that the backend handles it.
- [The WebSocket reconnects on every page load] → only the Optimierung page uses it; other pages use
  one `isAlgorithmRunning` request.
- [Big visual change touches pages of other team members] → done page by page in separate commits;
  each page works on its own after its task group.
- [Delete of a teacher or subject that is still used by class-subjects may fail in the backend] →
  show the backend answer as "Löschen fehlgeschlagen." in a toast; nothing else changes.

## Migration Plan

Work on branch `newFrontendMarc`, page by page. No data migration. Rollback is reverting the branch.
After the last page, remove the Font Awesome script tags and unused CSS and modules.
