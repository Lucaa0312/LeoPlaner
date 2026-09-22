# Spec Delta

## MODIFIED Requirements

### Requirement: Dashboard quick actions
The dashboard SHALL provide three quick actions: Excel importieren, Daten
exportieren, and Stundenplan anzeigen. In addition, the dashboard SHALL
provide the actions "Demodaten laden" and "Daten zurücksetzen", each shown
only when the backend reports the corresponding feature as enabled via
`GET /api/admin/features`.

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

## ADDED Requirements

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
