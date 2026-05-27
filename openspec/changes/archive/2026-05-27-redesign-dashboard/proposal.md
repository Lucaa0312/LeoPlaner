# Redesign Dashboard

## Why

The current dashboard is a thin status page: a time-of-day greeting, a status
card image, and three auto-generated stat cards with an inline Excel import. It
does not give an at-a-glance overview of the school data nor quick navigation
into the main areas of LeoPlaner.

`Dashboard.md` documents a richer target design — header, a four-card stats
grid, a quick-actions block, and a data-management link block. That document was
written against a React + Tailwind + lucide stack the project does **not** use.
This change **translates** that design intent into the project's actual stack
(vanilla TypeScript building DOM nodes, hand-written CSS using the existing
`--leo-*` variables, multi-page HTML with `<a>` navigation) rather than
migrating frameworks.

## What Changes

- Rebuild `dashboard.html`, `dashboard.ts`, and `dashboard.css` into four
  sections: **Header**, **Stats grid (4)**, **Quick actions (3)**, **Data
  management (4)**.
- **Header**: static title "Dashboard" + static subtitle "Willkommen bei
  LeoPlaner. Verwalten Sie Ihre Schuldaten und erstellen Sie optimierte
  Stundenpläne." Drops the time-of-day greeting and the status card.
- **Stats (4)**: Lehrer, Klassen, Räume, Fächer. Reuse existing count endpoints
  for teachers/subjects/rooms; derive Klassen from `fetchSchoolClasses().length`
  (no count endpoint added).
- **Quick actions (3)**: Excel importieren (reuse `importButton.ts`), Daten
  exportieren (reuse `exportButton.ts`), Stundenplan anzeigen (link to
  `timetable.html`). The doc's "Algorithmus starten" action is dropped — the
  algorithm is triggered from the timetable page.
- **Data management (4)**: links to `teacher.html`, `classSubjects.html`,
  `rooms.html`, `subjects.html`.
- Keep the project's existing indigo palette (`--leo-primary-color1 #4F46E5`);
  ignore the doc's blue `#2563eb`.

## Impact

- **Prerequisite**: merge `origin/classSubjectPage` into the working branch
  first. It provides `classSubjects.html`, `exportButton.ts`, the download API,
  `classSubjectApi.ts` (`fetchSchoolClasses`), and `SchoolClassResource`. Klassen
  card, Klassen link, and the export action depend on it.
- Affected files: `web/pages/dashboard.html`, `web/src/ts/pages/dashboard.ts`,
  `web/style/dashboard.css`.
- Reused as-is: `web/src/ts/features/importButton.ts`,
  `web/src/ts/features/exportButton.ts` (from merged branch).
- Removed from dashboard: time-of-day greeting logic, status card image
  (`StatusCard.png`), `showLastUpdateTime`.
- No backend changes. No new dependencies.

## Non-goals

- No framework migration to React/Tailwind/lucide.
- No new export backend or export feature work (reuse existing only).
- No `getClassCount` backend endpoint.
- No "Algorithmus starten" action or `/algorithm` page.
- No future-extension features from the doc (live updates, charts, search, etc.).
