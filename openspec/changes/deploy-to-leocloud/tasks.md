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

- [ ] 5.1 Create `leo-planer/Dockerfile.prod` (node → maven → JRE stages, frontend copied into `META-INF/resources`, non-root user) and a root `.dockerignore`; verify `docker build -f leo-planer/Dockerfile.prod .` succeeds from the repo root
- [ ] 5.2 (needs sudo docker; the same jar was verified without Docker: prod profile, static files served, admin flags off, data survives restart) Smoke-test the image with `docker run` against the `database/` compose Postgres (env `QUARKUS_DATASOURCE_*`); verify `http://localhost:8080/` shows the landing page, the dashboard loads, the WebSocket connects, and `/api/admin/features` reports both flags false

## 6. Kubernetes manifests and docs

- [x] 6.1 Write `k8s/secret.template.yaml` and add `k8s/secret.yaml` to `.gitignore`; verify `git status` does not show a real secret after copying the template
- [x] 6.2 Write `k8s/postgres.yaml` (PVC, Deployment with Recreate strategy, Service) with explanatory comments; verify by parsing the YAML and checking labels, selectors and PVC name offline (`kubectl --dry-run` needs a live cluster, so it can't be used here)
- [x] 6.3 Write `k8s/leo-planer.yaml` (1 replica, Recreate, resource requests/limits, startup/liveness/readiness probes, env from the Secret, explicit image tag) and `k8s/ingress.yaml` (host placeholder); verify offline that all documents parse and that Service selectors, Secret keys and the Ingress backend match
- [x] 6.4 Write `DEPLOY.md`: local workflow (unchanged), image build/push to ghcr.io and making the package public, minikube test, `leocloud auth login` + `kubectl apply`, filling in the Ingress host, enabling the reset flag temporarily (`kubectl set env`), backups (`pg_dump`/`kubectl cp`), rollback, and the warning about deleting the namespace or PVC; verify each command in it against the manifests and file names
- [x] 6.5 If minikube is available: deploy the full `k8s/` folder to minikube and verify the app is reachable through the Ingress with working REST and WebSocket; otherwise record in `DEPLOY.md` that this step is still open for the team

## 7. Final verification

- [ ] 7.1 Run the unchanged local workflow end to end (`database/` compose + `./mvnw quarkus:dev` + Python server): load demo data, run the algorithm, export, reset, import; verify all of it works and `./mvnw verify` passes

## Handover (done by the team, not part of implementation)

Build and push the image to ghcr.io, make the package public, `leocloud auth login`,
fill in the Ingress host, `kubectl apply -f k8s/`. After the first successful
manual push: a follow-up change for the CI image push.
