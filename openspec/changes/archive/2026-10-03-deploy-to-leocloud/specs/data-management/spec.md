# Spec Delta

## Purpose

Lets the team clear all school data and load a known demo data set on demand,
without exposing these destructive actions to visitors of the cloud deployment.

## ADDED Requirements

### Requirement: Admin feature flags
The system SHALL expose, at `GET /api/admin/features`, whether the reset action
and the demo-data action are enabled, as a JSON object
`{ "resetEnabled": boolean, "demoDataEnabled": boolean }`. Both flags SHALL be
enabled by default when the backend runs in development mode and disabled by
default in the production container. Each flag SHALL be overridable at startup
through configuration (environment variables `LEOPLANER_RESET_ENABLED` and
`LEOPLANER_DEMO_DATA_ENABLED`).

#### Scenario: Development defaults
- **WHEN** the backend is started with `./mvnw quarkus:dev` and no overrides
- **THEN** `GET /api/admin/features` returns `resetEnabled: true` and `demoDataEnabled: true`

#### Scenario: Production defaults
- **WHEN** the backend runs from the production container image with no overrides
- **THEN** `GET /api/admin/features` returns `resetEnabled: false` and `demoDataEnabled: false`

#### Scenario: Operator override in production
- **WHEN** the production container is started with `LEOPLANER_RESET_ENABLED=true`
- **THEN** `GET /api/admin/features` returns `resetEnabled: true`

### Requirement: Reset all school data
The system SHALL provide `DELETE /api/admin/data` which, when the reset flag is
enabled, removes all teachers (including their non-working and non-preferred
hours), subjects, rooms, school classes, class-subjects, generated timetables,
and algorithm history, leaving the application in the same state as a freshly
created empty database. When the reset flag is disabled the endpoint SHALL
respond with HTTP 403 and change nothing.

#### Scenario: Reset when enabled
- **WHEN** the reset flag is enabled and a client sends `DELETE /api/admin/data`
- **THEN** the response status is 204
- **AND** the teacher, room, subject and class count endpoints subsequently return 0

#### Scenario: Reset when disabled
- **WHEN** the reset flag is disabled and a client sends `DELETE /api/admin/data`
- **THEN** the response status is 403
- **AND** all existing data is unchanged

#### Scenario: Reset while the algorithm is running
- **WHEN** a reset is requested while the timetable algorithm is running
- **THEN** the response status is 409
- **AND** no data is deleted

### Requirement: Load demo data
The system SHALL provide `POST /api/admin/demo-data` which, when the demo-data
flag is enabled, loads the bundled demo data set (subjects, teachers, rooms,
class-subjects) and generates an initial random schedule. The demo data SHALL
be packaged with the application so that loading works regardless of the
working directory the backend is started from. When the demo-data flag is
disabled the endpoint SHALL respond with HTTP 403 and change nothing.

#### Scenario: Load into empty database
- **WHEN** the demo-data flag is enabled, the database is empty, and a client sends `POST /api/admin/demo-data`
- **THEN** the response status is 204
- **AND** the teacher, room, subject and class counts are greater than 0

#### Scenario: Load when data already exists
- **WHEN** the demo-data flag is enabled, the database already contains teachers, and a client sends `POST /api/admin/demo-data`
- **THEN** the response status is 409
- **AND** no records are added

#### Scenario: Load when disabled
- **WHEN** the demo-data flag is disabled and a client sends `POST /api/admin/demo-data`
- **THEN** the response status is 403

#### Scenario: Works from the packaged container
- **WHEN** the backend runs from the production container image with the demo-data flag enabled
- **THEN** `POST /api/admin/demo-data` succeeds without depending on the source tree being present

### Requirement: Excel export and import survive a reset
Exporting the data, resetting, and importing the exported file again SHALL restore the same
school classes, their rooms, the class-subjects with their subject, teachers and school class,
and the teachers' subjects. This SHALL NOT depend on the database ids being the same, so a file
exported from one installation can be imported into another (for example from a laptop into the
cloud deployment).

#### Scenario: Export, reset, import
- **WHEN** demo data is loaded, exported, the data is reset, and the exported file is imported
- **THEN** the same class names exist again, each with its room
- **AND** every class-subject has a subject, a school class and at least one teacher
- **AND** the teachers have their subjects again

#### Scenario: Ids differ from the file
- **WHEN** the rows created by the import get different ids than the ones written in the file
- **THEN** all relations are still restored correctly

### Requirement: Import files recognized by their content
The system SHALL accept one or more files at `POST /api/import` and recognize the type of each
file from its content, independent of its name: an Excel workbook, the timetable SQL export, the
teacher wishes JSON, the Untis subjects file (GPU006) or the Untis lessons file (GPU002). A single
Excel file SHALL be imported as before. The SQL export together with GPU006 and GPU002, with the
wishes JSON optional, SHALL be imported as the real school data in the order teachers, then
subjects, rooms, classes and lessons, followed by a new starting schedule. Any other selection
SHALL be rejected before any data is written. Every response SHALL list each uploaded file with
the type it was recognized as, and all messages SHALL be in German and name what is missing or
not allowed, so a valid file is never reported as broken because of a wrong combination.

#### Scenario: Excel file
- **WHEN** a single exported `.xlsx` file is uploaded
- **THEN** it is imported the same way as through the previous Excel upload

#### Scenario: Complete school data
- **WHEN** the SQL export, GPU006, GPU002 and the wishes JSON are uploaded together, in any order
  and with any file names
- **THEN** teachers with their blocked hours and wishes, subjects, rooms, classes and lessons are
  imported and a starting schedule exists
- **AND** the response contains the import counts

#### Scenario: School data without the wishes file
- **WHEN** the SQL export, GPU006 and GPU002 are uploaded without the wishes JSON
- **THEN** the import succeeds, the teachers get their blocked hours
- **AND** the response reports the wishes as not applied instead of failing

#### Scenario: A file is missing
- **WHEN** only the SQL export and GPU006 are uploaded
- **THEN** the response is 400, lists both files as recognized, and names the missing lessons file
- **AND** no data has changed

#### Scenario: Excel mixed with school files
- **WHEN** an Excel file and school data files are uploaded together
- **THEN** the response is 400 and asks to select either the Excel file or the school data files
- **AND** no data has changed

#### Scenario: Unknown file
- **WHEN** a file of none of the known types is uploaded
- **THEN** the response is 400 and names that file as not recognized

#### Scenario: Works from the packaged container
- **WHEN** the import runs in the production image, which contains no `src/files` directory
- **THEN** it succeeds using only the uploaded files

### Requirement: Import from the source tree only in development
`GET /api/run/importSchoolData`, which reads the school data from `src/files`, SHALL only work
when the reset feature flag is enabled and SHALL answer 403 otherwise.

#### Scenario: Production container
- **WHEN** `run/importSchoolData` is called with the default production configuration
- **THEN** the response is 403 and no data has changed
