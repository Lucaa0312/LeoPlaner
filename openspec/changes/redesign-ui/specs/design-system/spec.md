## ADDED Requirements

### Requirement: Semantic design tokens
The web UI SHALL define all colours, spacing, radii, shadows, typography sizes
and motion durations as CSS custom properties in `web/style/tokens.css`,
organised as primitive tokens and semantic tokens. Component and page styles
SHALL reference only semantic tokens (e.g. `--color-primary`,
`--color-surface`, `--color-text-muted`, `--space-4`, `--radius-md`,
`--shadow-md`, `--dur-base`).

#### Scenario: No raw colours outside tokens
- **WHEN** the stylesheets under `web/style/` other than `tokens.css` are searched for hex, `rgb(` or `hsl(` colour literals
- **THEN** no matches are found, except inside `color-mix()` expressions that combine a token with a runtime subject colour

#### Scenario: Legacy tokens removed
- **WHEN** the codebase is searched for `--leo-primary-color1`, `--leo-primary-color2`, `--leo-secondary-color`, `--leo-background-color` or `--leo-text-color`
- **THEN** no references remain in `web/`

### Requirement: Light and dark themes
The design system SHALL provide a light theme and a dark theme by remapping
semantic tokens. The dark theme SHALL apply when `<html data-theme="dark">` is
set, or when `prefers-color-scheme: dark` matches and no explicit
`data-theme="light"` is set.

#### Scenario: System preference is respected
- **WHEN** the operating system prefers a dark colour scheme and the user has not chosen a theme
- **THEN** every page renders with the dark token set

#### Scenario: Explicit choice overrides system
- **WHEN** `data-theme="light"` is set on `<html>` and the system prefers dark
- **THEN** the light token set is used

### Requirement: Typography scale
The design system SHALL load Inter as the UI font with a `system-ui` fallback
stack, activate the bundled Alte Haas Grotesk via `@font-face` for display
headings, and define a modular type scale `--text-xs` through `--text-4xl`.
Global element resets SHALL NOT force a `font-family` on every element.

#### Scenario: Font failure degrades gracefully
- **WHEN** the Inter web font cannot be downloaded
- **THEN** text renders in the system fallback and layout is unaffected

### Requirement: Rem-based, viewport-independent sizing
Component dimensions, spacing and font sizes SHALL be expressed in `rem`,
`em`, `%` or intrinsic units. Viewport units SHALL only be used for full-height
shell containers (`dvh`) and full-width backdrops.

#### Scenario: Wide and narrow screens
- **WHEN** any page is viewed at 1024 px and at 3840 px width
- **THEN** text and controls keep the same physical size class and no content is clipped

### Requirement: Focus visibility and reduced motion
All interactive elements SHALL show a visible focus ring on `:focus-visible`
using `--color-focus`. All non-essential transitions and animations SHALL be
disabled under `@media (prefers-reduced-motion: reduce)`.

#### Scenario: Keyboard focus is visible
- **WHEN** the user tabs through a page
- **THEN** each focused link, button and input shows a 2 px ring in the focus colour

#### Scenario: Reduced motion
- **WHEN** the OS requests reduced motion
- **THEN** hover lifts, modal scale-ins, mosaic shuffles and nav width animations do not animate
