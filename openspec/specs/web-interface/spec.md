# web-interface Specification

## Purpose
The browser frontend of LeoPlaner: how users see the school data, run the optimisation and follow its
progress, and get to the resulting timetables, without the pages ever changing data on their own.

## Requirements

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
The dashboard SHALL provide three quick actions: Daten importieren, Daten
exportieren, and Stundenplan anzeigen. In addition, the dashboard SHALL
provide the actions "Demodaten laden" and "Daten zurücksetzen", each shown
only when the backend reports the corresponding feature as enabled via
`GET /api/admin/features`.

#### Scenario: Import action
- WHEN the user activates "Daten importieren"
- THEN the import flow (`importButton.ts`) opens a file picker that allows selecting several files
- AND `.xlsx`, `.xls`, `.txt`, `.sql` and `.json` files are accepted
- AND the files are sent together to `POST /api/import`
- AND the result shows, per file, what it was recognized as, followed by the import counts or the
  German error message from the backend

#### Scenario: Export action
- WHEN the user activates "Daten exportieren"
- THEN the existing export flow (`exportButton.ts`) downloads an `.xlsx` file
  named `leoplaner-export-<date>.xlsx`

#### Scenario: Timetable action
- WHEN the user activates "Stundenplan anzeigen"
- THEN the browser navigates to `timetable.html`

#### Scenario: Admin actions hidden when disabled
- WHEN the dashboard loads and the backend reports `resetEnabled: false` and `demoDataEnabled: false`, or the feature request fails
- THEN neither "Demodaten laden" nor "Daten zurücksetzen" is displayed

#### Scenario: Load demo data
- WHEN `demoDataEnabled` is true and the user activates "Demodaten laden"
- THEN the frontend sends `POST /api/admin/demo-data`
- AND on success the stat cards are refreshed
- AND on HTTP 409 a message explains that data already exists and must be reset first

#### Scenario: Reset data with confirmation
- WHEN `resetEnabled` is true and the user activates "Daten zurücksetzen"
- THEN a confirmation dialog is shown stating that all data will be deleted
- AND only after confirming, the frontend sends `DELETE /api/admin/data`
- AND on success the stat cards show 0

### Requirement: Dashboard data-management links
The dashboard SHALL provide four navigation cards linking to the management
pages for Lehrer, Klassen, Räume, and Fächer.

#### Scenario: Links resolve
- WHEN the user activates a data-management card
- THEN the browser navigates to the matching page: `teacher.html`,
  `classSubjects.html`, `rooms.html`, or `subjects.html`

### Requirement: Timetable page picks an existing class
The timetable page SHALL display the first class returned by the backend instead of a fixed class
id, and SHALL show an empty timetable rather than an error when no class or no timetable exists.

#### Scenario: Class ids changed after a reset
- **WHEN** the timetable page is opened after data was reset and imported, so that no class has id 1
- **THEN** the timetable of the first available class is displayed

#### Scenario: No data at all
- **WHEN** the timetable page is opened with an empty database
- **THEN** the empty grid is shown and no error appears in the browser console

### Requirement: Landing page does not modify data
Opening the landing page SHALL NOT create, modify, or delete any data.

#### Scenario: Repeated visits
- WHEN the landing page is opened several times
- THEN the teacher, room, subject and class counts are unchanged

### Requirement: Optimisation progress survives reload and navigation
The optimisation page SHALL take the run status, round number, progress bar, time left and the
"Fertig" state only from the server's run state. Nothing about the run may be kept only in the
browser. On load the page SHALL read the current run state and show it before the first live update
arrives. The page SHALL then follow the live updates.

#### Scenario: Reload during a run
- **WHEN** the user reloads the optimisation page while a run is at 60 % in round 2
- **THEN** the progress bar shows about 60 % and the round 2 label right after loading, not 0 %
- **AND** the run continues and is not stopped by the reload

#### Scenario: Leave and come back
- **WHEN** the user goes from the optimisation page to Ergebnis during a run and returns later
- **THEN** the run has continued meanwhile, and the page shows its current progress, or "Fertig" if it has finished

#### Scenario: Second device
- **WHEN** a run is started on one computer and the optimisation page is opened on another
- **THEN** both show the same status, round and progress

#### Scenario: Finished run after reload
- **WHEN** a run has finished and the page is reloaded, in any browser
- **THEN** the page shows "Fertig" with a full bar and the finish reason

#### Scenario: Connection lost
- **WHEN** the WebSocket connection drops during a run and is re-established
- **THEN** the page re-reads the run state and continues showing the correct progress, without starting from 0

### Requirement: Link from the optimisation page to the result
The optimisation page header SHALL always contain an "Ergebnis ansehen" button that leads to the
Ergebnis page. While a run is in progress, the button SHALL read "Zwischenstand ansehen". When no
plan exists yet (no data, or no run so far), the button SHALL be shown but disabled, with a hint
saying why.

#### Scenario: After a run
- **WHEN** a run is paused or finished and the user clicks "Ergebnis ansehen" in the header
- **THEN** the Ergebnis page opens

#### Scenario: During a run
- **WHEN** a run is in progress
- **THEN** the header button reads "Zwischenstand ansehen", leads to the Ergebnis page, and the run continues

#### Scenario: No plan yet
- **WHEN** no run has been started yet
- **THEN** the header button is visible but disabled
