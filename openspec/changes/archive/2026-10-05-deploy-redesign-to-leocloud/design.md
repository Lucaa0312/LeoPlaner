# Design

## Context

- LeoCloud currently runs `ghcr.io/lucaa0312/leoplaner:0.1.0`, built from `main` (old frontend).
- The redesign is on `origin/ultimate_design` (`1d7f92e`). It contains `main`, with 0 commits behind.
  - `tsc` and `mvn test` pass there: 83 tests, 0 failures, 23 skipped.
  - A local `0.2.0` container served all pages, reset and demo data.
- `Dockerfile.prod` builds from the repository root and copies `index.html`, `web/pages`, `web/style`,
  `web/assets`, compiles `web/src`, and builds the backend from `leo-planer/src`.
- Docker needs `sudo`, so the user runs `docker build/push` and `kubectl`.

**How an optimisation run works today, and why progress gets lost:**

```
Backend (SimulatedAnnealingAlgorithm.algorithmLoop)
  automatic mode: cool to 0.1 → reheat once → cool to 0.1 → pauseAlgorithm() → loop ends
  emits {iteration, temperature, currentCost, finished} every 50 ms; keeps a sampled history

Browser tab that pressed Start (optimierung.ts)
  rounds {n, sinceGain, startedAt, lens}  memory only
  eta {fromX, base, shown}                memory only  → the progress bar
  inControl                               memory only
  on "finished": continueRounds() → send "temperature:8" + "resume" → next round
  "Fertig" → localStorage, tied to the history length
```

Reloading or leaving the page drops `rounds`, `eta` and `inControl`, which causes four problems:
- The bar restarts at 0 % from the current iteration.
- The round label disappears.
- No tab sends the next "resume", so the run stops after the current round and shows "Angehalten".
- Another device never sees "Fertig", because that state is only in `localStorage`.

## Goals / Non-Goals

**Goals:**
- The hosted demo shows Andi's redesign with working reset and demo-data buttons. These survive a
  re-apply of the manifest.
- Optimisation progress is correct at all times: after a reload, after switching pages, after a
  reconnect, and on other devices.
- A permanent header button on Optimierung leads to Ergebnis.

**Non-Goals:**
- Merging `ultimate_design` (or the fix branch) into `main`. Reviewing the rest of the redesign.
- A progress indicator on the other pages (navigation). The run keeps going while they are open, and
  returning to Optimierung shows the correct state.
- Several runs in parallel or per-user runs. There is one server and one run, as today.
- Keeping run state across a backend restart. The schedule itself isn't kept across a restart either.
- Auth or any other protection for the admin actions. Automatic deployment.

## Decisions

1. **Move the Einfach rounds from the browser to the server.** After automatic mode's pause point,
   `algorithmLoop` decides whether to continue, with the same rules as the frontend today:
   - reheat to 8,
   - finish after 3 rounds without gain (gain ≥ max(2, 0.1 % of the best cost)),
   - 15-minute limit.

   *Alternative:* keep the driver in the browser, store `rounds`/`eta` in `localStorage`, and run the
   driver on every page through `shell.ts`. Rejected because it still breaks with another device or a
   closed tab, needs tab-leadership logic, and the comment in `optimierung.ts` already lists this as a
   known gap.

2. **One server-side `RunState` that owns progress.**
   - Fields: `status`, `mode`, `round`, `roundsWithoutGain`, `startedAt`, `progress`, `etaSeconds`,
     `finishReason`, `bestCost`.
   - The progress estimate moves from `optimierung.ts` (`estimate()`) to Java, unchanged:
     - iterations left are derived from the temperature and the fixed cooling rate,
     - plus the expected remaining rounds,
     - converted to time with the measured iterations per second.
   - The server clamps progress so it never goes down: `max(previous, base + (1 − base) · own)`,
     capped at 0.99 until finished.

   *Alternative:* send only raw facts and let every client compute the bar. Rejected because each
   client would start its "never backwards" memory at a different point, so two devices would show
   different values.

3. **Send state in two ways: `GET /api/algorithm/status` for the initial load and reconnects, and the
   same fields in every WebSocket progress message.** The page renders whatever arrived last.
   Pause/resume/start keep their current endpoints and messages. *Alternative:* WebSocket only, with
   a state message sent on connect. That also works, but REST is easier to test and lets other pages
   read the state later.

4. **The frontend becomes a pure view of the run state.**
   - Remove `rounds`, `continueRounds`, `eta`/`estimate`, `inControl`, `startKicked`, and the
     `leoplaner.finished` record in `localStorage`.
   - Mode stays a user preference in `localStorage` (`leoplaner.mode`), but it is sent to the server
     at start and resume, and the server reports the mode back. This replaces the guessing in
     `checkAutomatic` and `believedAutomatic`.
   - The chart and history rebuild stay as they are.

5. **Header button.**
   - An `<a class="btn btn-glass" href="./ergebnis.html">` next to the primary button in
     `optimierung.html`.
   - Its label depends on the state: "Zwischenstand ansehen" while running, "Ergebnis ansehen"
     otherwise.
   - It shows as disabled (`aria-disabled`, no `href`, tooltip "Noch kein Plan, zuerst die
     Optimierung starten") when there is no data or no run yet.
   - The existing card and side-panel links stay.

6. **Where the code lives.**
   - A local branch `leocloud-demo-fixes`, created from `origin/ultimate_design` in the worktree
     `../leoplaner-ultimate`. All backend and frontend fixes are committed there, as the user.
   - Image `0.2.0` is built from that branch.
   - On `main`, only `k8s/leo-planer.yaml`, `DEPLOY.md` and this change.
   - *Alternative:* commit directly onto `ultimate_design`. Rejected because it rewrites Andi's branch
     without his review.

7. **Admin flags: on in `k8s/leo-planer.yaml` (committed on `main`), backend default stays off.** A
   `kubectl apply` from `main` then keeps both the flags and the image, and the `data-management` spec
   (production default off) stays valid.

## Risks / Trade-offs

- [The server-side round logic behaves differently from Andi's client version] → The same constants
  are ported, and tests cover finish-after-no-gain, the time limit, user pause, and progress never
  going down.
- [A long run blocks the `GET /run/algorithmAllClasses` request until it ends, now longer than
  before] → The frontend already does not await it. Rounds now continue inside the same loop thread,
  so no new request is needed between rounds.
- [`AlgorithmProgressDTO` gains fields, so the old pages break] → They read only `iteration`,
  `temperature`, `currentCost` and `finished`, which are unchanged. The JSON only gains keys.
- [The estimate is a lower bound, and another round can make "time left" jump up] → Accepted, as
  today. Only the bar is guaranteed never to go backwards.
- [Anyone with the demo URL can wipe the data] → Accepted for demo data. Never import real school data
  while the flags are on.
- [The deployed image differs from `main` until the redesign and fixes are merged] → The source branch
  and commit are written in the manifest comment and in `DEPLOY.md`.

## Migration Plan

1. Implement on `leocloud-demo-fixes` → `tsc`, `mvn test`, then a browser test of reload, page switch
   and second tab.
2. Build `0.2.0` from that branch, run the local container check, push.
3. `kubectl apply -f k8s/leo-planer.yaml`, then a smoke test on it220219.

**Rollback:** set the image back to `0.1.0` and remove the two env vars, then `kubectl apply`.

## Open Questions

- Should `leocloud-demo-fixes` be pushed to GitHub so Andi can merge the fixes into `ultimate_design`?
  This doesn't affect the image or the deploy, so it can be decided after the demo.
