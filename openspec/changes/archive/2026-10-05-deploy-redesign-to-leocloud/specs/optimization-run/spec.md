# Spec Delta

## Purpose

Keeps the lifecycle of an optimisation run on the server: Einfach rounds, progress, time left and the
finish reason. Every page, tab and device then sees the same run state, and a run continues correctly
without any browser open.

## ADDED Requirements

### Requirement: Einfach rounds run on the server
When a run is started or resumed in Einfach (automatic) mode, the server SHALL continue it in rounds
without any client involvement. After each cooling pass the server SHALL reheat moderately and start
the next round. The run SHALL finish when three rounds in a row brought no relevant improvement of
the best cost, or when the run has lasted 15 minutes. A pause requested by a user SHALL end the run
as paused, not finished, and SHALL NOT start another round.

#### Scenario: Run continues while no page is open
- **WHEN** a run is started in Einfach mode and every browser tab is then closed
- **THEN** the run continues through further rounds until it finishes by itself
- **AND** the run state afterwards reports it as finished

#### Scenario: Finishes after rounds stop paying off
- **WHEN** three rounds in a row end without a relevant improvement of the best cost
- **THEN** the run stops and reports the finish reason "no further gain" together with the number of rounds

#### Scenario: Time limit
- **WHEN** an Einfach run has lasted 15 minutes
- **THEN** the run stops and reports the finish reason "time limit"

#### Scenario: User pause
- **WHEN** a user pauses a running Einfach run
- **THEN** the run stops, is reported as paused, and no further round starts

### Requirement: Readable run state
The server SHALL provide the current run state at `GET /api/algorithm/status`. The state SHALL
include:
- the status (`idle`, `running`, `paused`, `finished`),
- the mode (`einfach` or `erweitert`),
- the round number,
- the progress as a fraction from 0 to 1,
- the estimated minimum seconds left (or none when unknown),
- the finish reason (or none),
- the best cost of the run.

Every progress message on the progress WebSocket SHALL carry the same state fields.

#### Scenario: Page opened during a run
- **WHEN** a client requests `GET /api/algorithm/status` while an Einfach run is in round 3 at 40 %
- **THEN** the response reports status `running`, round 3 and progress 0.4

#### Scenario: Same state on every client
- **WHEN** two clients are connected to the progress WebSocket during a run
- **THEN** both receive the same status, round and progress values

#### Scenario: Before the first run
- **WHEN** no run has been started since the server started
- **THEN** the status is `idle` and the progress is 0

### Requirement: Progress never moves backwards
Within one run, including pauses and resumes of that run, the reported progress SHALL never decrease.
A finished run SHALL report progress 1. Starting a fresh run (new random plan) SHALL reset progress
to 0. Resuming a finished run to improve it further SHALL start a new progress stretch at 0. Resuming
a paused run SHALL continue from the progress it had when it was paused.

#### Scenario: Another round becomes necessary
- **WHEN** a round still improves the plan, so one more round is added
- **THEN** the estimated time left may increase, but the progress value does not decrease

#### Scenario: Pause and resume
- **WHEN** a run paused at 55 % is resumed
- **THEN** the first progress reported after resuming is at least 0.55

#### Scenario: Finished
- **WHEN** a run finishes
- **THEN** its status is `finished` and its progress is 1
