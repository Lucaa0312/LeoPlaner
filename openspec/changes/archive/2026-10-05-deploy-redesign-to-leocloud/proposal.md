# Proposal

## Why

The LeoCloud deployment (it220219) only exists to show LeoPlaner to the teacher. It still runs the old
frontend (image `0.1.0`), and the reset and demo-data buttons are hidden because the admin flags are
off in the cloud. Andi's redesign (`ultimate_design`, #154) is finished, and it already includes those
buttons. Restoring a clean demo should be one click, without needing `kubectl set env` each time.

A local test of the redesign found two problems that should be fixed before the demo:

- **The optimisation progress is not persistent.** In Einfach mode the progress bar, the round counter
  and the logic that starts the next round only live in the browser tab that pressed Start. Reloading,
  opening Ergebnis, or watching from another device makes the bar jump back to 0 %. Worse, the next
  round is never started, so the run stops early and shows "Angehalten" instead of "Fertig".
- **There is no permanent way from Optimierung to Ergebnis.** The links only appear in some states,
  inside the status card or side panel.

## What Changes

- **Optimisation progress kept on the server:**
  - Einfach mode runs its rounds on the server, until rounds stop paying off (3 rounds without gain)
    or the time limit is reached. This works with no browser open.
  - The server tracks the run: running, paused or finished, the round number, the progress (0–100 %,
    never moving backwards within a run), the estimated time left, and why the run finished.
  - This state is sent with every progress message and is also available on request, so a page that
    loads in the middle of a run starts from the right state.
- **Optimierung page:**
  - The bar, round counter and "Fertig" state come only from the server's state, so they look the same
    after a reload, after switching pages and on every device.
  - A permanent "Ergebnis ansehen" button in the page header leads to the Ergebnis page.
- **Ergebnis page:** the timetable shows every hour. 11 hours fill the panel, and later ones are
  reached by scrolling, with the day names staying on top.
- **Import page:** the import report no longer lists the "Hinweise" (skipped lessons, missing wish
  file). "Nicht lösbar" errors are still shown.
- **Deploy:**
  - The redesign plus these fixes are built into a new production image
    `ghcr.io/lucaa0312/leoplaner:0.2.0`, from a branch based on `origin/ultimate_design`. The branch is
    not merged into `main`.
  - `LEOPLANER_RESET_ENABLED` and `LEOPLANER_DEMO_DATA_ENABLED` are turned on permanently in the
    LeoCloud deployment manifest.
  - The manifest points at image `0.2.0`, so a later `kubectl apply` keeps the new design and the flags.
  - The manifest sets `QUARKUS_HTTP_STATIC_RESOURCES_MAX_AGE=0S`. Quarkus' default lets browsers keep
    pages, scripts and styles for 24 hours without asking, so the new design stayed invisible after
    the deploy until a forced reload.
- **`DEPLOY.md`:** says the cloud instance is a demo with the admin actions on, how to switch them off,
  and which branch `0.2.0` is built from.
- **Backend defaults:** unchanged. The production image itself still starts with both flags off.

## Capabilities

### New Capabilities

- `optimization-run`: the server-side lifecycle of an optimisation run. This covers Einfach rounds,
  progress, time left, finish reason and reading the current run state.

### Modified Capabilities

- `cloud-deployment`: the Kubernetes manifest now turns on the reset and demo-data admin actions
  permanently (demo instance), instead of documenting a temporary `kubectl set env` switch.
- `web-interface`: the optimisation page shows persistent progress from the server and has a permanent
  link to the result page.

## Impact

- **Backend, on the deploy branch:**
  - `SimulatedAnnealingAlgorithm`: round handling in automatic mode, and a run-state object.
  - `AlgorithmProgressDTO` and the `Socket` progress message gain fields.
  - New `GET /api/algorithm/status`.
  - New tests.
- **Frontend, on the deploy branch:**
  - `web/src/ts/pages/optimierung.ts`: removes the round driver, `eta` and the "finished" record in
    `localStorage`, and renders the server state instead.
  - `web/pages/optimierung.html`: the header button.
  - `web/src/ts/api/algorithmApi.ts`: the new fields and endpoint.
- **On `main`:**
  - `k8s/leo-planer.yaml`: image tag `0.1.0` → `0.2.0`, two env vars added, comment updated.
  - `DEPLOY.md`: the admin-actions sections and the build source of `0.2.0`.
- **Container registry:** new tag `0.2.0` on ghcr.io. The user runs `sudo docker build/push` and `kubectl`.
- **Hosted demo:** anyone with the URL can wipe the data and reload demo data. This is accepted because
  the instance only holds demo data.
- **Andi's branch:** these fixes change it. They live on a separate branch so Andi can review and take
  them over.
