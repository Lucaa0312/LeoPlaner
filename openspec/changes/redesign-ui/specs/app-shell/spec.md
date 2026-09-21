## ADDED Requirements

### Requirement: Grid application shell
Every application page (dashboard, Lehrer, Fächer, Räume, Klassen,
Stundenplan) SHALL use a shared shell: a `<nav id="nav-bar">` sidebar and a
`<main id="main-content">` region laid out with CSS grid at `100dvh`, where
`main` is the only vertical scroll container.

#### Scenario: Long lists scroll
- **WHEN** a data page contains more rows than fit the viewport
- **THEN** the main region scrolls while the sidebar stays fixed

### Requirement: Semantic sidebar navigation
The sidebar SHALL be rendered by `navbar.ts` as `<nav
aria-label="Hauptnavigation">` containing a logo link, a list of `<a>` items
(Startseite, Lehrer, Fächer, Räume, Klassen, Stundenplan, Hilfe) with Tabler
icons, and a footer with the theme toggle and the account chip. The item
matching the current page SHALL carry `aria-current="page"` and be styled via
CSS, not inline styles.

#### Scenario: Active item
- **WHEN** `teacher.html` is open
- **THEN** the "Lehrer" link has `aria-current="page"` and the active style; all others do not

#### Scenario: Keyboard navigation
- **WHEN** the user tabs through the sidebar and presses Enter on "Räume"
- **THEN** the browser navigates to `rooms.html`

### Requirement: Collapsible sidebar
The sidebar SHALL be collapsible to an icon-only rail via a toggle button. The
collapsed state SHALL be persisted in `localStorage` under `leo.sidebar` and
restored on load before first paint. Collapsed items SHALL expose their label
via `title` and visually hidden text.

#### Scenario: Collapse persists
- **WHEN** the user collapses the sidebar and navigates to another page
- **THEN** the sidebar is still collapsed

#### Scenario: Narrow viewport
- **WHEN** the viewport is narrower than 1024 px
- **THEN** the sidebar is hidden and opens as an overlay drawer from a menu button in the page header

### Requirement: Theme toggle
The sidebar footer SHALL contain a theme toggle cycling light → dark → system.
The choice SHALL be stored in `localStorage` under `leo.theme` and applied to
`<html data-theme>` by an inline script in `<head>` to avoid a flash of the
wrong theme.

#### Scenario: Toggle to dark
- **WHEN** the user activates the toggle while in light mode
- **THEN** `data-theme="dark"` is set immediately, persisted, and the next page load renders dark without flashing light

### Requirement: Shared page header
Each page SHALL begin with a `.page-header` containing an `<h1>` title, an
optional subtitle, and a right-aligned actions slot. Data pages place the
search field and primary action there; the timetable places the view switcher
there.

#### Scenario: Header consistency
- **WHEN** the user moves between Lehrer, Räume and Stundenplan
- **THEN** the title, subtitle and actions occupy the same position and size on each page
