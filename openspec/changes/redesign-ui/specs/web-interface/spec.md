## MODIFIED Requirements

### Requirement: Dashboard overview layout
The dashboard SHALL present, in order, a page header, a stats grid, a
quick-actions block, and a data-management block, using the shared application
shell (sidebar navigation + main content) and design-system tokens
(`--color-*`, `--space-*`, `--radius-*`, `--shadow-*`).

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

#### Scenario: Dark theme
- WHEN the dark theme is active
- THEN stat cards, quick actions and data-management cards render on
  `--color-surface-raised` with `--color-text` and remain legible
