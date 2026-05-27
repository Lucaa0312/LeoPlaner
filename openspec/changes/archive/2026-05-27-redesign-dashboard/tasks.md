# Tasks

## 0. Prerequisite
- [x] Merge `origin/classSubjectPage` into the working branch; resolve conflicts
- [x] Verify present after merge: `classSubjects.html`, `exportButton.ts`,
      `downloadApi.ts`, `classSubjectApi.ts` (`fetchSchoolClasses`),
      `SchoolClassResource`

## 1. Markup (`web/pages/dashboard.html`)
- [x] Remove status card image + `#welcome-text` / `#timetable-status-text` block
- [x] Add header: `<h1>Dashboard</h1>` + static subtitle paragraph
- [x] Add containers for stats grid, quick actions, data management
- [x] Add `#excel-export` button + `#export-error` element for export wiring
- [x] Keep loading the existing icon fonts (Tabler / FontAwesome)

## 2. Logic (`web/src/ts/pages/dashboard.ts`)
- [x] Remove `generateWelcomeText`, `showLastUpdateTime`
- [x] Fetch counts: teachers, subjects, rooms (existing endpoints)
- [x] Add Klassen count via `fetchSchoolClasses().length`
- [x] Render 4 stat cards (Lehrer, Klassen, Räume, Fächer) with icon + count + label
- [x] Render 3 quick-action cards (import, export, timetable link)
- [x] Render 4 data-management link cards (teacher, classSubjects, rooms, subjects)
- [x] Call `initImportButton()` and `initExportButton()`
- [x] Keep error handling for failed count fetches (fallback 0)

## 3. Styling (`web/style/dashboard.css`)
- [x] Stats grid: 4 cols desktop / 1 col mobile
- [x] Quick actions grid: 2 cols desktop / 1 col mobile
- [x] Data management grid: 4 cols desktop / 1 col mobile
- [x] Card styles using `--leo-*` variables (no doc blue)
- [x] Hover: border → primary, quick-action icon container fill, `transition`
- [x] Remove dead status-card styles

## 4. Verify
- [ ] All four counts render (incl. Klassen) against running backend — needs live backend
- [ ] Import opens file picker and validates `.xlsx/.xls` — needs browser
- [ ] Export downloads `leoplaner-export-<date>.xlsx` — needs live backend
- [x] All nav links resolve to existing pages
- [x] Responsive collapse at mobile breakpoint (CSS media query at 768px)
