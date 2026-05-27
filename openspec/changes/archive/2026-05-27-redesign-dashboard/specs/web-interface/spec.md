# web-interface (delta)

## ADDED Requirements

### Requirement: Dashboard overview layout
The dashboard SHALL present, in order, a header, a stats grid, a quick-actions
block, and a data-management block, using the application's existing layout
shell (sidebar navigation + main content) and the existing `--leo-*` color
palette.

#### Scenario: Header is shown
- WHEN the dashboard loads
- THEN the title "Dashboard" is displayed
- AND the static subtitle "Willkommen bei LeoPlaner. Verwalten Sie Ihre
  Schuldaten und erstellen Sie optimierte Stundenpläne." is displayed
- AND no time-of-day greeting or status card is displayed

#### Scenario: Layout is responsive
- WHEN the viewport is at desktop width
- THEN the stats grid shows 4 columns, quick actions 2 columns, and data
  management 4 columns
- WHEN the viewport is below the mobile breakpoint
- THEN each block collapses to a single column

### Requirement: Dashboard statistics
The dashboard SHALL display four stat cards — Lehrer, Klassen, Räume, Fächer —
each showing a count of the corresponding records.

#### Scenario: Counts are loaded
- WHEN the dashboard loads
- THEN the Lehrer, Räume, and Fächer counts are fetched from their existing
  count endpoints
- AND the Klassen count is derived from the length of the list returned by
  `fetchSchoolClasses`

#### Scenario: Count fetch fails
- WHEN a count request fails
- THEN the affected card displays 0
- AND the remaining cards still display their values

### Requirement: Dashboard quick actions
The dashboard SHALL provide three quick actions: Excel importieren, Daten
exportieren, and Stundenplan anzeigen.

#### Scenario: Import action
- WHEN the user activates "Excel importieren"
- THEN the existing import flow (`importButton.ts`) opens a file picker
- AND only `.xlsx` and `.xls` files are accepted

#### Scenario: Export action
- WHEN the user activates "Daten exportieren"
- THEN the existing export flow (`exportButton.ts`) downloads an `.xlsx` file
  named `leoplaner-export-<date>.xlsx`

#### Scenario: Timetable action
- WHEN the user activates "Stundenplan anzeigen"
- THEN the browser navigates to `timetable.html`

### Requirement: Dashboard data-management links
The dashboard SHALL provide four navigation cards linking to the management
pages for Lehrer, Klassen, Räume, and Fächer.

#### Scenario: Links resolve
- WHEN the user activates a data-management card
- THEN the browser navigates to the matching page: `teacher.html`,
  `classSubjects.html`, `rooms.html`, or `subjects.html`
