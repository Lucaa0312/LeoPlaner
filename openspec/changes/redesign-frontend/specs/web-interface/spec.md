# Spec Delta

## ADDED Requirements

### Requirement: App shell navigation
Every application page SHALL show the same sidebar with the logo "LeoPlaner" and three groups:
Planung (Übersicht, Stundenplan, Optimierung), Stammdaten (Lehrer, Klassen, Räume, Fächer,
Klassen-Fächer, Verfügbarkeit) and Daten (Import / Export). The entry of the current page SHALL be
highlighted. The sidebar SHALL NOT contain login, logout, account or help entries.

#### Scenario: Navigate between pages
- **WHEN** the user activates a sidebar entry
- **THEN** the browser opens the matching page
- **AND** that entry is highlighted on the new page

#### Scenario: No account entries
- **WHEN** any application page is shown
- **THEN** no login, logout or account element is visible

### Requirement: Collapsible sidebar
The sidebar SHALL be collapsible to an icon-only width and expandable again. The chosen state SHALL be
remembered in the browser and restored on every page.

#### Scenario: Collapse and change page
- **WHEN** the user collapses the sidebar and then opens another page
- **THEN** the sidebar is still collapsed and shows only icons with the entry name as tooltip

### Requirement: Light and dark design
The interface SHALL offer a light and a dark design, switchable from the sidebar. The light design
SHALL be the default. The choice SHALL be remembered in the browser and applied on every page before
content is shown.

#### Scenario: Switch to dark
- **WHEN** the user activates "Dunkles Design"
- **THEN** all colors switch to the dark values
- **AND** the button now reads "Helles Design"
- **AND** after reloading or opening another page the dark design is still active

### Requirement: Page header
Every application page SHALL start with a header containing a small context line (kicker), the page
title, and the page's main actions aligned to the right.

#### Scenario: Header on a master data page
- **WHEN** the Räume page is shown
- **THEN** the kicker reads "Stammdaten · <n> Einträge", the title reads "Räume"
- **AND** the button "Neu: Raum" is shown on the right

### Requirement: Toast messages
The interface SHALL confirm completed actions with a short message in the lower right corner that
disappears by itself after about four seconds. Toasts SHALL NOT offer an undo action.

#### Scenario: Confirmation after saving
- **WHEN** a record was saved successfully
- **THEN** a toast "<Typ> gespeichert" appears and disappears after about four seconds

### Requirement: Master data table
The pages Lehrer, Klassen, Räume, Fächer and Klassen-Fächer SHALL list their records in a table with
a search field. Searching SHALL filter the rows by their visible text while typing. Each row SHALL
offer an edit and a delete button. An empty result SHALL show "Keine Einträge gefunden."

#### Scenario: Search
- **WHEN** the user types "edv" into the search field on the Räume page
- **THEN** only rooms whose number, name, short name or room types contain "edv" are listed

#### Scenario: No match
- **WHEN** the search matches no record
- **THEN** the table shows "Keine Einträge gefunden."

### Requirement: Edit side panel
Creating and editing a record SHALL happen in a panel next to the table, not in a modal. The panel
SHALL show the title "Neuer <Typ>" or "<Typ> bearbeiten", labeled fields, a "Speichern" and an
"Abbrechen" button. Missing required values SHALL show a German error message in the panel and
SHALL NOT send a request.

#### Scenario: Create a room
- **WHEN** the user activates "Neu: Raum", fills in all required fields and activates "Speichern"
- **THEN** the room is sent to the backend, the panel closes, the table is reloaded
- **AND** the toast "Raum gespeichert" appears

#### Scenario: Required field missing
- **WHEN** the user activates "Speichern" with an empty name
- **THEN** the panel shows an error message and no request is sent

#### Scenario: Backend error
- **WHEN** the backend answers a save request with an error
- **THEN** the panel stays open and shows "Speichern fehlgeschlagen."

### Requirement: Delete with confirmation
Deleting a teacher, room or subject SHALL first open a confirmation dialog naming the record and
stating that this cannot be undone. Only after "Löschen" is confirmed SHALL the delete request be
sent; afterwards the table is reloaded and the toast "<Typ> gelöscht" appears.

#### Scenario: Cancel
- **WHEN** the user activates delete and then "Abbrechen"
- **THEN** no request is sent and the record stays in the table

#### Scenario: Confirm
- **WHEN** the user activates delete and then "Löschen"
- **THEN** the record is deleted in the backend and no longer listed

### Requirement: Teachers page
The Lehrer page SHALL list name, short code, teaching subjects (as chips) and weekly hours from the
class-subjects. The form SHALL contain name, short code and teaching subjects, and SHALL keep the
teacher's existing availability unchanged when saving. The teaching subjects SHALL be a searchable
multi select: the chosen subjects are shown as chips with their short code and a remove button, and
"+ Fach hinzufügen" opens a searchable list of all subjects showing "<Kürzel> · <Name>", where chosen
subjects are marked and a click adds or removes a subject. The list SHALL stay open while choosing
until Escape or a click outside.

#### Scenario: Edit keeps availability
- **WHEN** a teacher with "kann nicht" slots is edited and saved
- **THEN** the saved teacher still has the same "kann nicht" and "möchte nicht" slots

#### Scenario: Add subjects by search
- **WHEN** the user opens "+ Fach hinzufügen", types "relig" and clicks two of the listed subjects
- **THEN** both subjects are marked in the list and appear as chips above it
- **AND** the list is still open

#### Scenario: Search by name
- **WHEN** the user types part of a subject's full name, e.g. "Islam"
- **THEN** the subject with that name is listed, although its short code does not contain the text

#### Scenario: Remove a subject
- **WHEN** the user activates the remove button of a subject chip and saves
- **THEN** the teacher no longer teaches that subject

### Requirement: Rooms page
The Räume page SHALL list number, name, short code and room types (as chips). The form SHALL contain
number, name, short code and room types (multi select, at least one type required).

#### Scenario: Room without type
- **WHEN** the user tries to save a room without any room type
- **THEN** the panel shows "Ein Raum braucht mindestens einen Raumtyp." and nothing is sent

### Requirement: Subjects page with colors
The Fächer page SHALL list short code, name, required room types and the teachers teaching the
subject, together with the subject color. The form SHALL contain name, short code, required room
types (empty means any room) and the subject color.

#### Scenario: Change color
- **WHEN** the user picks a new color for a subject and saves
- **THEN** the new color is stored and used for this subject in the timetable

### Requirement: Classes page placeholders
The Klassen page SHALL list name, home room, number of subjects and weekly hours of every class.
Because the backend cannot change classes, the buttons "Neu: Klasse", edit and delete SHALL be shown
but SHALL only display the toast "Diese Funktion ist noch nicht verfügbar." without any request.

#### Scenario: Placeholder action
- **WHEN** the user activates delete on a class
- **THEN** the toast "Diese Funktion ist noch nicht verfügbar." appears
- **AND** no request is sent and the class stays listed

### Requirement: Class-subjects page
The Klassen-Fächer page SHALL list class, subject, teacher, weekly hours and double period
("Pflicht", "bevorzugt" or "–"), filterable by class. The class filter SHALL be a searchable
selection list (as on the Stundenplan page) with "Alle Klassen" always as its first entry and as the
default. Creating SHALL work with class, subject, teacher (only teachers of that subject), weekly
hours greater than 0, "Doppelstunde (hart)" and "Besser als Doppelstunde (weich)"; class and subject
SHALL be chosen with searchable selection lists. Edit and delete SHALL be placeholders like on the
Klassen page.

#### Scenario: Filter by class
- **WHEN** the user opens the class filter, types "3ahif" and picks 3AHIF
- **THEN** only class-subjects of 3AHIF are listed

#### Scenario: All classes
- **WHEN** the user picks "Alle Klassen" in the class filter
- **THEN** the class-subjects of every class are listed

#### Scenario: Filter preselects the form
- **WHEN** the class filter is set to 3AHIF and the user activates "Neu: Zuordnung"
- **THEN** 3AHIF is already selected as class in the form

#### Scenario: Search a subject in the form
- **WHEN** the user opens the subject selection in the form and types part of a subject's short name
- **THEN** only matching subjects are listed
- **AND** after picking one, the teacher selection only offers teachers of that subject

#### Scenario: Teacher choice follows subject
- **WHEN** the user picks a subject in the form
- **THEN** the teacher selection only offers teachers who teach that subject

#### Scenario: Placeholder edit
- **WHEN** the user activates edit on a class-subject
- **THEN** the toast "Diese Funktion ist noch nicht verfügbar." appears and nothing is sent

### Requirement: Availability page
The Verfügbarkeit page SHALL list all teachers with a short summary of their blocked slots and show a
weekly grid for the selected teacher. Clicking a period SHALL cycle verfügbar, möchte nicht (soft),
kann nicht (hard) and save the teacher right away. "Alle zurücksetzen" SHALL clear both lists.

#### Scenario: Mark a period as kann nicht
- **WHEN** the user clicks a free period twice
- **THEN** the period shows "kann nicht" and the teacher is saved with this non-working slot

#### Scenario: Summary
- **WHEN** a teacher has two "kann nicht" and one "möchte nicht" slot
- **THEN** the list shows "2 kann nicht · 1 möchte nicht" for that teacher

### Requirement: Overview counts
The Übersicht page SHALL show tiles with the number of Lehrer, Klassen, Räume, Fächer and
Klassen-Fächer. Activating a tile SHALL open the matching page. A count that cannot be loaded SHALL
show 0 while the other tiles still show their values.

#### Scenario: Count fails
- **WHEN** loading the rooms fails
- **THEN** the Räume tile shows 0 and the other tiles show their counts

### Requirement: Overview quick actions
The Übersicht page SHALL offer quick actions in the style of the former dashboard: "Stundenplan
ansehen", "Optimierung", "Importieren" and "Exportieren". Import and export SHALL open the
Import / Export page. "Demodaten laden" and "Daten zurücksetzen" SHALL be offered under the same
feature-flag rules and with the same confirmation as on the Import / Export page.

#### Scenario: Open the timetable
- **WHEN** the user activates "Stundenplan ansehen"
- **THEN** the Stundenplan page opens

#### Scenario: Admin actions hidden when disabled
- **WHEN** `GET /api/admin/features` reports both flags false or fails
- **THEN** neither "Demodaten laden" nor "Daten zurücksetzen" is shown on the Übersicht

### Requirement: Overview status
The Übersicht page SHALL show the optimization status ("Läuft" or "Bereit", from
`isAlgorithmRunning`) with a link to the Optimierung page, and a master data summary with the number
of teachers that have availability entered ("Verfügbarkeit für <x> von <y> Lehrern") and the total
weekly hours of all class-subjects. The Übersicht SHALL NOT judge the data as errors and SHALL NOT
block the optimization.

#### Scenario: Algorithm running
- **WHEN** the Übersicht is opened while the algorithm is running
- **THEN** the status shows "Läuft" and links to the Optimierung page

#### Scenario: Summary
- **WHEN** 18 of 20 teachers have availability entries
- **THEN** the summary reads "Verfügbarkeit für 18 von 20 Lehrern"

### Requirement: Import and export page
The Import / Export page SHALL offer the existing import (several files, `.xlsx`, `.xls`, `.txt`,
`.sql`, `.json`, sent together to `POST /api/import`, result per file) and the existing master data
export (`leoplaner-export-<date>.xlsx`). It SHALL also offer "Demodaten laden" and "Daten
zurücksetzen" under the same feature-flag rules as before. There SHALL be no per class, teacher or
room export.

#### Scenario: Import result
- **WHEN** the user selects files and the import finishes
- **THEN** the page lists each file with what it was recognized as, followed by the counts or the
  German error message from the backend

#### Scenario: Export
- **WHEN** the user activates "Herunterladen" for Stammdaten
- **THEN** an `.xlsx` file named `leoplaner-export-<date>.xlsx` is downloaded

#### Scenario: Admin actions hidden when disabled
- **WHEN** `GET /api/admin/features` reports both flags false or fails
- **THEN** neither "Demodaten laden" nor "Daten zurücksetzen" is shown

#### Scenario: Reset with confirmation
- **WHEN** `resetEnabled` is true and the user activates "Daten zurücksetzen"
- **THEN** a confirmation dialog states that all data will be deleted
- **AND** only after confirming, `DELETE /api/admin/data` is sent

#### Scenario: Demo data already present
- **WHEN** "Demodaten laden" answers HTTP 409
- **THEN** a message explains that data already exists and must be reset first

### Requirement: Timetable views
The Stundenplan page SHALL show a weekly grid (Montag to Freitag, numbered periods with times) for a
selected Klasse, Lehrer or Raum, chosen by a view switch and a selection list. Lessons SHALL be
colored with their subject color and span double periods. The header SHALL offer "Excel-Export".
The page SHALL NOT offer a button to start or open the optimization; the running banner is the only
link to the Optimierung page.

#### Scenario: Switch to teacher view
- **WHEN** the user selects the view "Lehrer" and a teacher
- **THEN** the grid shows that teacher's lessons with class and room as second line

#### Scenario: Optimization running
- **WHEN** the page is opened while the algorithm is running
- **THEN** a banner "Optimierung läuft" with a link to the Optimierung page is shown

### Requirement: Searchable timetable selection
The selection list of the Stundenplan page SHALL be searchable in all three views (Klasse, Lehrer,
Raum). Opening it SHALL show a search field with the focus in it and the entries sorted
alphabetically. Typing SHALL filter the entries by their visible text, ignoring case and matching
anywhere in the text. The entries SHALL be selectable with mouse and with the arrow keys and Enter;
Escape SHALL close the list without changing the selection. The default selection SHALL stay as
before (the first class returned by the backend).

#### Scenario: Search a class
- **WHEN** the user opens the class selection and types "chitm"
- **THEN** only classes whose name contains "CHITM" are listed
- **AND** choosing one shows its timetable

#### Scenario: Search a teacher by name
- **WHEN** the view is "Lehrer" and the user types part of a teacher's name or short name
- **THEN** that teacher is listed

#### Scenario: Close without choosing
- **WHEN** the user opens the list, types a search and presses Escape
- **THEN** the list closes and the previously selected timetable stays visible

#### Scenario: Nothing found
- **WHEN** no entry matches the search
- **THEN** the list shows "Keine Treffer"

### Requirement: Optimization page
The Optimierung page SHALL show a single view without a mode switch: Start, Pause and Stopp with a
status ("Bereit", "Läuft", "Pausiert", "Beendet"), a live graph of the cost over the iterations, and
one temperature control that is sent to the running algorithm. The temperature control SHALL be a
vertical thermometer with a logarithmic scale from 0,1 to 10 000, operable by mouse, by click on the
tube and by keyboard. The graph SHALL be zoomable
(zoom bar and mouse wheel, plus a "Zoom zurücksetzen" button), color the line by cost (high cost
orange, low cost in the accent color), and mark the minimum cost. The algorithm SHALL run until
the user stops it; the page SHALL keep the backend's automatic mode off. No other parameter sliders
and no key figures such as best cost, hard conflicts or moved lessons SHALL be shown. The start
SHALL NOT be blocked by checks of the master data.

#### Scenario: Start
- **WHEN** the user activates Start while the status is "Bereit"
- **THEN** the algorithm starts, the status shows "Läuft" and the graph is filled live

#### Scenario: Pause and resume
- **WHEN** the user activates Pause during a run and then Start
- **THEN** the status shows "Pausiert" and then "Läuft" again, and the graph continues

#### Scenario: Change temperature
- **WHEN** the user drags the thermometer or uses the arrow keys on it
- **THEN** the new temperature is sent to the algorithm

#### Scenario: Thermometer scale
- **WHEN** the Optimierung page is shown
- **THEN** the temperature is shown as a vertical thermometer with a logarithmic scale from 0,1 to
  10 000 (each power of ten equally long), a fill colored from the accent color (cool) to orange (hot),
  and the current value as a number
- **AND** before any run it shows the backend's start temperature 100

#### Scenario: Live temperature
- **WHEN** the algorithm is running and the user is not dragging the thermometer
- **THEN** the fill follows the temperature reported by the algorithm

#### Scenario: Stop
- **WHEN** the user activates Stopp
- **THEN** the algorithm is stopped and the status shows "Beendet"

#### Scenario: Zoom into the cost graph
- **WHEN** the user drags the handles of the zoom bar below the graph or scrolls the mouse wheel inside it
- **THEN** the graph shows only the chosen range of iterations
- **AND** "Zoom zurücksetzen" in the card header shows the whole range again

#### Scenario: Read a point
- **WHEN** the user moves the pointer over the graph
- **THEN** a tooltip shows "Iteration: <n>" and "Kosten: <n>" in colors that are readable in the light
  and the dark design

#### Scenario: Minimum after a pause
- **WHEN** no new progress arrives for about half a second (pause, stop or end of a run)
- **THEN** the lowest cost is marked with a point labeled "Min: <Kosten>"

#### Scenario: Automatic mode left on
- **WHEN** the browser remembers that the automatic mode was switched on earlier
- **THEN** the page switches it off once on load, so a run does not stop by itself

### Requirement: Layout on large screens
The interface SHALL scale its text and spacing with the viewport width between a lower limit (the
size at 1280 CSS pixels) and an upper limit, and SHALL use the available width on large screens up
to a maximum content width. Style sizes SHALL be given in relative units (`rem`, `em`, `%`, `fr`,
viewport units); `px` SHALL only be used for hairline borders and focus outlines.

#### Scenario: 1280 pixels wide
- **WHEN** a page is shown at 1280 CSS pixels width
- **THEN** the base text size is 14px

#### Scenario: 2560 pixels wide
- **WHEN** a page is shown at 2560 CSS pixels width
- **THEN** text and controls are larger than at 1280 pixels
- **AND** the content uses the width next to the sidebar without a large empty area on the right

#### Scenario: 3840 pixels wide
- **WHEN** a page is shown at 3840 CSS pixels width
- **THEN** the text size stays at the upper limit and no element overflows horizontally

### Requirement: Running indicator in the navigation
While the algorithm is running, the sidebar entry "Optimierung" SHALL show a small status dot on
every page.

#### Scenario: Dot while running
- **WHEN** any page is opened while the backend reports the algorithm as running
- **THEN** the "Optimierung" entry shows the dot

## REMOVED Requirements

### Requirement: Dashboard overview layout
**Reason**: The dashboard is replaced by the Übersicht page in the new app shell with the new design
tokens instead of the `--leo-*` palette.
**Migration**: See "Overview counts", "Overview quick actions", "Overview status" and "App shell navigation".

### Requirement: Dashboard statistics
**Reason**: Replaced by the count tiles of the Übersicht, which add Klassen-Fächer.
**Migration**: See "Overview counts".

### Requirement: Dashboard quick actions
**Reason**: Replaced by the quick actions of the Übersicht in the new design; import and export
themselves live on the Import / Export page.
**Migration**: See "Overview quick actions" and "Import and export page".

### Requirement: Dashboard data-management links
**Reason**: The master data pages are reached via the sidebar and the count tiles.
**Migration**: See "App shell navigation" and "Overview counts".
