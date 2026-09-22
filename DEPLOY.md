# Deploying LeoPlaner

## Local development (unchanged)

```bash
cd database && sudo docker compose up          # Postgres on 5432, Adminer on 8081
cd leo-planer && ./mvnw quarkus:dev             # backend on 8080
python3 -m http.server 8000                     # in the repo root, then open http://localhost:8000
```

The frontend finds the backend automatically: served from port 8080 (Quarkus / cloud) it uses its own
address, served from any other port it uses `http://localhost:8080`.

After changing TypeScript: `cd web && npm run build`.

**Data:** opening the page no longer loads fake data. On the dashboard:

- **Demodaten laden**: loads the demo data from `leo-planer/src/main/resources/demo-data/` (only into an empty DB)
- **Daten zurücksetzen**: deletes everything (teachers, rooms, subjects, classes, timetables)

Both buttons only exist in dev mode (`quarkus:dev`). In the cloud they are hidden and the endpoints
answer `403`. Restarting `quarkus:dev` still empties the database, as before.

To regenerate demo data: `python3 script/fakerGeneration/generateMultipleClasses.py` (writes directly into
the `demo-data` folder).

## How the cloud setup looks

```
browser ──https──▶ Ingress ──▶ Service leo-planer:8080 ──▶ Pod leo-planer (backend + frontend)
                                                              │ jdbc
                                                              ▼
                                         Service postgres:5432 ──▶ Pod postgres ──▶ PVC postgres-data
```

| File | Content |
|---|---|
| `leo-planer/Dockerfile.prod` | production image (frontend build + Quarkus build + small JRE image) |
| `k8s/secret.template.yaml` | template for the database password |
| `k8s/postgres.yaml` | database + persistent volume |
| `k8s/leo-planer.yaml` | the app (1 replica, health checks, CPU/memory limits) |
| `k8s/ingress.yaml` | public HTTPS address |

## 1. Build the image

From the **repository root**:

```bash
TAG=0.1.0        # new tag for every version
sudo docker build -f leo-planer/Dockerfile.prod -t ghcr.io/lucaa0312/leoplaner:$TAG .
```

Quick test against the local compose database (start `database/` first, stop `quarkus:dev`):

```bash
sudo docker run --rm --network host \
  -e QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://localhost:5432/demo \
  -e QUARKUS_DATASOURCE_USERNAME=demo -e QUARKUS_DATASOURCE_PASSWORD=demo \
  ghcr.io/lucaa0312/leoplaner:$TAG
# open http://localhost:8080  (admin buttons must NOT be visible here, this is prod mode)
```

## 2. Push to ghcr.io

1. GitHub → Settings → Developer settings → Personal access tokens → **classic** token with `write:packages`.
2. Log in and push:
   ```bash
   echo <TOKEN> | sudo docker login ghcr.io -u Lucaa0312 --password-stdin
   sudo docker push ghcr.io/lucaa0312/leoplaner:$TAG
   ```
3. **Once:** GitHub → your profile → Packages → `leoplaner` → Package settings → Change visibility → **Public**.
   Otherwise the cluster cannot download the image (`ImagePullBackOff`).

## 3. Test on minikube first (required by the LeoCloud rules)

```bash
minikube start
minikube addons enable ingress
kubectl config use-context minikube

cp k8s/secret.template.yaml k8s/secret.yaml     # set a password in secret.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres.yaml -f k8s/leo-planer.yaml -f k8s/ingress.yaml
kubectl get pods -w                              # wait until both are Running and READY 1/1
kubectl port-forward service/leo-planer 8080:8080
# open http://localhost:8080
```

## 4. Deploy to LeoCloud

```bash
leocloud auth login                  # switches kubectl to the "leocloud" context
kubectl config current-context       # must say leocloud, NOT minikube
leocloud get template nginx          # look for the host in its Ingress
```

Put that host into `k8s/ingress.yaml` (replace `YOUR-HOST...`). Copy `ingressClassName` or annotations
from the template too, if it has any. Then:

```bash
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres.yaml -f k8s/leo-planer.yaml -f k8s/ingress.yaml
kubectl get pods -w
kubectl describe ingress leo-planer   # shows the public address
```

### Deploying a new version

Build and push with a new `TAG`, change `image:` in `k8s/leo-planer.yaml`, then
`kubectl apply -f k8s/leo-planer.yaml`.

### Rollback

```bash
kubectl set image deployment/leo-planer leo-planer=ghcr.io/lucaa0312/leoplaner:<old-tag>
```

The database is not affected by this.

## Resetting / loading demo data in the cloud

The admin actions are switched off in the cloud. To use them for a moment:

```bash
kubectl set env deployment/leo-planer LEOPLANER_RESET_ENABLED=true LEOPLANER_DEMO_DATA_ENABLED=true
# the pod restarts; reload the dashboard, the buttons are visible now, use them
kubectl set env deployment/leo-planer LEOPLANER_RESET_ENABLED- LEOPLANER_DEMO_DATA_ENABLED-
```

While switched on, **anyone** with the URL can use them, so switch them off right afterwards.

## Backups, and what destroys data

> **Deleting the PVC `postgres-data` or the namespace deletes the database immediately and forever.**
> There is no recovery, not even by the LeoCloud admins.

Backup:

```bash
kubectl exec deployment/postgres -- sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql
```

Restore into an empty database:

```bash
kubectl exec -i deployment/postgres -- sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' < backup.sql
```

In the cloud, the schema is only **updated** on startup (`update`), never dropped. If a changed entity
causes startup errors, use "Daten zurücksetzen" (see above), or as a last resort delete and recreate
the database volume:

```bash
kubectl delete -f k8s/postgres.yaml && kubectl apply -f k8s/postgres.yaml
```

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `ImagePullBackOff` | package not public, or wrong tag |
| pod `Running` but `0/1` ready | database not reachable, see `kubectl logs deployment/leo-planer` |
| `OOMKilled` / pod restarts | raise `limits.memory` in `k8s/leo-planer.yaml` |
| progress graph does not update | WebSocket blocked, check the Ingress annotations from the LeoCloud template |
| `Pending` pods | namespace quota full: `kubectl describe quota` |

## Not covered yet

- CI building and pushing the image automatically (planned follow-up)
- `devops/docker-compose.yaml` (known to be broken, not used here)
- The minikube run of these manifests has not been done yet. Do step 3 before the first LeoCloud deploy.
