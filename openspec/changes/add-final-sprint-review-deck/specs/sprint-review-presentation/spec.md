## ADDED Requirements

### Requirement: Self-contained final presentation file

The system SHALL provide a single presentation file at `documentation/SprintReview_RevealJS/final.html` that renders a Reveal.js slide deck using only the local reveal.js assets under `documentation/SprintReview_RevealJS/reveal.js/`, with no network dependency.

#### Scenario: Opening the deck in a browser

- **WHEN** a user opens `documentation/SprintReview_RevealJS/final.html` in a web browser via `file://`
- **THEN** the Reveal.js deck initializes and the title slide is displayed without any failed asset requests to the network

#### Scenario: Stock demo left intact

- **WHEN** the change is applied
- **THEN** `documentation/SprintReview_RevealJS/reveal.js/index.html` remains unchanged

### Requirement: Effort metrics from existing charts

The deck SHALL present project effort using the existing PNG charts in `documentation/img/revealJS/`, including overall commits, commits per person, total working time, working time per person, and per-sprint working-time breakdowns.

#### Scenario: Commit charts shown

- **WHEN** the viewer reaches the commits slide
- **THEN** `CommitsOverall.png` and `CommitsOverallPersonen.png` are displayed

#### Scenario: Working-time charts shown

- **WHEN** the viewer reaches the working-time slides
- **THEN** `InsgesamteZeitaufzeichnung.png` and `Insgesamte ZeitaufzeichnungPersonen.png` are displayed, with the space in the filename URL-encoded

#### Scenario: Per-sprint breakdown shown

- **WHEN** the viewer reaches the per-sprint section
- **THEN** the sprint 5/7/8 charts (`Zeitaufzeichnung5/7/8`, `ZeitaufzeichnungSpezifisch7/8`) are displayed, referenced by their exact extensionless filenames

### Requirement: Narrative content in German

The deck SHALL contain German-language slides covering what the team did, what it learned, what it achieved, and what is now possible with the current codebase, with claims grounded in the actual LeoPlaner codebase.

#### Scenario: Required narrative sections present

- **WHEN** a reviewer steps through the deck
- **THEN** distinct slides titled (in German) for "Was wir gemacht haben", "Was wir gelernt haben", "Was wir erreicht haben", and "Was jetzt möglich ist" are present

#### Scenario: Claims grounded in code

- **WHEN** the deck describes capabilities (e.g., simulated annealing, REST API, WebSocket live progress, Excel/CSV import-export, teacher constraints)
- **THEN** each claim corresponds to functionality that exists in `leo-planer/src/main/java/at/htlleonding/leoplaner/`
