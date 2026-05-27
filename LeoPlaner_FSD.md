# Functional Specification Document

**Project:** LeoPlaner
**Document Type:** Functional Specification Document (FSD)
**Status:** Draft

---

## 1. Project Overview

**Project Title:** LeoPlaner

**Short Description:**
LeoPlaner is a web-based application for generating optimized school timetables. It is designed for teachers and administrators responsible for timetable creation and aims to produce the best possible schedules for an entire school. By automating the planning process, LeoPlaner reduces the manual effort traditionally required at the end of each school year.

**Background / Current Situation:**
At present, a small team of teachers spends several weeks manually creating timetables for dozens of classes and hundreds of teachers. The process is slow, error-prone, and frequently results in inconvenient gaps in both teacher and class schedules. All teaching staff and students are indirectly affected by the quality of the resulting plan.

**Problem Statement:**
- Manual timetable creation is inefficient and consumes significant working time.
- The process is prone to human error.
- No algorithmic support currently exists; the entire plan is produced by hand.
- Suboptimal schedules can lead to unnecessary gaps for both teachers and classes.

**Project Goals:**
- Provide a web platform where administrators can enter all relevant data (teachers, classes, rooms, subjects, and their relationships).
- Generate optimized timetables that respect teacher availability preferences and minimize gaps for classes and staff.
- Support both an automated (basic) and an interactive (advanced) algorithm mode.
- Significantly reduce the time and effort required to produce a complete school timetable.

---

## 2. Scope

### In Scope
- Web application accessible via modern desktop browsers.
- Management of teachers, classes, rooms, subjects, and class-subject relationships.
- Excel-based import and export of input data and resulting timetables.
- Timetable generation using a Simulated Annealing algorithm.
- Two execution modes: a basic one-click mode and an advanced interactive mode with parameter control and progress visualization.
- User account system with registration, login, logout, and persistence of stored data between sessions.
- Display of generated timetables in tabular form.

### Out of Scope
- Automatic substitution planning for short-term teacher absences.
- Integration with existing school management systems such as student databases or grading systems.
- A native mobile application (the product is web-only).
- Manual fine-tuning of timetables as a replacement for the algorithm (the system supports rather than replaces manual review).
- Long-term resource planning spanning multiple school years.
- Formal GDPR compliance, data protection processes, and related legal artifacts (DPA, consent management, data subject access requests, etc.). The system is developed and used as an internal school project; full GDPR work is deferred and may be addressed in a later phase if the system leaves the school-internal context.

---

## 3. Users and Stakeholders

**Primary Users:**
- Timetable administrators: either dedicated staff or a designated team of teachers responsible for creating the schedule.

**Secondary Users:**
- None directly. Other teachers and students are recipients of the generated timetables but do not interact with the system.

**Stakeholders:**
- School administration and management.
- Teaching staff (as indirect beneficiaries of better schedules).
- Students (as indirect beneficiaries).
- Project supervisors and assessors in the context of the school project.

---

## 4. Use Cases / User Scenarios

**UC-01: Annual Timetable Creation**
During the final two weeks of a school year, an administrator imports updated data (teachers, classes, rooms, subjects, class-subject relationships) for the upcoming year. The administrator then runs the algorithm to produce a complete optimized timetable and exports it for distribution.

**UC-02: Manual Data Entry and Updates**
An administrator adds or updates individual entities (e.g., a new teacher or room) directly through the web interface rather than re-importing a full Excel file.

**UC-03: Interactive Algorithm Tuning**
An advanced user starts the algorithm in interactive mode, observes the optimization progress via a live graph, pauses and resumes the run, and adjusts parameters using sliders to explore better solutions.

**UC-04: Basic One-Click Generation**
A less experienced user starts the algorithm in basic mode and waits for the system to autonomously stop and present a result, without adjusting any parameters.

**UC-05: Session Continuity**
A user logs out after partial work, then returns later, logs in, and continues from the same state without data loss.

---

## 5. Functional Requirements

### Data Management
- **FR-01:** The system shall allow administrators to import existing school data (teachers, classes, rooms, subjects, class-subject relationships) from Excel files.
- **FR-02:** The system shall allow administrators to export the current data set and generated timetables as Excel files.
- **FR-03:** The system shall allow administrators to add a teacher manually by entering name, a symbol/short code, and the list of teaching subjects (one or more subject IDs). Teacher availability constraints ("cannot work" and "does not want to work" time slots) are configured separately in the web UI, as they are not part of the Excel import schema.
- **FR-04:** The system shall allow administrators to add a room manually by entering number, name, a short code, and one or more room types (e.g., `WORKSHOP`, `CLASSROOM`, `PHY`, `CHEM`, `SPORT`, `EDV`). A room may have multiple room types.
- **FR-05:** The system shall allow administrators to add a subject manually by entering name, a symbol/short code, and zero or more required room types. If multiple types are listed, any one of them is acceptable for the subject.
- **FR-06:** The system shall allow administrators to add a class manually by entering its name and its primary classroom reference (room ID).
- **FR-07:** The system shall allow administrators to create a "ClassSubject" entity linking a class, a subject, and a teacher, with the following fields: weekly hours, `Requires Double Period` (hard), and `Is better as Double Period` (soft preference).
- **FR-08:** The system shall allow administrators to edit and remove existing teachers, rooms, classes, subjects, and class-subjects.

### Algorithm
- **FR-09:** The system shall generate timetables using a Simulated Annealing algorithm.
- **FR-10:** The algorithm shall use an initial temperature of 1000 and a cooling rate of 0.998 as default parameters.
- **FR-11:** The system shall provide a basic mode that starts the algorithm with a single action and runs until a token-based iteration limit is reached, after which it stops automatically and presents the result.
- **FR-12:** The system shall provide an advanced mode that allows the user to start, pause, and resume the algorithm via buttons.
- **FR-13:** In advanced mode, the system shall display a real-time graph of the algorithm's progress showing the cost function over iterations/time.
- **FR-14:** In advanced mode, the system shall additionally provide periodic visual feedback within the timetable view (approximately every 100 moves) showing which lessons have just been moved and to which time slots, so the user can visually follow the optimization in the schedule itself.
- **FR-15:** In advanced mode, the system shall allow the user to adjust algorithm parameters via sliders during or before a run.
- **FR-16:** The optimization shall account for teacher availability and preferences and shall minimize unnecessary gaps in class schedules.
- **FR-17:** The system shall ensure that generated timetables satisfy the following hard constraints:
  - No teacher is assigned to more than one lesson in the same time slot.
  - No room is assigned to more than one lesson in the same time slot.
  - No class is assigned to more than one lesson in the same time slot.
  - No teacher is scheduled during a time slot they have marked as "cannot work".
  - Every lesson is assigned to a room whose set of room types includes at least one of the subject's required room types. A subject with no required room types may be placed in any room.
  - Lessons marked `Requires Double Period` are scheduled as a contiguous double period.
- **FR-18:** The system shall treat the following as soft constraints, contributing to the optimization cost function:
  - Teacher time slots marked as "do not want to work" (preference, not absolute).
  - Gaps in class schedules.
  - Gaps in teacher schedules.
  - Lessons marked `Is better as Double Period` (preferred but not required).

### Account System
- **FR-19:** The system shall allow users to create an account by providing a unique user ID and a password.
- **FR-20:** The system shall authenticate users at login using the credentials provided during account creation.
- **FR-21:** The system shall allow authenticated users to log out, ending their session.
- **FR-22:** The system shall persist a user's data across sessions, so that after logout and subsequent login the user resumes from the previous state.
- **FR-23:** Each school operates with a single shared administrator account. Role-based access control and multiple per-school accounts are not in scope for this release.

### Interface
- **FR-24:** The system shall provide a web interface that is accessible from modern desktop browsers.
- **FR-25:** The system shall display generated timetables in tabular form, suitable for visual review.

---

## 6. Non-Functional Requirements

### Usability
- **NFR-01:** The user interface shall be clear and easy to use, including for users with limited technical experience.
- **NFR-02:** Input fields and forms shall be clearly structured and labeled.
- **NFR-03:** Timetable output shall be visually clear and easily readable.

### Performance
- **NFR-04:** User interface interactions (e.g., button clicks, form submissions) shall provide feedback within approximately 200 ms under normal conditions.
- **NFR-05:** For a small reference workload of approximately 150 teachers and 60 classes, the algorithm shall produce a complete timetable in no more than 30 minutes on reasonable server hardware.
- **NFR-05a:** The system shall remain functional and capable of producing a valid timetable for the upper-scale workload of approximately 500 teachers and 4,000 students (i.e., the full size of a large school). Runtime at this scale is expected to be longer than 30 minutes; a concrete upper bound for this scale is to be determined empirically.

### Reliability
- **NFR-06:** In case of a system crash or unexpected browser/tab closure, the most recent state of the optimized timetable shall be saved and restored on the next session.
- **NFR-07:** The system shall validate input data before starting the optimization to avoid invalid runs.

### Maintainability
- **NFR-08:** The system shall be designed in a modular way so that algorithm components, data management, and UI can be modified independently. *(Assumption: derived from typical project expectations; not explicitly specified in the source.)*

### Constraints
- **NFR-09:** The system shall run in current versions of Chrome, Firefox, Edge, and Safari.
- **NFR-10:** The system requires an active internet connection to operate.
- **NFR-11:** Formal GDPR compliance is out of scope for the current phase as the system is used as an internal school project. Basic security hygiene is still expected (passwords stored hashed, transport via HTTPS where the deployment supports it). Full GDPR work is deferred.
- **NFR-12:** The project is conducted as a school project and shall be completed by May 2027.

---

## 7. Data and Content

**Inputs:**
- Excel files containing teachers, classes, rooms, subjects, and class-subject relationships.
- Manual entries through the web interface.
- Algorithm parameters (advanced mode).
- User credentials.

**Outputs:**
- Optimized timetables shown in tabular form within the application.
- Exported timetables and data as Excel files.
- Algorithm progress visualization (advanced mode).
- Validation and error messages.

**Stored Data (entity schema, aligned with the Excel import format):**

- *Subject:* `ID`, `Name`, `Symbol` (short code), `Required Room Types` (zero or more room-type tags, comma-separated; empty means any room is acceptable).
- *Room:* `ID`, `Number`, `Name`, `Short` (short code), `Room Type` (one or more types, comma-separated; e.g., `WORKSHOP`, `CLASSROOM`, `PHY`, `CHEM`, `SPORT`, `EDV`).
- *Teacher:* `Id`, `Name`, `Symbol` (short code), `Teaching Subjects Ids` (one or more subject IDs, comma-separated). Availability (`cannot work` and `does not want to work` time slots) is associated with the teacher but stored separately from the import file and entered via the web UI.
- *SchoolClass:* `ID`, `Name`, `classRoomID` (reference to a `Room`).
- *ClassSubject:* `ID`, `Subject Id`, `Teacher Ids`, `School class ID`, `Weekly Hours`, `Requires Double Period` (boolean, hard), `Is better as Double Period` (boolean, soft).
- *User account:* unique user ID, password (stored securely), associated school data set.
- *Algorithm state:* most recent intermediate or final timetable, for recovery purposes.

**Data Rules:**
- Each `ClassSubject` must reference exactly one `SchoolClass`, one `Subject`, and one `Teacher`.
- Each teacher's listed teaching subjects must reference valid `Subject` IDs.
- Each room must declare at least one room type.
- For any lesson, the assigned room's room types must intersect with the subject's required room types (if the subject lists any). Subjects without any required room types may be placed in any room.
- A teacher cannot be assigned to a lesson during a time slot marked as `cannot work`.

---

## 8. Business Rules / Logic

**Validation Rules:**
- The system shall not start an optimization run if mandatory data is missing (e.g., a subject without an assigned teacher).
- The system shall reject contradictory rule definitions (e.g., a teacher required for a lesson during their declared unavailable slot).
- The system shall reject Excel imports that use an unsupported file format and shall inform the user accordingly.

**Process Rules:**
- A timetable is only considered valid if it satisfies all hard constraints (no double-booked teachers, classes, or rooms; required room types matched; teacher availability respected).
- The algorithm shall continue running until either (a) the token-based iteration limit is reached (basic mode), or (b) the user manually stops it (advanced mode).
- Generated timetables aim to maximize teacher preference satisfaction and minimize class schedule gaps as soft objectives.

**Permissions:**
- Only authenticated users may access timetable data, run the algorithm, or import/export files.
- Each school operates under a single shared administrator account. All users with the school's credentials see and manipulate the same shared data set. Role-based access control is not in scope.

---

## 9. Error Handling / Edge Cases

**Invalid Input:**
- Incomplete or contradictory input shall result in a clear, human-readable error message; no optimization is started.
- Unsupported file formats during Excel import shall trigger a corresponding error message.

**Missing Data:**
- If a subject has no assigned teacher, the optimization shall not start and the user shall be notified which entity is missing.
- If the configured constraints cannot be satisfied because total required lesson hours exceed the available teacher capacity (given current `cannot work` slots and weekly hours), the system shall report which teachers or classes are over-allocated. The administrator can then resolve this by modifying teacher working hours (e.g., relaxing `cannot work` slots or `does not want to work` slots) and re-running the algorithm.

**Exceptional Situations:**
- On a browser crash or unexpected tab closure, the latest saved timetable state shall be restored on the user's next session.
- On server errors during optimization, the system shall present a clear failure message and allow the user to retry or adjust input data.
- Authentication failures shall present a generic error message without revealing which credential was incorrect.

---

## 10. Assumptions and Dependencies

**Technical Assumptions:**
- Users have access to modern desktop browsers (Chrome, Firefox, Edge, Safari) with internet connectivity.
- The server hosting the algorithm provides sufficient computational resources for the target workload, including the 500 teachers / 4,000 students upper-scale scenario.
- The Excel import/export schema is defined by the `ExcelManager` workbook generator and consists of the sheets `Subjects`, `Rooms`, `Teachers`, `SchoolClasses`, and `ClassSubjects` as described in Section 7. Teacher availability is not part of this schema and is entered via the UI.

**Organizational Assumptions:**
- The school provides authoritative input data (teacher availabilities, class composition, room inventory).
- Timetable creation is performed by a designated user or small team rather than by every teacher.
- The project is developed and delivered within the school project timeframe ending in May 2027.

**Dependencies:**
- Availability of a hosting environment with internet access.
- Availability of an Excel parsing library (or equivalent) for import/export.

---

## 11. Acceptance Criteria

- **AC-01:** Given valid input data, the system produces a complete and valid timetable that respects all hard constraints (no double bookings, valid room types, teacher availability).
- **AC-02:** The user can start, pause, resume, and stop the algorithm in advanced mode, and a live progress graph is visible during the run.
- **AC-03:** The user can start the algorithm in basic mode with a single action, and the algorithm stops autonomously based on the token/iteration limit.
- **AC-04:** Algorithm parameters can be adjusted via sliders in advanced mode and take effect on the run.
- **AC-05:** Excel files matching the supported schema can be imported, and the resulting data is correctly reflected in the system.
- **AC-06:** Generated timetables can be exported as Excel files.
- **AC-07:** Teachers, classes, rooms, subjects, and class-subjects can be created, edited, and deleted through the web interface.
- **AC-08:** A new user can register, log in, log out, and on next login finds their previously stored data unchanged.
- **AC-09:** For a reference data set of approximately 150 teachers and 60 classes, the algorithm completes within 30 minutes on the target hosting environment.
- **AC-09a:** The system is able to load, validate, and produce a valid timetable for a full-scale data set of approximately 500 teachers and 4,000 students (runtime to be measured, not bounded at 30 minutes).
- **AC-10:** Invalid inputs, missing data, and unsupported file formats produce clear, understandable error messages and do not start an optimization run.
- **AC-11:** After an unexpected browser closure, the user finds the most recent saved timetable state restored on the next session.

---

## 12. Open Questions

All originally open questions have been resolved for the current project phase. They are listed below for traceability.

### Resolved Questions

- **OQ-01 (resolved):** Constraints are now defined as hard vs. soft in FR-17 and FR-18. Teacher/room/class overlaps, `cannot work` slots, required room types, and `Requires Double Period` are hard. `Does not want to work`, gaps, and `Is better as Double Period` are soft.
- **OQ-02 (resolved):** The algorithm visualization consists of (a) a cost-over-time graph (FR-13) and (b) periodic updates of the timetable view roughly every 100 moves, showing which lessons changed slot (FR-14).
- **OQ-03 (resolved):** Maximum supported scale is approximately 500 teachers and 4,000 students; see NFR-05a.
- **OQ-04 (resolved):** Formal GDPR compliance is out of scope for the current phase. The system is operated as an internal school project; only basic security hygiene (password hashing, HTTPS where available) applies. See NFR-11 and the Out-of-Scope list. If the system is later opened beyond the school-internal context, GDPR handling will need to be revisited.
- **OQ-05 (resolved):** Schema is the one produced by the `ExcelManager` workbook generator: sheets `Subjects`, `Rooms`, `Teachers`, `SchoolClasses`, and `ClassSubjects` with the columns documented in Section 7.
- **OQ-06 (resolved):** Each school uses a single shared administrator account; no roles for this release (FR-23).
- **OQ-07 (resolved):** When total required lesson hours cannot be accommodated, the administrator is informed and may modify teacher working hours (i.e., adjust `cannot work` / `does not want to work` slots) and re-run the algorithm (see Section 9).
