# Tasks

## 1. Prepare the redesign source

- [x] 1.1 `git fetch origin` and create a worktree of `origin/ultimate_design`. Verify that `git -C <worktree> rev-parse --short HEAD` prints `1d7f92e`, or note the newer commit if Andi pushed more.
- [x] 1.2 In the worktree, run `npm ci && npx tsc` in `web/`. Verify it exits with 0 and no type errors.
- [x] 1.3 In the worktree, run `./mvnw test` in `leo-planer/` (the user starts the DB if tests need it). Verify all tests pass. If anything fails, stop and report instead of patching the branch.
- [x] 1.4 In the worktree `../leoplaner-ultimate`, create the branch `leocloud-demo-fixes` from `origin/ultimate_design`. Verify with `git -C ../leoplaner-ultimate branch --show-current`.

## 2. Manifest and docs on main

- [x] 2.1 `k8s/leo-planer.yaml`: set the image to `ghcr.io/lucaa0312/leoplaner:0.2.0` with a comment naming the source branch and commit. Add `LEOPLANER_RESET_ENABLED: "true"` and `LEOPLANER_DEMO_DATA_ENABLED: "true"`, and replace the "off in the cloud" comment. Verify with `kubectl apply --dry-run=client -f k8s/leo-planer.yaml`.
- [x] 2.2 `DEPLOY.md`: rewrite "Resetting / loading demo data in the cloud" (demo instance, flags on via the manifest, how to switch them off, never import real data while on) and the note that the buttons only exist in dev mode. Verify by reading that no "off in the cloud" statement remains.
- [x] 2.3 Run `openspec validate deploy-redesign-to-leocloud --strict` and verify it passes.
- [x] 2.4 Change the source in the manifest comment and in `DEPLOY.md` from `ultimate_design@1d7f92e` to `leocloud-demo-fixes@<commit>`, including the build-from-branch commands. Verify with `grep -n "0.2.0" k8s/leo-planer.yaml DEPLOY.md`.

## 3. Server-side run state (backend, on leocloud-demo-fixes)

- [x] 3.1 Add a `RunState` (status, mode, round, roundsWithoutGain, startedAt, progress, etaSeconds, finishReason, bestCost), owned by `SimulatedAnnealingAlgorithm`, and reset it on randomize/fresh start. Verify with a unit test that a new instance is `idle` with progress 0.
- [x] 3.2 Move the Einfach rounds into `algorithmLoop`: after the automatic-mode pause point, decide whether to continue (reheat to 8, finish after 3 rounds without gain ≥ max(2, 0.1 % of best), 15-minute limit). A user pause sets `paused` and starts no round. Verify with tests using a small schedule and a short time limit (finished with "no further gain", finished with "time limit", paused after a user pause).
- [x] 3.3 Port the progress estimate from `optimierung.ts` (`itersToCold`, `loopIters`, expected remaining rounds, measured rate) and clamp it so it never goes down. Set progress to 1 when finished, continue from the old value when resuming a paused run, and start at 0 when resuming a finished run. Verify with a test that collects all progress values of a run and checks they never decrease and end at 1.
- [x] 3.4 Add the run-state fields to `AlgorithmProgressDTO` and the `Socket` JSON, keeping `iteration`, `temperature`, `currentCost` and `finished` unchanged. Add `GET /api/algorithm/status`, and accept the mode at start and resume. Verify with a REST-assured test: `idle` before a run, `running`/`finished` around a short run, with the same fields as the WebSocket message.
- [x] 3.5 Run `./mvnw test`. Verify all tests pass (the earlier 83, plus the new ones).

## 4. Optimierung page (frontend, on leocloud-demo-fixes)

- [x] 4.1 `algorithmApi.ts`: add the run-state type, `status()`, and the new progress fields. Send the mode at start and resume instead of toggling. Verify with `npx tsc`.
- [x] 4.2 `optimierung.ts`: remove `rounds`, `continueRounds`, `eta`/`estimate`, `inControl`, `startKicked`, `checkAutomatic` and the `leoplaner.finished` record. On load and on reconnect, read `status()`. Render the status, round, bar, time left and "Fertig" text only from the run state. Verify with `npx tsc` and `grep -n "rounds\.\|FINISHED_KEY\|inControl" web/src/ts/pages/optimierung.ts` returning nothing.
- [x] 4.3 `optimierung.html` + `optimierung.ts`: add the header button next to the primary button. It reads "Zwischenstand ansehen" while running and "Ergebnis ansehen" otherwise, and is disabled with a hint when there is no plan. Verify in the browser for the idle, running and finished states.
- [x] 4.4 Browser test against `quarkus:dev` (or the local container) in Einfach mode: start, then reload at about 30 % (the bar and round label are restored); go to Ergebnis and back (the run has continued); open a second tab (same values); wait for "Fertig", then reload ("Fertig" and a full bar); restart the WebSocket connection (no reset to 0). Verify that all of these hold and that the console shows no errors.
- [x] 4.6 `import.ts`: remove the "Hinweise" list (and the "keine Hinweise" line) from the import report, keep "Nicht lösbar". Verify with `npx tsc` and by reloading the Import page after an import.
- [x] 4.7 Mode switching: Erweitert keeps the bar still (no end to estimate), and switching back to Einfach continues from there. The page ignores mode messages that were already on their way for 2 s after a switch. Verify with `RunStateTest` (erweitertDoesNotFillTheBar, backToEinfachGoesOnFromTheBar) and a real run with 4 switches that still finishes.
- [x] 4.8 `ergebnis.ts`/`ergebnis.css`: show all hours, size the rows so 11 fill the panel, scroll the grid with a sticky day header, and print every hour. Verify in the browser with lessons up to hour 14 (hour 14 reachable, header stays).
- [x] 4.5 Commit the backend and frontend changes on `leocloud-demo-fixes` as the user. Verify with `git -C ../leoplaner-ultimate log --oneline origin/ultimate_design..HEAD`.

## 5. Build, push, deploy (commands run by the user)

- [x] 5.1 From the worktree root: `sudo docker build -f leo-planer/Dockerfile.prod -t ghcr.io/lucaa0312/leoplaner:0.2.0 .` (rebuilding over the earlier local `0.2.0`). Verify the build succeeds.
- [x] 5.2 Local container check: run the image against the local Postgres with both flags on. Verify that `/` shows the new landing page, that all pages and assets answer 200, that `/api/admin/features` and `/api/algorithm/status` respond, and that reset → demo data works.
- [x] 5.3 `sudo docker push ghcr.io/lucaa0312/leoplaner:0.2.0`. Verify the tag appears on ghcr.io.
- [x] 5.4 `kubectl apply -f k8s/leo-planer.yaml`. Verify that `kubectl rollout status deployment/leo-planer` finishes and that the pod runs image `0.2.0`.

- [x] 5.5 `k8s/leo-planer.yaml`: `QUARKUS_HTTP_STATIC_RESOURCES_MAX_AGE=0S` (the old design stayed cached in the browser for 24 h after the deploy), then `kubectl apply`. Verify that `curl -sI <host>/` shows `max-age=0` and that a conditional request answers 304.

## 6. Smoke test on it220219

- [x] 6.1 Open the hosted URL. Verify the new landing page and that the Übersicht, Lehrer, Räume, Fächer and Klassen pages load data.
- [x] 6.2 Reset → demo data on the hosted demo: not run in the cloud, because the cloud holds the real school data and the user decided to keep it there with the buttons on (2026-10-05). Reset → demo data were verified locally with the same image code (dev mode and container check).
- [x] 6.3 Start the optimisation, reload the page, switch to Ergebnis and back. Verify that the bar is never reset, that the run reaches "Fertig", and that a timetable is shown (WebSocket over `wss://` works).
- [x] 6.4 Commit the manifest, `DEPLOY.md` and the change on `main` as the user.
