// 2 Optimierung: the run, in words (Einfach) or as its cost curve (Erweitert). The timetable lives in step 3.
import { renderShell } from "../glas/shell.js";
import { el, icon, num, short, toast, reduceMotion } from "../glas/ui.js";
import { CostChart, HARD_COST, hardConflicts, isReheat } from "../glas/costChart.js";
import { algorithmApi, ProgressSocket, setAutomatic, noteAutomatic, believedAutomatic } from "../api/algorithmApi.js";
import { store } from "../glas/store.js";
import type { HistoryPoint, Progress, SocketStatus } from "../api/algorithmApi.js";

type State = "loading" | "offline" | "nodata" | "idle" | "starting" | "running" | "stopped";
type Mode = "einfach" | "erweitert";
/** one point on the chart: cumulative iteration across pause/resume segments */
type Pt = { x: number; t: number; c: number };

// The backend starts hot at 100 and cools towards ~0.002 (see SimulatedAnnealingAlgorithm).
const START_TEMPERATURE = 100;
const PHASE_IMPROVE = 20;   // below: "Verbessern"
const PHASE_POLISH = 1;     // below: "Feinschliff"

/*
 * Einfach runs in rounds. The backend's basic mode stops itself after one cooling pass (seconds on a
 * small school), which is far too early. So whenever it stops by itself, this tab warms the plan up
 * a little and lets it continue, until rounds stop paying off. If the tab is closed, the backend
 * still stops by itself, so nothing runs forever.
 */
const ROUND_REHEAT = 8;                       // warm enough to leave a local optimum, cool enough to keep the plan
const ROUNDS_WITHOUT_GAIN_TO_FINISH = 3;
const MIN_GAIN = (bestBefore: number): number => Math.max(2, bestBefore * 0.001);
const MAX_RUN_MS = 15 * 60 * 1000;

// ---------- state ----------
let state: State = "loading";
let mode: Mode = loadMode();
let zoom: "all" | "end" = "all";
let pts: Pt[] = [];
let offset = 0;          // added to raw iterations after the backend restarts its counter on resume
let lastRaw = -1;
let bestC = Infinity;
/** best cost since the backend last (re)started its loop: the backend only keeps this one (BACKEND_TODO #14) */
let keptBest = Infinity;
let improveX: number | undefined, polishX: number | undefined;
let lastEventAt = 0, lastEventIter = 0, rate = 0;
/** the backend's current loop: where it started (cumulative iteration) and whether it already reheated itself */
let loop = { x: 0, reheated: false };
let temperature = NaN;
let socketStatus: SocketStatus = "connecting";
let startTimer = 0;
/** true only in the tab that started/resumed the current run: other open tabs just watch */
let inControl = false;
let tempSentAt = 0;
let modeFixedAt = 0;
let milestones: { x: number; when: string; html: string; fresh?: boolean }[] = [];
/** Einfach rounds (only meaningful in the controlling tab) */
let rounds = { active: false, n: 0, sinceGain: 0, bestAtRoundStart: Infinity, startedAt: 0, userStopped: false,
  /** where the current round began, and how long the finished reheat rounds took (both in iterations) */
  startX: 0, lens: [] as number[] };
let finishedNote = "";
/*
 * "Fertig" only exists in this page: the backend just knows "not running". So the finished run is
 * remembered in the browser, tied to the history it ended with. Coming back to the page shows
 * "Fertig" again as long as the server still has exactly that history.
 */
const FINISHED_KEY = "leoplaner.finished";
type FinishedRecord = { note: string; len: number; iteration: number; cost: number };
function rememberFinished(): void {
  const note = finishedNote;
  algorithmApi.history().then((h) => {
    const l = h[h.length - 1];
    if (!l || finishedNote !== note) return;
    const rec: FinishedRecord = { note, len: h.length, iteration: l.iteration, cost: l.cost };
    try { localStorage.setItem(FINISHED_KEY, JSON.stringify(rec)); } catch {}
  }).catch(() => {});
}
function forgetFinished(): void { try { localStorage.removeItem(FINISHED_KEY); } catch {} }
function finishedFor(h: HistoryPoint[]): string {
  try {
    const r = JSON.parse(localStorage.getItem(FINISHED_KEY) ?? "null") as FinishedRecord | null;
    const l = h[h.length - 1];
    return r && l && r.len === h.length && r.iteration === l.iteration && r.cost === l.cost ? r.note : "";
  } catch { return ""; }
}
/** a start after any earlier stop ends at once on the server (BACKEND_TODO #15): we kick it once with "resume" */
let startKicked = false;

const shell = renderShell({ active: "optimierung", ownsStep: true });

// ---------- helpers ----------
function loadMode(): Mode {
  try { return localStorage.getItem("leoplaner.mode") === "erweitert" ? "erweitert" : "einfach"; } catch { return "einfach"; }
}
function saveMode(): void { try { localStorage.setItem("leoplaner.mode", mode); } catch {} }
const soft = (p: Pt): boolean => p.c < HARD_COST;
/** highest cost without a hard conflict: a start with conflicts is off the chart's scale */
const peak = (): Pt | undefined => pts.filter(soft).reduce<Pt | undefined>((m, p) => (!m || p.c > m.c ? p : m), undefined);
const first = (): Pt | undefined => pts[0];
/** what the trend and the "Kosten unter" milestones compare with: the first plan without hard conflicts */
const baseline = (): Pt | undefined => pts.find(soft) ?? pts[0];
const conflictsText = (c: number): string => { const n = hardConflicts(c); return `${n} ${n === 1 ? "harter Konflikt" : "harte Konflikte"}`; };
const last = (): Pt | undefined => pts[pts.length - 1];
/*
 * Phases: "Erkunden" until the plan first cools below PHASE_IMPROVE, then "Verbessern" through every
 * reheat. "Feinschliff" is only the last cool-down: from the first cold point (below PHASE_POLISH)
 * after the last reheat. While Einfach is running, another reheat can always follow, so it shows
 * once the run has stopped. Erweitert never reheats by itself, so there it shows live.
 */
function polishStart(): number | undefined {
  if (!(state === "stopped" || (state === "running" && mode === "erweitert"))) return undefined;
  // the backend reheats in the same step in which it pauses: a reheat on the last point has no cool-down after it
  let from = 0;
  for (let i = 1; i < pts.length - 1; i++) if (isReheat(pts[i - 1]!.t, pts[i]!.t)) from = i;
  return pts.slice(from).find((p) => p.t <= PHASE_POLISH)?.x;
}
function phaseAt(x: number): 0 | 1 | 2 {
  const pol = polishX;
  return pol !== undefined && x >= pol ? 2 : improveX !== undefined && x >= improveX ? 1 : 0;
}
function fmtTemp(t: number): string {
  if (!isFinite(t)) return "–";
  if (t < 0.0001) return "< 0,0001";
  return t >= 10 ? num(t) : t >= 0.01 ? t.toFixed(2).replace(".", ",") : t.toFixed(4).replace(".", ",");
}

// ---------- chart ----------
const plot = el("[data-plot]");
const chart = new CostChart(plot, el<HTMLCanvasElement>("[data-canvas]"), el("[data-tip]"),
  (p) => `<b>${num(p.c)}</b>${soft(p) ? "" : `${conflictsText(p.c)} · `}Iteration ${num(p.x)} · ${["Erkunden", "Verbessern", "Feinschliff"][phaseAt(p.x)]} · Temperatur ${fmtTemp(p.t)}`);

function resetData(): void {
  pts = []; shownGain = 0; offset = 0; lastRaw = -1; loop = { x: 0, reheated: false }; bestC = Infinity; keptBest = Infinity; improveX = undefined; polishX = undefined;
  chart.reset();
}
function addPoint(raw: number, t: number, c: number): void {
  const restarted = lastRaw >= 0 && raw < lastRaw;
  if (restarted) { offset += lastRaw; keptBest = Infinity; }   // counter restarted after a pause/resume
  lastRaw = raw;
  const x = offset + raw;
  const prev = last();
  if (restarted || !pts.length) loop = { x, reheated: false };
  // the self-reheat goes to about 128; a few iterations in, so a start or our own round reheat does not count
  else if (prev && x - loop.x > 10_000 && t > 2 * ROUND_REHEAT && isReheat(prev.t, t)) loop.reheated = true;
  let p: Pt;
  if (prev && x <= prev.x) { prev.c = c; prev.t = t; p = prev; }
  else { p = { x, t, c }; pts.push(p); }
  if (c < bestC) bestC = c;
  if (c < keptBest) keptBest = c;
  if (improveX === undefined && t <= PHASE_IMPROVE) improveX = x;
  chart.add(p);
}

// ---------- facts, phase text, milestones ----------
function setFact(key: string, text: string, cls = ""): void {
  const d = el(`[data-f="${key}"]`);
  if (d.textContent !== text) d.textContent = text;
  if (d.className !== cls && !d.classList.contains("bump")) d.className = cls;
}
function renderFacts(): void {
  const l = last(), f = baseline();
  setFact("cost", l ? num(l.c) : "–");
  setFact("best", pts.length ? num(bestC) : "–");
  if (l && f && f.c > 0) {
    const d = Math.round((1 - l.c / f.c) * 100);
    setFact("trend", `${d > 0 ? "−" : d < 0 ? "+" : "±"}${Math.abs(d)} %`, d > 0 ? "good" : "");
  } else setFact("trend", "–");
  setFact("iter", l ? num(l.x) : "–");
  setFact("rate", state === "running" && rate > 0 ? num(rate) : "–");
}

const TEXT: Record<State, string> = {
  loading: "Lädt den aktuellen Stand …",
  offline: "Der Server ist nicht erreichbar. Sobald er wieder läuft, erscheint hier der Stand.",
  nodata: "Es gibt noch keine Stunden zu verplanen. Importieren Sie zuerst die Daten des Schuljahres.",
  idle: "Probiert Millionen Anordnungen aus: erst mutig, dann immer feiner.",
  starting: "Der Lauf startet …",
  running: "",
  stopped: "Angehalten. Der beste Plan ist gespeichert.",
};
const PHASE_TEXT = [
  "Probiert mutig Neues aus. Die Kosten dürfen dabei steigen.",
  "Schließt Lücken und verbessert den Plan.",
  "Stimmt den Plan fein ab.",
];
/** recompute where "Feinschliff" starts and hand the phase edges to the chart */
function updatePhases(): void {
  polishX = polishStart();
  const l = last();
  chart.setPhases(improveX, polishX, l ? phaseAt(l.x) : 0);
}
function renderPhase(): void {
  updatePhases();
  const l = last();
  const ph = l ? phaseAt(l.x) : -1;
  el("[data-phases]").querySelectorAll("span").forEach((s, i) => {
    const cls = state === "idle" || state === "nodata" || ph < 0 ? "" : finishedNote && state === "stopped" ? "done" : i < ph ? "done" : i === ph ? "now" : "";
    if (s.className !== cls) s.className = cls;
  });
  let text: string;
  if (state === "running") {
    text = PHASE_TEXT[ph < 0 ? 0 : ph] ?? "";
    if (rounds.active) {
      text = `Durchgang ${rounds.n}: ${text}`;
    } else if (mode === "einfach") text += " Stoppt von selbst.";
    else if (ph === 2) text += " Sie können jederzeit beenden.";
    if (ph === 1 && mode === "einfach") text += " Zwischendurch wird aufgewärmt: Die Kosten steigen dann kurz.";
  } else if (state === "stopped" && finishedNote) text = finishedNote;
  else text = TEXT[state];
  const ex = el("[data-explain]");
  if (ex.textContent !== text) ex.textContent = text;
  const cta = el<HTMLAnchorElement>("[data-result]");
  cta.hidden = !(state === "running" || state === "stopped");
  const label = `${state === "running" ? "Zwischenstand ansehen" : "Ergebnis ansehen"} ${icon("arrow")}`;
  if (cta.innerHTML !== label) cta.innerHTML = label;
}

function rebuildMilestones(): void {
  milestones = [];
  updatePhases();
  const s = first(); if (!s) return;
  milestones.push({ x: s.x, when: "Start", html: `Zufälliger Plan · ${soft(s) ? "" : `${conflictsText(s.c)} · `}Kosten <b>${num(s.c)}</b>` });
  const f = baseline()!;
  if (f !== s) milestones.push({ x: f.x, when: short(f.x), html: `Keine harten Konflikte mehr · Kosten <b>${num(f.c)}</b>` });
  const pk = peak();
  if (pk && pk.c > f.c) milestones.push({ x: pk.x, when: short(pk.x), html: `Höchstwert <b>${num(pk.c)}</b> · mutige Phase` });
  const imp = pts.find((p) => p.t <= PHASE_IMPROVE), pol = polishX !== undefined ? pts.find((p) => p.x === polishX) : undefined;
  if (imp) milestones.push({ x: imp.x, when: short(imp.x), html: `Phase „Verbessern“ beginnt · Kosten <b>${num(imp.c)}</b>` });
  for (const share of [0.5, 0.25]) {
    const target = f.c * share;
    const hit = pts.find((p) => p.c <= target);
    if (hit) milestones.push({ x: hit.x, when: short(hit.x), html: `Kosten unter <b>${num(target)}</b>` });
  }
  if (pol) milestones.push({ x: pol.x, when: short(pol.x), html: `Phase „Feinschliff“ beginnt · Kosten <b>${num(pol.c)}</b>` });
  const bp = pts.find((p) => p.c === bestC);
  if (bp && bp !== f && bp !== s) milestones.push({ x: bp.x, when: short(bp.x), html: `Bester Wert <b>${num(bestC)}</b>` });
  milestones.sort((a, z) => z.x - a.x);
}
function renderMilestones(): void {
  el("[data-ms]").innerHTML = milestones.length
    ? milestones.map((m) => `<li class="${m.fresh ? "fresh" : ""}"><span class="when">${m.when}</span><span>${m.html}</span></li>`).join("")
    : `<li class="empty">Noch keine. Sie erscheinen während des Laufs.</li>`;
  milestones.forEach((m) => (m.fresh = false));
}

// ---------- temperature axis (log scale 0,001 … 1000) ----------
const slider = el<HTMLInputElement>("#temp");
const toSlider = (t: number): number => Math.round(((Math.log10(Math.max(t, 0.001)) + 3) / 6) * 1000);
const fromSlider = (v: number): number => 10 ** ((v / 1000) * 6 - 3);
let sliderBusy = false, sendTimer = 0;
/**
 * The temperature picked on the slider. Progress events keep reporting the old one for a moment,
 * so the slider shows this until the backend reports it back (sentAt 0: not sent yet).
 */
let wanted: { t: number; sentAt: number } | null = null;
function settleWanted(t: number): void {
  if (!wanted?.sentAt) return;
  const arrived = t <= wanted.t * 1.001 && t >= wanted.t * 0.5;
  if (arrived || performance.now() - wanted.sentAt > 2000) wanted = null;
}
function renderTemp(): void {
  const t = wanted?.t ?? temperature;
  const out = el("[data-temp]"), txt = fmtTemp(t);
  if (out.textContent !== txt) out.textContent = txt;
  if (!sliderBusy && isFinite(t)) slider.value = String(toSlider(t));
  slider.style.setProperty("--fill", `${Number(slider.value) / 10}%`);
  slider.disabled = !(state === "running" || state === "stopped") || socketStatus !== "open";
  el("[data-temp-hint]").textContent = state === "stopped"
    ? "Gilt ab dem Fortsetzen. Höher = der Plan darf sich wieder stärker ändern."
    : "Sinkt während des Laufs von selbst. Hochziehen lässt den Plan wieder größere Änderungen ausprobieren.";
}
slider.addEventListener("pointerdown", () => (sliderBusy = true));
addEventListener("pointerup", () => (sliderBusy = false));
slider.addEventListener("input", () => {
  // sent from this value, not from `temperature`: progress events overwrite that every 50 ms
  const t = fromSlider(Number(slider.value));
  temperature = t;
  wanted = { t, sentAt: 0 };
  renderTemp(); renderPhase(); renderCard();
  clearTimeout(sendTimer);
  sendTimer = window.setTimeout(() => sendTemperature(t), 120);
});
function sendTemperature(t: number): boolean {
  t = Number(t.toPrecision(4));
  tempSentAt = performance.now();
  const sent = socket.send(`temperature:${t}`);
  wanted = sent ? { t, sentAt: tempSentAt } : null;
  if (!sent) renderTemp();
  return sent;
}

// ---------- header controls ----------
const primary = el<HTMLButtonElement>("[data-primary]");
/** instant feedback while the server takes its moment; the next state render replaces it */
function pending(b: HTMLButtonElement, text: string): void {
  b.innerHTML = `<span class="btn-spin" aria-hidden="true"></span>${text}`;
  b.disabled = true;
}

function renderControls(): void {
  // one button: Pausieren while a run goes on, Fortsetzen otherwise (Optimierung starten before the first run)
  const live = socketStatus === "open";
  if (state === "running" || state === "starting") {
    primary.innerHTML = `${icon("pause")}Pausieren`;
    primary.disabled = state === "starting" || !live;
  } else if (state === "stopped") {
    primary.innerHTML = `${icon("play")}Fortsetzen`;
    primary.disabled = !live;
  } else {
    primary.innerHTML = `${icon("play")}Optimierung starten`;
    primary.disabled = state !== "idle";
  }
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
}

primary.addEventListener("click", async () => {
  if (state === "idle") { await startRun(true); return; }
  if (state === "stopped") return resumeRun();
  if (state === "running") {
    // Einfach must not start its next round when the pause ends this one
    rounds.userStopped = true;
    if (!socket.send("pause")) { rounds.userStopped = false; toast("Keine Verbindung zum Server. Bitte gleich nochmal versuchen."); }
    else pending(primary, "Wird angehalten …");
  }
});

/** throw the plan away and start over with a random one */
async function restartRun(b: HTMLElement): Promise<void> {
  try {
    b.classList.add("busy");
    await algorithmApi.randomize();
    resetData(); milestones = [];
    await startRun(true);
  } catch {
    toast("Neu beginnen hat nicht geklappt. Ist der Server erreichbar?");
  } finally {
    b.classList.remove("busy");
  }
}
document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) => b.addEventListener("click", async () => {
  const next: Mode = b.dataset.mode === "erweitert" ? "erweitert" : "einfach";
  if (next === mode) return;
  mode = next;
  saveMode();
  el("[data-work]").classList.toggle("simple", mode === "einfach");
  if (state === "running") {
    inControl = true;
    rounds.active = mode === "einfach";
    if (rounds.active) startRounds(true);
    try { await setAutomatic(mode === "einfach", socket); } catch { toast("Moduswechsel hat nicht geklappt."); }
  }
  renderAll();
}));
document.querySelectorAll<HTMLButtonElement>("[data-zoom]").forEach((b) => b.addEventListener("click", () => {
  zoom = b.dataset.zoom === "end" ? "end" : "all";
  document.querySelectorAll<HTMLButtonElement>("[data-zoom]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  chart.setZoom(zoom);
}));

/** keep: continue the round count of an earlier stop (resume, mode switch) instead of starting at 1 */
function startRounds(keep = false): void {
  const go = keep && rounds.n > 0;
  rounds = { active: true, n: go ? rounds.n + 1 : 1, sinceGain: 0, bestAtRoundStart: bestC, startedAt: performance.now(), userStopped: false,
    startX: last()?.x ?? 0, lens: go ? rounds.lens : [] };
  finishedNote = "";
}

async function startRun(fresh: boolean): Promise<void> {
  setState("starting");
  startKicked = false;
  inControl = true;
  if (mode === "einfach") startRounds(); else rounds.active = false;
  eta = { fromX: last()?.x ?? 0, base: 0, shown: 0 };
  finishedNote = "";
  forgetFinished();
  try {
    await setAutomatic(mode === "einfach", socket);
    // the backend keeps the last run's (cold) temperature: a fresh run must start hot
    if (fresh) sendTemperature(START_TEMPERATURE);
  } catch { /* the run can still start; mode just stays as it was */ }
  algorithmApi.start()
    .then((r) => { if (!r.ok) failStart(`Start abgelehnt (${r.status}).`); })
    .catch(() => { if (state === "starting") failStart("Der Server ist nicht erreichbar."); });
  armStartTimer("Der Lauf hat nicht begonnen.");
}
function armStartTimer(reason: string): void {
  clearTimeout(startTimer);
  startTimer = window.setTimeout(() => { if (state === "starting") failStart(reason); }, 10000);
}
function failStart(reason: string): void {
  clearTimeout(startTimer);
  rounds.active = false;
  setState(pts.length ? "stopped" : "idle");
  showBanner("error", `${reason} Bitte prüfen Sie, ob der Server läuft, und versuchen Sie es erneut.`);
}
async function resumeRun(): Promise<void> {
  inControl = true;
  // after a pause the bar goes on from where it stopped; improving a finished plan is a new stretch
  const base = finishedNote ? 0 : eta.shown;
  eta = { fromX: last()?.x ?? 0, base, shown: base };
  finishedNote = "";
  forgetFinished();
  if (mode === "einfach") startRounds(true); else rounds.active = false;
  try { await setAutomatic(mode === "einfach", socket); } catch {}
  // basic mode stops at once when it is already cold: give it a warm start
  if (mode === "einfach" && !(temperature > PHASE_POLISH)) sendTemperature(ROUND_REHEAT);
  if (!socket.send("resume")) { rounds.active = false; toast("Keine Verbindung zum Server. Bitte gleich nochmal versuchen."); return; }
  setState("starting");
  armStartTimer("Der Lauf ist nicht weitergelaufen.");
}

/** The server only keeps the best plan of its latest loop, which can be worse than the lowest point of the curve. */
function keptNote(): string {
  if (!isFinite(keptBest)) return "";
  return keptBest > bestC
    ? ` Gespeichert: Kosten ${num(keptBest)} (der Tiefstwert ${num(bestC)} ging beim Fortsetzen verloren).`
    : ` Gespeichert: Kosten ${num(keptBest)}.`;
}

/** Einfach: the backend stopped by itself. Another round, or are we done? */
function continueRounds(): boolean {
  if (!rounds.active || !inControl || rounds.userStopped || mode !== "einfach") return false;
  const gained = rounds.bestAtRoundStart - bestC >= MIN_GAIN(rounds.bestAtRoundStart);
  rounds.sinceGain = gained ? 0 : rounds.sinceGain + 1;
  const elapsed = performance.now() - rounds.startedAt;
  if (rounds.sinceGain >= ROUNDS_WITHOUT_GAIN_TO_FINISH || elapsed > MAX_RUN_MS) {
    rounds.active = false;
    finishedNote = elapsed > MAX_RUN_MS
      ? `Fertig nach ${rounds.n} Durchgängen (Zeitlimit).`
      : `Fertig nach ${rounds.n} Durchgängen. Weitere brachten nichts mehr.`;
    finishedNote += keptNote();
    return false;
  }
  const endX = last()?.x ?? rounds.startX;
  if (rounds.n > 1) rounds.lens.push(endX - rounds.startX);
  rounds.startX = endX;
  rounds.n++;
  rounds.bestAtRoundStart = bestC;
  sendTemperature(ROUND_REHEAT);
  if (!socket.send("resume")) { rounds.active = false; return false; }
  armStartTimer("Der nächste Durchgang hat nicht begonnen.");
  return true;
}

// ---------- status card (Einfach: the state in words instead of the curve) ----------
type Tone = "idle" | "busy" | "good" | "warn" | "error";
type Card = { tone: Tone; ic: string; eb: string; title: string; text: string; facts: boolean; action: string };
const PHASE_NAME = ["Erkunden", "Verbessern", "Feinschliff"];
const resultLink = (dark: boolean, label: string): string =>
  `<a class="btn ${dark ? "btn-dark" : "btn-glass"}" href="./ergebnis.html">${label} ${icon("arrow")}</a>`;
/** improvement of cost c over the first conflict-free plan, in whole percent */
function gainPct(c: number): number | undefined {
  const f = baseline();
  return f && f.c > 0 ? Math.round((1 - c / f.c) * 100) : undefined;
}
function card(): Card {
  const l = last();
  switch (state) {
    case "loading": return { tone: "busy", ic: icon("calendar"), eb: "", title: "Lädt …", text: "Der aktuelle Stand wird geholt.", facts: false, action: "" };
    case "offline": return { tone: "error", ic: icon("wifi"), eb: "Keine Verbindung", title: "Server nicht erreichbar", text: "Sobald er wieder läuft, geht es hier weiter.", facts: false,
      action: `<button type="button" class="btn btn-dark" data-retry>${icon("redo")}Erneut versuchen</button>` };
    case "nodata": return { tone: "idle", ic: icon("upload"), eb: "Schritt 1 fehlt", title: "Noch nichts zu verplanen", text: "Es sind keine Stunden angelegt. Importieren Sie zuerst die Daten des Schuljahres.", facts: false,
      action: `<a class="btn btn-dark" href="./import.html">Zum Import ${icon("arrow")}</a>` };
    case "idle": return { tone: "idle", ic: icon("calendar"), eb: "Bereit", title: "Bereit für den Stundenplan", text: "Die Optimierung probiert Millionen Anordnungen aus und stoppt von selbst, sobald der Plan nicht mehr besser wird.", facts: false,
      action: `<button type="button" class="btn btn-dark" data-start>${icon("play")}Optimierung starten</button>` };
    case "starting": return { tone: "busy", ic: icon("spark"), eb: "Startet", title: "Gleich geht’s los …", text: "Der Lauf beginnt gleich.", facts: false, action: "" };
    case "running": {
      const ph = l ? phaseAt(l.x) : 0;
      const [title, text] = ph === 2 ? ["Wird verfeinert", "Fast fertig. Der Plan wird fein abgestimmt."]
        : ph === 1 ? ["Plan wird verbessert", "Jetzt werden Lücken geschlossen und der Plan wird besser."]
        : ["Plan wird erstellt …", "Probiert mutig verschiedene Anordnungen aus."];
      const eb = `${rounds.active ? `Durchgang ${rounds.n}` : "Läuft"} · ${PHASE_NAME[ph]}`;
      return { tone: "busy", ic: icon("spark"), eb, title,
        text: mode === "einfach" && !rounds.active ? `${text} Stoppt von selbst.` : text, facts: true,
        action: resultLink(false, "Zwischenstand ansehen") };
    }
    case "stopped":
      if (!finishedNote) return { tone: "warn", ic: icon("pause"), eb: "Angehalten", title: "Pause", text: "Der beste Plan bisher ist gespeichert. Sie können fortsetzen oder das Ergebnis ansehen.", facts: true,
        action: resultLink(false, "Ergebnis ansehen") };
      return { tone: "good", ic: icon("check"), eb: "Fertig", title: "Ihr Stundenplan ist fertig", text: finishedNote, facts: true,
        action: `${resultLink(true, "Ergebnis ansehen")}<div class="st-more">`
          + `<button type="button" class="btn btn-glass" data-more>${icon("spark")}Weiter verbessern</button>`
          + `<button type="button" class="btn btn-glass" data-restart>${icon("redo")}Neu beginnen</button></div>` };
  }
}
/*
 * Time left, counted in iterations and turned into time with the measured speed (iterations / s).
 * The iterations are predictable because the backend cools by a fixed factor (×0.999993 per
 * iteration). In automatic mode one backend loop has two legs:
 *   1. cool from its start temperature down to 0.1,
 *   2. heat itself up to about 128 and cool down to 0.1 again, then stop.
 * (Seen in the history: from 8 the first leg ends at iteration 626.500, the reheat goes to 127,65,
 * the loop stops at 1.648.000.) Einfach then needs at least as many more such loops as are missing
 * to "no gain three times in a row", each starting at ROUND_REHEAT. If a loop still brings a gain,
 * one more follows: the time then goes up, the bar only slows down, it never moves backwards.
 */
const COOL_PER_ITER = -Math.log(0.999993);
const COLD = 0.1;
const SELF_REHEAT = 128;
const itersToCold = (t: number): number => (t > COLD ? Math.log(t / COLD) / COOL_PER_ITER : 0);
/** one whole backend loop that starts at temperature t */
const loopIters = (t: number): number => itersToCold(t) + itersToCold(SELF_REHEAT);
/** fromX: where the bar started counting; base: where it stood then (after a resume it goes on from there) */
let eta = { fromX: 0, base: 0, shown: 0 };
function estimate(): { pct: number; ms: number } | undefined {
  const l = last();
  if (state !== "running" || !l || !(rate > 0) || !isFinite(temperature)) return undefined;
  // on the first leg the self-reheat is still ahead
  let left = loop.reheated ? itersToCold(temperature) : loopIters(temperature);
  let capMs = Infinity;
  if (rounds.active) {
    const more = Math.max(0, ROUNDS_WITHOUT_GAIN_TO_FINISH - rounds.sinceGain - 1);
    const lens = rounds.lens;
    const perRound = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : loopIters(ROUND_REHEAT);
    left += more * perRound;
    capMs = Math.max(0, MAX_RUN_MS - (performance.now() - rounds.startedAt));
  }
  left = Math.max(0, left);
  if (l.x < eta.fromX) eta = { fromX: l.x, base: 0, shown: 0 };
  const done = l.x - eta.fromX;
  const ms = Math.min((left / rate) * 1000, capMs);
  const own = Math.max(done + left > 0 ? done / (done + left) : 0, isFinite(capMs) ? 1 - capMs / MAX_RUN_MS : 0);
  eta.shown = Math.min(0.99, Math.max(eta.shown, eta.base + (1 - eta.base) * own));
  return { pct: eta.shown, ms };
}
/** a lower bound: a round that still improves the plan adds another one */
function fmtLeft(ms: number): string {
  if (ms < 10_000) return "Noch mindestens ein paar Sekunden";
  if (ms < 55_000) return `Noch mindestens ${Math.round(ms / 5000) * 5} Sekunden`;
  const min = Math.max(1, Math.round(ms / 60_000));
  return `Noch mindestens ${min} ${min === 1 ? "Minute" : "Minuten"}`;
}

/** the bar stays after a stop: frozen where it was when paused, full when finished */
function bar(): { pct: number; label: string } | undefined {
  if (state === "running") {
    const e = estimate();
    if (e) return { pct: e.pct, label: fmtLeft(e.ms) };
    return eta.shown > 0 ? { pct: eta.shown, label: "Restzeit wird berechnet …" } : undefined;
  }
  if (state === "stopped") {
    if (finishedNote) return { pct: 1, label: "Fertig" };
    if (eta.shown > 0) return { pct: eta.shown, label: "Angehalten" };
  }
  return undefined;
}

let cardAction = "";
/** last improvement shown in the card; a fresh start sets it back to 0 */
let shownGain = 0;
function renderCard(): void {
  const k = card();
  const box = el("[data-st]");
  if (box.dataset.tone !== k.tone) box.dataset.tone = k.tone;
  const ic = el("[data-st-icon]");
  if (ic.innerHTML !== k.ic) ic.innerHTML = k.ic;
  const eb = el("[data-st-eyebrow]");
  if (eb.textContent !== k.eb) eb.textContent = k.eb;
  const t = el("[data-st-title]"), p = el("[data-st-text]");
  if (t.textContent !== k.title) t.textContent = k.title;
  if (p.textContent !== k.text) p.textContent = k.text;
  const e = bar(), etaBox = el("[data-st-eta]");
  etaBox.hidden = !e;
  if (e) {
    el("[data-st-bar]").style.setProperty("--p", `${(e.pct * 100).toFixed(1)}%`);
    const left = e.label, pct = `${Math.round(e.pct * 100)} %`;
    const lt = el("[data-st-left]"), pc = el("[data-st-pct]");
    if (lt.textContent !== left) lt.textContent = left;
    if (pc.textContent !== pct) pc.textContent = pct;
  }
  // while exploring the plan can briefly get worse: the number then stays where it was until it improves again
  const facts = el("[data-st-facts]");
  facts.hidden = !k.facts || !pts.length;
  if (!facts.hidden) {
    const g = gainPct(state === "stopped" && isFinite(keptBest) ? keptBest : last()!.c);
    if (g !== undefined && g > 0) shownGain = g;
    const gd = el("[data-st-gain]"), gain = `${shownGain} %`;
    if (gd.textContent !== gain) gd.textContent = gain;
    gd.className = shownGain > 0 ? "good" : "";
  }
  // rebuild the button only when it changes, so it does not flicker under the cursor
  if (cardAction !== k.action) { cardAction = k.action; el("[data-st-action]").innerHTML = k.action; }
}
el("[data-st-action]").addEventListener("click", (e) => {
  const b = (e.target as Element).closest("button");
  if (b?.hasAttribute("data-start") || b?.hasAttribute("data-more")) primary.click();
  else if (b?.hasAttribute("data-retry")) void sync();
  else if (b?.hasAttribute("data-restart")) {
    // starting over throws away the finished plan: ask once, inline
    if (!b.classList.contains("confirm")) {
      b.classList.add("confirm");
      b.innerHTML = `${icon("alert")}Wirklich neu? Plan wird verworfen`;
      setTimeout(() => { cardAction = ""; renderCard(); }, 4000);
      return;
    }
    void restartRun(b);
  }
});

// ---------- banner + empty states ----------
/** every view (status card, chart) has its own slot: only one of them is visible */
function showBanner(kind: "error" | "warn" | null, text = "", action?: { label: string; run: () => void }): void {
  document.querySelectorAll<HTMLElement>("[data-banner]").forEach((slot) => {
    if (!kind) { if (slot.innerHTML) slot.innerHTML = ""; return; }
    slot.innerHTML = `<div class="banner banner-${kind}" role="alert">${icon(kind === "error" ? "alert" : "wifi")}<span>${text}</span>${action ? `<button type="button" class="btn btn-glass">${action.label}</button>` : ""}</div>`;
    if (action) slot.querySelector("button")!.addEventListener("click", action.run);
  });
}
function renderEmpty(): void {
  const box = el("[data-empty]");
  const show = state === "loading" || state === "offline" || state === "nodata" || (chart.size < 2 && (state === "idle" || state === "starting"));
  box.hidden = !show;
  if (!show) return;
  const body = {
    loading: `<div class="spinner" aria-hidden="true"></div><p>Lädt den aktuellen Stand …</p>`,
    offline: `<b>Server nicht erreichbar</b><p>Der Kostenverlauf erscheint, sobald die Verbindung steht.</p><button type="button" class="btn btn-dark" data-retry>${icon("redo")}Erneut versuchen</button>`,
    nodata: `<b>Noch nichts zu verplanen</b><p>Es sind keine Stunden (Klassen und Fächer) angelegt. Importieren Sie die Daten im Schritt 1.</p><a class="btn btn-dark" href="./import.html">Zum Import ${icon("arrow")}</a>`,
    idle: `<b>Noch kein Lauf</b><p>Starten Sie die Optimierung. Hier sehen Sie dann live, wie die Kosten des Plans sinken.</p>`,
    starting: `<div class="spinner" aria-hidden="true"></div><p>Der Lauf startet …</p>`,
  } as Record<string, string>;
  box.innerHTML = `<div>${body[state] ?? ""}</div>`;
  box.querySelector("[data-retry]")?.addEventListener("click", () => void sync());
}

// ---------- chip + step ----------
function renderStatus(): void {
  const chip = el("[data-chip]");
  const round = state === "running" && rounds.active ? ` · Durchgang ${rounds.n}` : "";
  const [s, text] = ({
    loading: ["loading", "Lädt …"], offline: ["error", "Server offline"], nodata: ["loading", "Keine Daten"],
    idle: ["loading", "Bereit"], starting: ["running", "Startet …"], running: ["running", `Läuft${round}`],
    stopped: finishedNote ? ["done", "Fertig"] : ["paused", "Angehalten"],
  } as Record<State, [string, string]>)[state];
  chip.dataset.state = s;
  const ct = el("[data-chip-text]");
  if (ct.textContent !== text) ct.textContent = text;
  shell.setStep("optimierung", "active", text.replace(/ · .*/, ""));
  chart.setRunning(state === "running");
}

function renderAll(): void {
  renderStatus(); renderControls(); renderEmpty(); renderFacts(); renderPhase(); renderTemp(); renderMilestones(); renderCard();
}
function setState(s: State): void {
  if (state === s) return;
  // a run this tab only watches: the estimate counts from here
  if (s === "running" && !rounds.active && !inControl) eta = { fromX: last()?.x ?? 0, base: 0, shown: 0 };
  state = s;
  renderAll();
}

// ---------- live progress ----------
function onProgress(p: Progress): void {
  if (p.finished) {
    clearTimeout(startTimer);
    if (p.iteration === 0 && p.currentCost === 0 && pts.length === 0) { inControl = false; setState("nodata"); return; }
    // /run returns at once when the server still has its "paused" flag from an earlier stop: start it via resume
    if (p.iteration === 0 && state === "starting" && inControl && !startKicked) {
      startKicked = true;
      if (socket.send("resume")) return;
    }
    if (p.iteration > 0) addPoint(p.iteration, p.temperature, p.currentCost);
    settleWanted(p.temperature);
    temperature = p.temperature;
    // Einfach: keep going in rounds instead of showing "stopped" between them
    if (continueRounds()) { renderStatus(); renderPhase(); renderCard(); return; }
    inControl = false;
    rounds.active = false;
    setState("stopped");
    if (finishedNote) rememberFinished();
    rebuildMilestones();
    renderAll();
    return;
  }
  const prevBest = bestC;
  const prevT = temperature;
  if (isFinite(prevT) && isReheat(prevT, p.temperature) && pts.length) {
    milestones.unshift({ x: offset + p.iteration, when: short(offset + p.iteration), html: `Aufgewärmt auf Temperatur <b>${fmtTemp(p.temperature)}</b>`, fresh: true });
    if (milestones.length > 9) milestones.length = 9;
    renderMilestones();
  }
  addPoint(p.iteration, p.temperature, p.currentCost);
  settleWanted(p.temperature);
  temperature = p.temperature;
  checkAutomatic(prevT, p.temperature);
  const now = performance.now(), l = last()!;
  if (lastEventAt && now - lastEventAt > 200) {
    const r = ((l.x - lastEventIter) / (now - lastEventAt)) * 1000;
    if (r > 0) rate = rate ? rate * 0.7 + r * 0.3 : r;
    lastEventAt = now; lastEventIter = l.x;
  } else if (!lastEventAt) { lastEventAt = now; lastEventIter = l.x; }
  if (state !== "running") { clearTimeout(startTimer); showBanner(null); setState("running"); }
  else clearTimeout(startTimer);
  // a clearly better plan is worth a line in the milestones
  if (pts.length > 1 && l.c < prevBest && isFinite(prevBest) && prevBest - l.c >= Math.max(5, prevBest * 0.002)) {
    milestones.unshift({ x: l.x, when: short(l.x), html: `Neuer Bestwert <b>${num(l.c)}</b>`, fresh: true });
    if (milestones.length > 9) milestones.length = 9;
    renderMilestones();
    const d = el('[data-f="best"]'); d.classList.remove("bump"); void d.offsetWidth; d.classList.add("bump");
    setTimeout(() => d.classList.remove("bump"), 700);
  }
  scheduleTextRender();
}

// the chart animates every frame by itself; the text around it only needs a few updates per second
let textTimer = 0;
function scheduleTextRender(): void {
  if (textTimer) return;
  textTimer = window.setTimeout(() => {
    textTimer = 0;
    renderFacts(); renderPhase(); renderTemp(); renderCard();
  }, 250);
}

/**
 * The backend only lets us toggle automatic (basic) mode, never read it, so our record can drift.
 * Its behaviour gives it away: in automatic mode it reheats itself once it is colder than 0.1,
 * without automatic mode it simply keeps cooling. Correct the record (and the server) when we see either.
 */
function checkAutomatic(prevT: number, t: number): void {
  const now = performance.now();
  if (!inControl) return;
  if (now - modeFixedAt < 3000 || now - tempSentAt < 2000 || !isFinite(prevT)) return;
  const reheated = prevT < 0.2 && t > prevT * 4 && t > 1;
  const cooledThrough = t < 0.05;
  if (reheated && !believedAutomatic()) noteAutomatic(true);
  if (cooledThrough && believedAutomatic()) noteAutomatic(false);
  const wantAuto = mode === "einfach";
  if ((reheated && !wantAuto) || (cooledThrough && wantAuto)) {
    modeFixedAt = now;
    void setAutomatic(wantAuto, socket);
  }
}

function onSocketStatus(s: SocketStatus): void {
  const was = socketStatus;
  socketStatus = s;
  if (s === "closed" && (state === "running" || state === "starting" || state === "stopped")) {
    showBanner("warn", "Verbindung zum Server unterbrochen. Es wird automatisch neu verbunden …", { label: "Jetzt verbinden", run: () => socket.reconnectNow() });
  }
  if (s === "open" && was === "closed") { showBanner(null); void sync(); }
  renderControls(); renderTemp();
}

const socket = new ProgressSocket(onProgress, onSocketStatus);

// ---------- initial load / resync ----------
async function sync(): Promise<void> {
  if (state === "offline") setState("loading");
  try {
    const [running, history, lessons] = await Promise.all([algorithmApi.isRunning(), algorithmApi.history(), algorithmApi.lessonCount()]);
    resetData();
    for (const h of history as HistoryPoint[]) addPoint(h.iteration, h.temperature, h.cost);
    temperature = last()?.t ?? NaN;
    showBanner(null);
    if (lessons === 0) setState("nodata");
    else if (running) setState("running");
    else {
      if (!inControl) finishedNote = finishedFor(history as HistoryPoint[]);
      setState(pts.length ? "stopped" : "idle");
    }
    rebuildMilestones();
    renderAll();
  } catch {
    resetData();
    setState("offline");
    renderAll();
  }
}

el("[data-work]").classList.toggle("simple", mode === "einfach");
renderAll();
void sync();
