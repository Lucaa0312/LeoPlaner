# Proposal

## Why

Our teacher requires LeoPlaner to run in the school's Kubernetes cloud (LeoCloud),
but the project can currently only run on a developer's laptop: the frontend
hardcodes `http://localhost:8080`, the backend image runs Quarkus dev mode,
files are read/written at paths relative to the source tree, and there are no
Kubernetes manifests. At the same time, this sprint we start importing real
school data, and the landing page re-seeds fake CSV data on every page load
with no way to clear the database — so data is duplicated and real and fake
data get mixed.

## What Changes

- **Frontend API base URL** is resolved at runtime instead of hardcoded:
  when served from Quarkus (cloud or `localhost:8080`) it uses the page's own
  origin (`/api`, `ws(s)://<host>/api/...`); when served from any other port
  (e.g. the Python dev server) it falls back to `http://localhost:8080/api`.
  All ~20 hardcoded URLs go through one shared helper.
- **BREAKING (local behaviour):** opening `index.html` no longer seeds fake
  data automatically. Demo data is loaded explicitly via a "Demodaten laden"
  action.
- **New reset endpoint** that deletes all school data (teachers, rooms,
  subjects, classes, class-subjects, timetables, history).
- **Reset and demo-data actions are enabled only in the Quarkus `dev` profile**
  by default; in `prod` (the cloud image) they are disabled and hidden in the
  UI, and can be enabled temporarily by an operator via an environment
  variable.
- **Demo CSV files become classpath resources** so they are found no matter
  where the app runs (fixes `../script/...` and `src/files/...` paths).
- **Excel upload/export no longer write to `src/files/...`**; they use a
  configurable writable directory (or in-memory streams).
- **Database schema strategy per profile:** `dev` keeps `drop-and-create`
  (same as today), `prod` uses `update` so cloud data survives pod restarts.
- **Production container image:** a new multi-stage Dockerfile that builds the
  backend and bundles the compiled frontend into Quarkus's static resources.
  The existing dev `Dockerfile` stays unchanged.
- **Health endpoints** via `quarkus-smallrye-health` for Kubernetes probes.
- **Kubernetes manifests** in `k8s/` (Postgres with PVC, Secret template,
  backend Deployment + Service, Ingress), heavily commented.
- **`DEPLOY.md`** documenting the manual build → push (ghcr.io) → minikube →
  LeoCloud steps, and how to toggle the reset flag on the cloud.

Unchanged: `database/docker-compose.yaml`, `./mvnw quarkus:dev`, serving the
frontend with a Python server.

## Capabilities

### New Capabilities
- `data-management`: resetting all school data and loading demo data, gated by
  a profile-dependent feature flag exposed to the frontend.
- `cloud-deployment`: running LeoPlaner as a production container on
  Kubernetes (image, runtime URL resolution, health checks, persistence,
  manifests, deploy documentation).

### Modified Capabilities
- `web-interface`: the landing page no longer seeds data on load; the
  dashboard gains "Daten zurücksetzen" and "Demodaten laden" actions that are
  only shown when the backend reports them as enabled.

## Impact

- **Backend:** `boundary/Resource.java` (seed endpoints, upload/export paths),
  `data/ExcelManager.java`, `data/CSVManager.java`, `data/DataRepository.java`
  (new delete-all), new resource for reset/feature flags,
  `application.properties`, `pom.xml` (+ `quarkus-smallrye-health`).
- **Frontend:** `web/src/ts/utils/apiHelpers.ts`, `api/uploadApi.ts`,
  `api/downloadApi.ts`, `pages/index.ts`, `pages/dashboard.ts`,
  `pages/graph.ts`, `pages/timetable.ts`; rebuilt `web/dist`.
- **New files:** `leo-planer/Dockerfile.prod` (name tbd in design), `k8s/*.yaml`,
  `DEPLOY.md`, demo CSVs under `leo-planer/src/main/resources/`.
- **Scripts:** `script/fakerGeneration` output location changes to the new
  resources folder.
- **Out of scope / known issues:** `devops/docker-compose.yaml` (reported as
  not working; not used by this change), CI image push (planned as a follow-up
  after the first manual push), authentication, actually deploying to the
  cluster (done manually by the team).
