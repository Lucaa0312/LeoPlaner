## ADDED Requirements

### Requirement: Workbench layout
The timetable page SHALL consist of a page header, a timetable canvas and an
optimizer rail. On viewports ≥ 1280 px the canvas and rail sit side by side
(rail `22rem` wide); below 1280 px the rail stacks under the canvas. The
full-screen loader and `#optimizing-text` overlay SHALL be removed.

#### Scenario: Side-by-side layout
- **WHEN** the page is viewed at 1440 px width
- **THEN** the canvas fills the remaining width to the left of a 22rem rail and both are visible without horizontal scrolling

### Requirement: View switcher
The page header SHALL contain a segmented control with the options Klasse,
Lehrer, Raum and a searchable picker listing the entities of the selected
kind. Selecting an entity SHALL load its timetable via the existing
`getTimetableByClass` / `getTimetableByTeacher` / `getTimetableByRoom`
functions.

#### Scenario: Switch to a teacher
- **WHEN** the user selects "Lehrer" and picks a teacher from the picker
- **THEN** the canvas shows that teacher's lessons and the header shows the teacher's name

### Requirement: Timetable canvas
The canvas SHALL be a CSS grid with a time gutter column and one column per
weekday; rows are derived from the `units` list. Lessons SHALL render as cards
spanning `duration` rows via `grid-row: span`, showing subject symbol, room
and teacher symbol, with a left colour stripe in the subject colour and a fill
derived from `color-mix()` so it remains legible in dark mode. The lunch break
SHALL render as a soft horizontal band. Saturday SHALL be shown only if at
least one lesson falls on Saturday.

#### Scenario: Double lesson
- **WHEN** a lesson has `duration: 2`
- **THEN** its card spans exactly two unit rows with no pixel-based height

#### Scenario: Dark mode legibility
- **WHEN** the dark theme is active
- **THEN** lesson text meets 4.5:1 contrast against the card fill

### Requirement: Optimizer rail
The rail SHALL contain, top to bottom: a status chip (Bereit / Optimiert… /
Fertig), the cost chart, the current cost value, an "Erweitert" disclosure
revealing the temperature slider and per-iteration chart, the primary
"Stundenplan optimieren" button, a "Zufällig verteilen" button, an "Excel
exportieren" button, and the hint "Dieser Vorgang kann einige Minuten dauern".

#### Scenario: Optimization running
- **WHEN** optimization is started
- **THEN** the status chip pulses "Optimiert…", the optimise/randomise buttons are disabled, and the chart updates live while the timetable stays visible

#### Scenario: Optimization finished
- **WHEN** the WebSocket reports completion
- **THEN** the status chip shows "Fertig", buttons re-enable, the timetable reloads and a success toast is shown

### Requirement: Chart follows theme
The ECharts cost chart SHALL read its text, axis and line colours from design
tokens at draw time and SHALL be redrawn when the theme changes.

#### Scenario: Theme switch while chart visible
- **WHEN** the user switches to dark mode on the timetable page
- **THEN** the chart's axes and labels update to the dark token colours
