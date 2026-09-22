# Spec Delta

## Purpose

Allows LeoPlaner to run as a production container on Kubernetes (LeoCloud)
while keeping the existing local development workflow working unchanged.

## ADDED Requirements

### Requirement: Runtime API base URL resolution
The frontend SHALL determine the backend base URL at runtime instead of using
a hardcoded host. When the page is served from port 8080 or from the default
HTTP/HTTPS port, the frontend SHALL use the page's own origin for REST calls
(`<origin>/api`) and for the algorithm progress WebSocket (`ws://` for `http:`
pages, `wss://` for `https:` pages). When the page is served from any other
port, the frontend SHALL use `http://localhost:8080/api` and
`ws://localhost:8080/api/...`. Every REST and WebSocket call in the frontend
SHALL use this resolution.

#### Scenario: Served by a local Python server
- **WHEN** the frontend is opened at `http://localhost:8000/index.html` and the backend runs via `./mvnw quarkus:dev`
- **THEN** all API requests go to `http://localhost:8080/api/...`
- **AND** the progress WebSocket connects to `ws://localhost:8080/api/algorithm/progress`

#### Scenario: Served from the cloud over HTTPS
- **WHEN** the frontend is opened at `https://<host>/` from the production container
- **THEN** all API requests go to `https://<host>/api/...`
- **AND** the progress WebSocket connects to `wss://<host>/api/algorithm/progress`

#### Scenario: No hardcoded hosts remain
- **WHEN** the frontend TypeScript sources are searched for `localhost:8080`
- **THEN** the only occurrence is the development fallback in the shared base-URL helper

### Requirement: Production container image
The project SHALL provide a production container image definition that builds
the backend in production mode and serves the compiled frontend (landing page,
pages, styles, assets, compiled JavaScript) from the same HTTP server as the
API. The image SHALL NOT run Quarkus dev mode and SHALL NOT expose a debug
port. The existing development Dockerfile SHALL remain unchanged.

#### Scenario: Frontend served from the image
- **WHEN** the production image is running and a browser requests `/`
- **THEN** the LeoPlaner landing page is returned
- **AND** the linked pages, styles and scripts load without errors

#### Scenario: Database configured from the environment
- **WHEN** the production image is started with `QUARKUS_DATASOURCE_JDBC_URL`, `QUARKUS_DATASOURCE_USERNAME` and `QUARKUS_DATASOURCE_PASSWORD` set
- **THEN** the backend connects to that database

### Requirement: Data persists across restarts in production
In production the database schema SHALL be created or updated on startup
without dropping existing data. In development the schema SHALL continue to be
dropped and recreated on each start, as today.

#### Scenario: Production restart
- **WHEN** data has been imported in the cloud and the backend pod restarts
- **THEN** the previously imported data is still present

#### Scenario: Development restart
- **WHEN** the backend is restarted with `./mvnw quarkus:dev`
- **THEN** the database starts empty

### Requirement: No writes into the source tree
The backend SHALL NOT read from or write to paths relative to the source tree
(`src/...`, `../script/...`) at runtime. Uploaded and exported Excel files
SHALL be handled via a configurable writable directory or in memory.

#### Scenario: Excel export in the container
- **WHEN** a user triggers "Daten exportieren" on the production deployment
- **THEN** an `.xlsx` file is downloaded

#### Scenario: Excel import in the container
- **WHEN** a user uploads a valid `.xlsx` file on the production deployment
- **THEN** the data is imported and the response status is 200

### Requirement: Health endpoints
The backend SHALL expose liveness and readiness health endpoints so that the
orchestrator can detect when the application is started, ready to receive
traffic, and whether it needs restarting. Readiness SHALL include database
connectivity.

#### Scenario: Ready with database
- **WHEN** the backend is running and the database is reachable
- **THEN** the readiness endpoint reports status UP

#### Scenario: Database unreachable
- **WHEN** the database is not reachable
- **THEN** the readiness endpoint reports status DOWN

### Requirement: Kubernetes manifests and deploy documentation
The repository SHALL contain Kubernetes manifests that deploy, into a single
namespace, a PostgreSQL database with a persistent volume, a Secret holding
the database credentials (committed only as a template without real values),
the LeoPlaner backend as exactly one replica with resource requests/limits and
health probes, and an Ingress exposing it. The repository SHALL contain a
deploy guide describing the build, push, minikube test, and LeoCloud deploy
steps, and how to temporarily enable the reset flag in the cloud.

#### Scenario: Deploy to minikube
- **WHEN** a team member follows the deploy guide against minikube
- **THEN** the application is reachable through the Ingress and the dashboard loads data from the backend

#### Scenario: No real secrets in the repository
- **WHEN** the repository is searched for the manifests' Secret
- **THEN** only a template with placeholder values is found

### Requirement: Local development workflow unchanged
Starting the database with `database/docker-compose.yaml`, the backend with
`./mvnw quarkus:dev`, and serving the frontend with a static Python HTTP
server SHALL continue to work without additional configuration.

#### Scenario: Existing local setup
- **WHEN** a developer runs `sudo docker compose up` in `database/`, `./mvnw quarkus:dev` in `leo-planer/`, and a Python HTTP server in the repository root
- **THEN** the frontend loads and all pages communicate with the backend as before
