# Spec Delta

## ADDED Requirements

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
