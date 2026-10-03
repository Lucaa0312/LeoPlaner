# Proposal

## Why

The web frontend grew page by page: each page has its own layout, the colors (indigo palette), fonts and
icon sets (Font Awesome kit plus Tabler) are mixed, and the algorithm controls are hidden inside the
timetable page. The click dummy `LeoPlanerKlickDummy.html` defines a consistent, clearer interface
(NFR-01 to NFR-03), and the frontend should now follow it before the project continues.

## What Changes

- New shared app shell for every page: collapsible sidebar with the groups Planung (Übersicht,
  Stundenplan, Optimierung), Stammdaten (Lehrer, Klassen, Räume, Fächer, Klassen-Fächer,
  Verfügbarkeit) and Daten (Import / Export), a page header (kicker line + title + actions), a toast,
  and a light/dark design switch. No login and no logout.
- New design tokens taken from the click dummy (green accent, light and dark values), fonts Hanken
  Grotesk and IBM Plex Mono, Tabler Icons in a fixed version. **BREAKING** (visual): the `--leo-*`
  indigo palette and the Font Awesome kit are removed.
- Master data pages (Lehrer, Räume, Fächer, Klassen, Klassen-Fächer) become a searchable table with
  an edit side panel instead of cards and modals. Deleting asks for confirmation first, then shows a
  toast. Subject colors stay (color picker on Fächer, colored cells in the timetable).
- Klassen: create, edit and delete are placeholder buttons (toast "noch nicht verfügbar"), because the
  backend only offers reading classes.
- Klassen-Fächer: create works; edit and delete are placeholder buttons, because the backend offers no
  update or delete.
- Teacher availability moves out of the teacher wizard onto its own page "Verfügbarkeit" (click a
  period to cycle verfügbar / möchte nicht / kann nicht).
- The dashboard becomes "Übersicht": record counts, quick actions like the former dashboard
  (Stundenplan, Optimierung, Import, Export, demo data / reset behind the feature flags), the
  optimization status and a short master data summary. No "Letzter Lauf" card and no check that
  judges the data or blocks the optimization.
- New page "Import / Export" with the existing multi-file import, the existing master data export,
  and the existing "Demodaten laden" / "Daten zurücksetzen" actions. No per class/teacher/room export.
- `timetable.html` is split: "Stundenplan" (view per Klasse / Lehrer / Raum, no optimize button,
  only a banner while a run is active) and a new "Optimierung" page with one view: Start / Pause /
  Stopp, cost graph, temperature slider. The algorithm always runs until the user stops it. No key
  figures (best cost, hard conflicts, moved lessons) and no further sliders.
- Responsive sizing for large screens (2K / 4K): one fluid root font size, all sizes in relative
  units, `px` only for hairline borders and focus outlines.
- The old landing page `index.html` forwards to the Übersicht.
- **No backend changes.** Everything uses the existing REST endpoints and the WebSocket.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `web-interface`: dashboard requirements are replaced by the Übersicht and Import / Export pages;
  new requirements for the app shell, theme, master data pages, availability page, timetable page,
  optimization page and the layout on large screens.

## Impact

- Code: everything under `web/` (`pages/*.html`, `src/ts/**`, `style/*.css`), plus `index.html` in the
  repository root. New pages `optimization.html`, `availability.html`, `importExport.html`,
  `classes.html`. The unused legacy folder `web/javascript/` is not touched.
- APIs: none changed. The frontend additionally calls the existing `DELETE /api/{teachers,subjects,rooms}/delete/{id}`
  and `POST /api/classSubjects`.
- Dependencies: Font Awesome kit removed; Tabler Icons pinned to 3.19.0; Google Fonts for Hanken
  Grotesk and IBM Plex Mono; echarts stays for the cost graph.
- Team: pages written by other team members (graph, timetable, dashboard) are rewritten in the new
  style.
