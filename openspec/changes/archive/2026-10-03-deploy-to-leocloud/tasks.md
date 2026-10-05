# Tasks

## 1. Backend configuration

- [x] 1.1 Split `quarkus.hibernate-orm.database.generation` by profile (prod `update`, `%dev`/`%test` `drop-and-create`) and add `leoplaner.reset-enabled` / `leoplaner.demo-data-enabled` (false by default, true in `%dev`) to `application.properties`; verify `./mvnw quarkus:dev` still starts with an empty DB
- [x] 1.2 Add `quarkus-smallrye-health` to `pom.xml`; verify `curl localhost:8080/q/health/ready` returns UP with the DB running and DOWN with it stopped

## 2. Demo data and reset

- [x] 2.1 Move demo CSVs (`script/fakerGeneration/csvOutput/*.csv`, `src/files/csvFiles/test1/testSubject.csv`) into `leo-planer/src/main/resources/demo-data/` and point the faker script's default output folder there; verify the files are inside `target/classes/demo-data/` after `./mvnw package -DskipTests`
- [x] 2.2 Add a classpath/`InputStream` variant to `CSVManager` so demo data loads without filesystem paths; verify the existing `TestCSV` tests still pass
- [x] 2.3 Implement a transactional delete-all in `DataRepository` (FK-safe order, plus clearing in-memory timetable and history); verify that after calling it all count endpoints return 0
- [x] 2.4 Create `AdminResource` with `GET /api/admin/features`, `DELETE /api/admin/data` (403 disabled / 409 algorithm running / 204) and `POST /api/admin/demo-data` (403 disabled / 409 data exists / 204); verify every status code from the data-management spec with curl in dev mode and with `LEOPLANER_RESET_ENABLED=false`
- [x] 2.5 Add Quarkus tests for the admin endpoints (feature flags, reset empties the counts, demo-data 409 on a non-empty DB); verify with `./mvnw test`

## 3. Excel without source-tree paths

- [x] 3.1 Change the export (`createBaseDataWorkbook` + `/test-export`) to stream the workbook from memory; verify "Daten exportieren" downloads a valid `.xlsx` and `src/files/excelFiles/export/` gets no new files
- [x] 3.2 Change `/uploadExcel` + `ExcelManager.importFile` to read the upload from an `InputStream` without writing to disk; verify importing an exported file works and no `upload_*.xlsx` is created
- [x] 3.3 Grep `leo-planer/src/main/java` for `src/files` and `../script`; verify only the legacy test endpoints (`run/testCsvOriginal`, `test-import`) still reference them

## 4. Frontend

- [x] 4.1 Add the shared base-URL helper (`API_BASE_URL`, `WS_BASE_URL`, port heuristic from design D3); verify the Python-server case with `python3 -m http.server 8000` (requests go to `localhost:8080`)
- [x] 4.2 Replace every hardcoded URL in `apiHelpers.ts`, `uploadApi.ts`, `downloadApi.ts`, `dashboard.ts`, `graph.ts`, `timetable.ts` (including the WebSocket) with the helper; verify `grep -rn "localhost:8080" web/src/ts` only matches the helper
- [x] 4.3 Remove the auto-seed call from `index.ts`; verify that reloading the landing page several times leaves the dashboard counts unchanged
- [x] 4.4 Add "Demodaten laden" and "Daten zurücksetzen" quick actions on the dashboard, shown only when `/api/admin/features` enables them, with a confirmation dialog for reset and a 409 message for demo data; verify in dev mode (buttons visible and working) and with the flags off (buttons hidden)
- [x] 4.5 Rebuild `web/dist` with `npm run build` in `web/`; verify `tsc` finishes without errors and the pages load through the Python server

## 5. Production image

- [x] 5.1 Create `leo-planer/Dockerfile.prod` (node → maven → JRE stages, frontend copied into `META-INF/resources`, non-root user) and a root `.dockerignore`; verify `docker build -f leo-planer/Dockerfile.prod .` succeeds from the repo root
- [x] 5.2 Smoke-test the image with `docker run` against the `database/` compose Postgres (env `QUARKUS_DATASOURCE_*`); verify `http://localhost:8080/` shows the landing page, the dashboard loads, the WebSocket connects, and `/api/admin/features` reports both flags false

## 6. Kubernetes manifests and docs

- [x] 6.1 Write `k8s/secret.template.yaml` and add `k8s/secret.yaml` to `.gitignore`; verify `git status` does not show a real secret after copying the template
- [x] 6.2 Write `k8s/postgres.yaml` (PVC, Deployment with Recreate strategy, Service) with explanatory comments; verify by parsing the YAML and checking labels, selectors and PVC name offline (`kubectl --dry-run` needs a live cluster, so it can't be used here)
- [x] 6.3 Write `k8s/leo-planer.yaml` (1 replica, Recreate, resource requests/limits, startup/liveness/readiness probes, env from the Secret, explicit image tag) and `k8s/ingress.yaml` (host placeholder); verify offline that all documents parse and that Service selectors, Secret keys and the Ingress backend match
- [x] 6.4 Write `DEPLOY.md`: local workflow (unchanged), image build/push to ghcr.io and making the package public, minikube test, `leocloud auth login` + `kubectl apply`, filling in the Ingress host, enabling the reset flag temporarily (`kubectl set env`), backups (`pg_dump`/`kubectl cp`), rollback, and the warning about deleting the namespace or PVC; verify each command in it against the manifests and file names
- [x] 6.5 If minikube is available: deploy the full `k8s/` folder to minikube and verify the app is reachable through the Ingress with working REST and WebSocket; otherwise record in `DEPLOY.md` that this step is still open for the team

## 7. Final verification

- [x] 7.1 Run the unchanged local workflow end to end (`database/` compose + `./mvnw quarkus:dev` + Python server): load demo data, run the algorithm, export, reset, import; verify all of it works and `./mvnw verify` passes

## 8. Follow-up found while testing (reset exposed pre-existing bugs)

- [x] 8.1 Map the ids inside an excel file to the newly imported rows instead of looking them up in the database; verify with the new `ExcelRoundTripTest` (export → reset → import keeps classes, rooms, teachers, class-subjects)
- [x] 8.2 Return the managed instance from `SubjectRepository.add` (it used `merge` and returned the detached one); verify teachers keep their subjects after an import
- [x] 8.3 Load the first available class on the timetable page instead of the hardcoded id 1, and answer 404 instead of a 500 for a missing class/timetable; verify `GET /api/timetable/getByClass/<unknown>` returns 404 and the page works after a reset+import

## 9. Real school data without `src/files` (merged from `main`, see design D12)

- [x] 9.1 Make the importers take their data as bytes only: `TimetableExportImporter.importExport` gets the wishes JSON as an optional parameter (none → every wish is reported as unmapped, blocked hours are still imported) instead of reading `WISHES_PATH`; verify `TestTimetableExportImporter` and `TestGpuImporter` still pass and add a test for the import without the wishes file
- [x] 9.2 Add a file type detector (Excel, SQL export, wishes JSON, GPU006, GPU002, unknown) that looks at the content only (see the D12 table) and reuses the existing decode/parse helpers for the Windows-1252 GPU files; verify with unit tests on small anonymized sample contents for every type, including a renamed file and an unknown file (no real data in `src/test`)
- [x] 9.3 Add the combination check and German messages: Excel alone, or SQL + GPU006 + GPU002 (+ optional JSON); missing file, duplicate type, Excel mixed with school files and unknown file each get their own message, and every result lists each file with its recognized type; verify with unit tests for each case
- [x] 9.4 Create `POST /api/import` (`multipart/form-data`) that detects, checks and then runs either the Excel import or the school import (teachers → GPU → `randomizeSchoolSchedule()`, same order as `run/importSchoolData`); nothing is written when the check fails; verify with a Quarkus test for a 400 on a missing file (the counts stay unchanged) and, when the real files exist locally, a skipped-if-missing test for the full import
- [x] 9.5 Guard `run/importSchoolData` with `leoplaner.reset-enabled` (403 when off) and keep it reading `src/files` as a dev shortcut; verify in `AdminDisabledTest` that it answers 403
- [x] 9.6 Frontend: the import button allows `multiple` files with `.xlsx,.xls,.txt,.sql,.json`, drops the MIME check, sends all files as `FormData` to `/api/import`, and shows the per-file result and the message from the backend; rename the quick action to "Daten importieren"; rebuild `web/dist`; verify in the browser: Excel alone, all four school files, three school files without the JSON, only two files (clear message), Excel + a TXT (clear message)
- [x] 9.7 Grep `leo-planer/src/main/java` for `src/files` again; verify only the dev/legacy endpoints (`run/importSchoolData`, `run/testCsvOriginal`, `test-import`) still reference it
- [x] 9.8 Update `DEPLOY.md`: how the real data gets to the cloud (select the files in the import on the website), that the files must never be committed or put into the image, and that `run/importSchoolData` is dev-only; verify against the endpoint and the file names
- [x] 9.9 Run `./mvnw verify` and the local round trip again (demo data, algorithm, export, reset, Excel import, reset, school data import through the website, algorithm on the real data); verify everything works and the browser console stays clean

## Handover (done by the team, not part of implementation)

Build and push the image to ghcr.io, make the package public, `leocloud auth login`,
fill in the Ingress host, `kubectl apply -f k8s/`. After the first successful
manual push: a follow-up change for the CI image push.
