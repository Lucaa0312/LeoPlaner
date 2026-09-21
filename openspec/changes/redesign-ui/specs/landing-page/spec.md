## ADDED Requirements

### Requirement: Hero landing page
`index.html` SHALL present a hero with the LeoPlaner logo, the headline
"Willkommen zum LeoPlaner", the subtitle "Der Weg zum optimalen Stundenplan.",
a primary call-to-action linking to `web/pages/timetable.html` and a secondary
call-to-action linking to `web/pages/dashboard.html`.

#### Scenario: Entry points
- **WHEN** the user activates "Stundenplan öffnen"
- **THEN** the browser navigates to the timetable page
- **WHEN** the user activates "Daten verwalten"
- **THEN** the browser navigates to the dashboard

### Requirement: Animated timetable mosaic
The hero SHALL display a decorative grid of tinted tiles resembling a
timetable whose tiles shift colour/position on a slow CSS keyframe loop. The
animation SHALL be implemented without JavaScript and SHALL be static under
`prefers-reduced-motion: reduce`.

#### Scenario: Reduced motion
- **WHEN** the OS requests reduced motion
- **THEN** the mosaic renders as a static grid

### Requirement: Feature tiles
Below the hero, the page SHALL show three feature tiles — Datenverwaltung,
Eigene Regeln, Optimierung — each with an icon, title and one-sentence
description, arranged in three columns on desktop and one column below 768 px.

#### Scenario: Responsive tiles
- **WHEN** the viewport is 600 px wide
- **THEN** the tiles stack vertically with no horizontal scroll
