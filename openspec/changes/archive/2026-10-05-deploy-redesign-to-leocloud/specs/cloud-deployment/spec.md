# Spec Delta

## MODIFIED Requirements

### Requirement: Kubernetes manifests and deploy documentation
The repository SHALL contain Kubernetes manifests that deploy, into a single
namespace, a PostgreSQL database with a persistent volume, a Secret holding
the database credentials (committed only as a template without real values),
the LeoPlaner backend as exactly one replica with resource requests/limits and
health probes, and an Ingress exposing it. Because the LeoCloud deployment is a
demo instance, the backend manifest SHALL enable the reset and demo-data admin
actions (`LEOPLANER_RESET_ENABLED=true`, `LEOPLANER_DEMO_DATA_ENABLED=true`).
The production image defaults SHALL stay unchanged (both off). The repository
SHALL contain a deploy guide describing the build, push, minikube test, and
LeoCloud deploy steps, stating that the admin actions are enabled in the cloud,
and how to disable them.

#### Scenario: Deploy to minikube
- **WHEN** a team member follows the deploy guide against minikube
- **THEN** the application is reachable through the Ingress and the dashboard loads data from the backend

#### Scenario: No real secrets in the repository
- **WHEN** the repository is searched for the manifests' Secret
- **THEN** only a template with placeholder values is found

#### Scenario: Admin actions available on the demo deployment
- **WHEN** the backend is deployed with the repository's manifest
- **THEN** `GET /api/admin/features` returns `resetEnabled: true` and `demoDataEnabled: true`
- **AND** the frontend shows the "Daten zurücksetzen" and "Demodaten laden" actions

#### Scenario: Restoring a clean demo
- **WHEN** a user on the hosted deployment resets all data and then loads demo data
- **THEN** the database contains exactly the demo data set

#### Scenario: Re-applying the manifest keeps the flags
- **WHEN** an operator runs `kubectl apply -f k8s/leo-planer.yaml` again
- **THEN** the admin actions remain enabled and the configured image version is unchanged
