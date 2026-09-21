## ADDED Requirements

### Requirement: Common page template
The Lehrer, Fächer, Räume and Klassen pages SHALL share one structure: page
header with search input and primary "hinzufügen/erstellen" button, a data
view, an empty state, and a modal for create/edit. Shared styles SHALL live in
`web/style/components.css`; page CSS files SHALL contain only page-specific
rules.

#### Scenario: Search filters
- **WHEN** the user types in the header search field on any of the four pages
- **THEN** the data view filters to matching items as it does today, and the empty state shows a "Keine Treffer" variant when nothing matches

### Requirement: Data views
Lehrer and Klassen SHALL render as tables with a sticky header row, hover
highlight, and a trailing actions cell. Fächer and Räume SHALL render as card
grids (`auto-fill, minmax(16rem, 1fr)`) where subject cards show the subject
colour as a top bar and room cards show the room type as a badge.

#### Scenario: Table header stays visible
- **WHEN** the Lehrer list is scrolled
- **THEN** the column header row remains visible at the top of the main region

#### Scenario: Subject colour shown
- **WHEN** a subject with colour rgb(200, 30, 30) is listed
- **THEN** its card displays a top bar in that colour

### Requirement: Loading skeletons
While the initial fetch of a data page is pending, the data view SHALL show
skeleton rows/cards; they SHALL be replaced by real content or the empty state
once the request settles.

#### Scenario: Slow response
- **WHEN** the teacher list takes 2 s to load
- **THEN** skeleton rows are visible for those 2 s and no empty-state text flashes before data arrives

### Requirement: Illustrated empty states
When a page has no items, the data view SHALL show an empty state with an
inline SVG illustration, an entity-specific headline (e.g. "Noch keine Lehrer"),
a hint sentence and a call-to-action button that opens the create modal.

#### Scenario: CTA opens modal
- **WHEN** the user activates the empty-state button on the Räume page
- **THEN** the "Raum hinzufügen" modal opens

### Requirement: Shared modal behaviour
Create/edit forms SHALL use the shared modal component: a backdrop, a panel
with header (title, optional stepper, close button), scrollable body and
sticky footer with actions. The modal SHALL close on `Esc` and backdrop click,
trap focus while open, and return focus to the opening control on close.
Visibility SHALL be controlled by the `is-open` class, not inline styles.

#### Scenario: Escape closes
- **WHEN** a modal is open and the user presses `Esc`
- **THEN** the modal closes and focus returns to the button that opened it

#### Scenario: Multi-step teacher form
- **WHEN** the teacher modal is open
- **THEN** the header shows a stepper with the current step highlighted and the footer shows Zurück / Weiter / Speichern as appropriate

### Requirement: Existing behaviour preserved
All create, edit, search, import/export and selection flows on the four pages
SHALL continue to call the same API endpoints with the same payloads as before
the redesign.

#### Scenario: Create teacher
- **WHEN** the user completes the teacher form and saves
- **THEN** `createTeacher` is called with the same request shape as before and the list refreshes
