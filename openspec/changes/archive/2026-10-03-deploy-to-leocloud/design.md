# Design

## Context

See proposal.md for the motivation. Constraints that shape the approach:

- **LeoCloud** is plain Kubernetes ("1:1 compatible with minikube"), one
  namespace per student, public HTTPS via Ingress on a subdomain of
  `cloud.htl-leonding.ac.at`, images pulled from `ghcr.io`. Namespaces and
  PVCs are deleted permanently with no recovery.
- **Backend:** Quarkus 3.28, Hibernate ORM Panache, PostgreSQL, a WebSocket
  endpoint `/api/algorithm/progress`. Algorithm state lives in memory in
  `@ApplicationScoped` beans (for example the `static AtomicLong temperature`
  in `SimulatedAnnealingAlgorithm`).
- **Frontend:** static HTML plus TypeScript compiled by `tsc` into `web/dist/js`.
  The landing page `index.html` is at the repo root and references `./web/...`.
  Today the frontend is served by a Python HTTP server and calls
  `http://localhost:8080`.
- **Team:** nobody is experienced with Kubernetes, so the manifests have to be
  readable and commented, and things that are hard to debug should be avoided.
- **The local workflow must keep working unchanged:** `database/docker-compose.yaml`,
  `./mvnw quarkus:dev`, and the Python server.

## Goals / Non-Goals

**Goals:**
- One container image containing the backend and the frontend, deployable with
  `kubectl apply -f k8s/`.
- The same frontend build works from the Python server, from `quarkus:dev` on
  port 8080, and from the cloud over HTTPS.
- The destructive admin actions can't be triggered by cloud visitors.

**Non-Goals:**
- Authentication or user accounts.
- Horizontal scaling (more than one backend replica).
- Automated deployment from CI to LeoCloud.
- Fixing `devops/docker-compose.yaml`.
- Helm, Kustomize, operators, or separate environments.

## Decisions

### D1 — Serve the frontend from Quarkus (one image)
The production image copies `index.html` and `web/{pages,style,assets,javascript,dist}`
into Quarkus's static resource directory, keeping the same relative layout
(so `/index.html` and `/web/...`). Quarkus serves it on the same origin as
`/api`.
- *Why:* one image, one Service, one Ingress rule, and no CORS. This keeps the
  YAML the team has to understand to a minimum.
- *Alternative:* a separate nginx image with path-based Ingress routing. It
  would mean two images, two Deployments, and more YAML. Rejected for now; it
  can be split out later without spec changes.
- The static files are copied **only in the Docker build**, not into
  `leo-planer/src/main/resources`. This avoids duplicating the frontend in git
  and leaves `quarkus:dev` unchanged.

### D2 — Multi-stage production Dockerfile, build context = repo root
New file `leo-planer/Dockerfile.prod`, built with
`docker build -f leo-planer/Dockerfile.prod -t ghcr.io/lucaa0312/leoplaner:<tag> .`
from the repo root, because the build needs both `leo-planer/` and `web/`.
Stages:
1. `node` — `npm ci` + `tsc` in `web/`. Compiling in the image means a stale
   committed `web/dist` can't end up in the image.
2. `maven` (temurin 21) — `mvn package -DskipTests` with the frontend copied
   into `target/classes/META-INF/resources` before packaging (or copied into
   `src/main/resources/META-INF/resources` inside the build stage only).
3. `eclipse-temurin:21-jre` — copies `target/quarkus-app/`, runs as a non-root
   user, `EXPOSE 8080`.

The existing `leo-planer/Dockerfile` (dev mode) is untouched. A root
`.dockerignore` excludes `node_modules`, `target`, `.git`, `demo`,
`documentation`, `hall-of-shame`, and similar folders.
- *Alternative:* reuse the generated `src/main/docker/Dockerfile.jvm`. It
  requires running `mvn package` on the host first and doesn't handle the
  frontend. Rejected.

### D3 — Runtime base-URL helper in the frontend
A single module (for example `web/src/ts/utils/apiBase.ts`) exports
`API_BASE_URL` and `WS_BASE_URL`:

```
port = location.port
if port in ("8080", "")   → base = location.origin            (quarkus / cloud)
else                      → base = "http://localhost:8080"    (python server)
API_BASE_URL = base + "/api"
WS_BASE_URL  = base with http→ws / https→wss, + "/api"
```

All ~20 call sites (`apiHelpers.ts`, `uploadApi.ts`, `downloadApi.ts`,
`dashboard.ts`, `graph.ts`, `timetable.ts`) import from it. This also fixes
the current `new WebSocket("http://...")`, which only works because some
browsers tolerate it.
- *Alternative:* a generated `config.js` or a build-time variable. That needs a
  build step per environment, and the port heuristic already covers all three
  known setups. Rejected.

### D4 — Admin feature flags via Quarkus profiles
```
leoplaner.reset-enabled=false
leoplaner.demo-data-enabled=false
%dev.leoplaner.reset-enabled=true
%dev.leoplaner.demo-data-enabled=true
```
They are read with `@ConfigProperty`. Quarkus maps the environment variables
`LEOPLANER_RESET_ENABLED` / `LEOPLANER_DEMO_DATA_ENABLED` to these properties
automatically, which matches the names in the spec. A new `AdminResource` (`/api/admin`) contains `GET features`,
`DELETE data`, and `POST demo-data`, and checks the flag in each handler.
The endpoints stay registered but return 403 when disabled. That makes it
possible to enable them at runtime through a pod restart with an environment
variable, without rebuilding.
- *Alternative:* `@IfBuildProfile("dev")`, which removes the endpoints from the
  prod build entirely. It's safer, but then the cloud database can't be reset
  without a new image. Rejected per the team's wish to reset the cloud data
  when needed.
- *Alternative:* allow only requests from localhost. Behind the Ingress,
  every request comes from the proxy, and `X-Forwarded-For` can be spoofed.
  Rejected.

### D5 — Reset implementation
`DataRepository.deleteAllData()` runs one `TRUNCATE <all tables of the current schema> CASCADE`
(table list from `pg_tables`), then clears the in-memory timetables, best schedule and history.
- *Why not delete entity by entity in FK order (the original plan):* the element-collection and join
  tables (`teacher_non_working_hours`, room types, `class_subject_teachers`, …) aren't reachable with
  JPQL bulk deletes, and a hand-maintained order breaks silently when an entity is added. TRUNCATE
  CASCADE is one statement, FK-safe, and covers future tables automatically.
- *Trade-off:* it's PostgreSQL-specific (the project only uses PostgreSQL), and it wipes every table in
  the schema, so a future migration-history table (for example Flyway) would have to be excluded.
- The endpoint returns 409 while `DataRepository.getAlgorithmRunning()` is true. This flag is set at
  the start and end of `algorithmLoop()`.

### D6 — Demo data as classpath resources
Move `script/fakerGeneration/csvOutput/{teachers,rooms,classSubjects}.csv` and
`leo-planer/src/files/csvFiles/test1/testSubject.csv` into
`leo-planer/src/main/resources/demo-data/`. `CSVManager` gets an overload that
reads from an `InputStream`/classpath resource. The faker script's default
output folder is changed to that resources folder so regenerated data lands
in the right place.
- The existing `run/testCsvOriginal`, `run/testCsvNew` endpoints and the other
  test files under `src/files/csvFiles/test1/` stay in place for the existing
  unit tests (`TestCSV`), but `index.ts` no longer calls them.

### D7 — Excel files without `src/files`
- **Export:** `ExcelManager.createBaseDataWorkbook()` writes the workbook to a
  `ByteArrayOutputStream` (or streams it directly as a `StreamingOutput`)
  instead of `src/files/excelFiles/export/test1.xlsx`.
- **Upload:** the uploaded stream is read into memory
  (`WorkbookFactory.create(InputStream)`), with no archive copy on disk.
  Uploads are small (school master data), so memory use is negligible.
- `importAll()` / `test-import`, which read the fixed `test1.xlsx`, are
  unused by the frontend. They keep working locally and are not made
  cloud-safe.
- *Alternative:* a configurable directory backed by an `emptyDir` volume. It
  needs more config and the archive would be lost on restart anyway. Rejected.

### D8 — Schema generation per profile
```
quarkus.hibernate-orm.database.generation=update
%dev.quarkus.hibernate-orm.database.generation=drop-and-create
%test.quarkus.hibernate-orm.database.generation=drop-and-create
```
Local behaviour stays identical. Prod keeps data across pod restarts.
- *Risk:* `update` can't handle every schema change (renamed columns, changed
  types). For a demo, the documented fix is to reset in the cloud, or to delete
  the Postgres PVC (see DEPLOY.md). Flyway migrations are a later option.

### D9 — Health checks
Add `quarkus-smallrye-health`. It provides `/q/health/live` and
`/q/health/ready`, and the readiness check automatically includes the
datasource. The probes use these endpoints, and a `startupProbe` gives the
JVM time to boot.

### D10 — Kubernetes manifests (`k8s/`)
```
k8s/
├── secret.template.yaml   DB user/password; copy to secret.yaml (gitignored), fill in, apply
├── postgres.yaml          PVC (1Gi) + Deployment (postgres:16-alpine, 1 replica, strategy Recreate) + Service "postgres"
├── leo-planer.yaml        Deployment (1 replica, strategy Recreate, requests/limits, probes, env from Secret) + Service
└── ingress.yaml           host placeholder → Service leo-planer:8080
```
- Postgres runs as a Deployment with `Recreate` rather than a StatefulSet:
  it's simpler to read and sufficient for a single instance.
- `Recreate` is also used for the backend, so there are never two replicas
  holding algorithm state at the same time.
- Starting resources: backend requests 250m CPU / 512Mi, limit 1 CPU / 1Gi.
  Postgres requests 100m / 256Mi. These get tuned after observing them on
  LeoCloud.
- The image is referenced as `ghcr.io/lucaa0312/leoplaner:<tag>` with an
  explicit tag, not `latest`.
- The Ingress needs no TLS configuration, because LeoCloud terminates HTTPS
  for its subdomains. The WebSocket passes through the Ingress on the same path.
- Every block gets a short comment explaining what it does.

### D11 — CORS
Once the frontend is served from Quarkus, the cloud setup is same-origin.
`quarkus.http.cors.origins=*` stays as it is, because the Python-server setup
still needs cross-origin requests.

### D12 — One import for Excel and the real school data, detected by content
The real school data (merged from `main`) is read from `src/files/...`
(`GpuImporter.SUBJECTS_PATH`/`LESSONS_PATH`, `TimetableExportImporter.WISHES_PATH`,
`Resource.TIMETABLE_EXPORT_PATH`). Those files don't exist in the container and
must not be baked into the image, because the ghcr package is public and the
files hold real teacher data. So they are uploaded through the existing import
button, which accepts several files at once.
- **Endpoint:** `POST /api/import`, `multipart/form-data`, one or more files.
  The backend detects each file's type **by content**, not by name or MIME
  type (browsers report `.TXT`/`.sql` inconsistently):

  | Type | Signal |
  |---|---|
  | Excel | ZIP magic bytes `PK\x03\x04` |
  | Timetable SQL export | contains `CREATE TABLE [dbo].[Teachers]` |
  | Wishes JSON | parses as JSON with a `wishes` array |
  | GPU006 (subjects) | `;`-separated, first field a quoted text |
  | GPU002 (lessons) | `;`-separated, first field a plain number |

  The GPU files are Windows-1252, so detection uses the existing
  `GpuImporter.parse` / `TimetableExportImporter.decode` and never assumes UTF-8.
- **Allowed combinations:** one Excel file alone → Excel import (unchanged
  logic). SQL + GPU006 + GPU002, optionally + wishes JSON → school import, in
  the fixed order teachers → subjects/rooms/classes/lessons →
  `randomizeSchoolSchedule()`, the same as `run/importSchoolData`. Anything else
  (a file missing, a type twice, Excel mixed with school files, an unknown file)
  → 400 **before anything is written**.
- **The wishes JSON is optional.** It is an AI translation of the free-text
  wishes in the SQL export, made once offline and matched by teacher id + text
  hash. Without it, teachers still get their blocked hours (`Reservations`) and
  all wishes are reported as not applied. It is not an error.
- **Response:** always lists every file with the type it was recognized as, so
  the user can see the files themselves are fine when the *combination* is
  wrong. On success it contains the import counts and the unmapped wishes.
  All user-facing texts are German.
- **`run/importSchoolData` stays as a dev shortcut** (reads `src/files`), but
  answers 403 unless `leoplaner.reset-enabled` is on (the D4 dev flag), so it
  can't be triggered on the cloud.
- *Alternative:* one endpoint + button per file type. The files depend on each
  other (the lessons need the subjects and teachers), so the user would have to
  know the order. Rejected.
- *Alternative:* detection in the frontend. It can't be unit-tested with the
  existing JUnit setup and would duplicate the parsers. Rejected; the frontend
  only relaxes its extension/MIME check.

## Risks / Trade-offs

- [Anyone who can reach the cloud URL can upload Excel files and trigger the
  algorithm, because there is no auth.] → Accepted for a school demo. The
  destructive actions (reset, demo data) are disabled in prod.
- [The port heuristic misfires if someone serves the frontend on port 8080
  with Python.] → Documented. Python servers default to 8000.
- [`update` schema drift after entity changes.] → Reset or delete the PVC, as
  described in DEPLOY.md.
- [ghcr packages are private by default, so the image pull fails with
  `ImagePullBackOff`.] → DEPLOY.md explains how to make the package public. An
  `imagePullSecret` is mentioned as the alternative.
- [LeoCloud quota limits are unknown.] → Start with modest requests and check
  with `kubectl describe quota` or the dashboard.
- [Deleting the namespace or PVC destroys all data immediately.] → DEPLOY.md
  warns about it and shows `kubectl cp` / `pg_dump` for backups.
- [Removing auto-seed changes local behaviour.] → Called out in the proposal
  as BREAKING. The "Demodaten laden" button replaces it.

## Migration Plan

1. Implement on branch `feature/leocloud-deployment`. Verify the local workflow
   (DB compose + `quarkus:dev` + Python server) still works.
2. Build the production image locally and run it with `docker run` against the
   compose Postgres as a smoke test.
3. Test the full manifests on minikube, as LeoCloud requires.
4. Manual push to ghcr.io, make the package public, `leocloud auth login`,
   `kubectl apply -f k8s/`.
5. **Rollback:** set the Deployment image to the previous tag
   (`kubectl set image ...`) or `kubectl delete -f k8s/leo-planer.yaml`. The
   Postgres PVC is not touched by the rollback.
6. **Follow-up change:** a CI step that builds and pushes the image on `main`.

## Open Questions

- The Excel import only adds rows, so importing into a database that already
  has data creates duplicates. D12 doesn't change that. Whether the import
  should require an empty database (like "Demodaten laden") is left for a
  later change.

- The exact Ingress hostname or path pattern LeoCloud assigns. Read it from
  `leocloud get template nginx` / `kubectl describe ingress` and fill the
  placeholder in `ingress.yaml`. This doesn't affect the code, because of D3.
- Whether LeoCloud needs a specific `ingressClassName` or annotations (for
  example a WebSocket timeout). Copy them from the nginx template once it's
  available.
