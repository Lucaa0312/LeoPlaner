// 3 Ergebnis & Export: the finished timetable per class, teacher or room, plus export and print.
import { renderShell } from "../glas/shell.js";
import { el, esc, icon, num, title, toast, dayName } from "../glas/ui.js";
import { store, classHours, DAY_SHORT, HOUR_TIMES, rgb, param, type Data } from "../glas/store.js";
import { loadSchool, statsFor, tileInk, type Lesson, type School } from "../glas/plan.js";
import { downloadBaseData } from "../glas/admin.js";

type Kind = "klasse" | "lehrer" | "raum";
type Item = { id: number; name: string; short: string; sub: string; search: string };

const shell = renderShell({ active: "ergebnis" });
let data: Data | null = null;
let school: School | null = null;
let kind: Kind = (["klasse", "lehrer", "raum"] as const).find((k) => k === param("ansicht")) ?? "klasse";
let current: number | null = Number(param("id")) || null;
let q = "";
let running = false;

// ---------- header ----------
el("[data-again]").innerHTML = `${icon("redo")}<span class="lbl">Neu optimieren</span>`;
el("[data-print]").innerHTML = `${icon("print")}<span class="lbl">Drucken</span>`;
el("[data-export]").innerHTML = `${icon("download")}Exportieren`;
el("[data-prev]").innerHTML = icon("arrow");
el("[data-next]").innerHTML = icon("arrow");
el("[data-search-ic]").outerHTML = icon("search");

const menu = el("[data-menu]"), exp = el<HTMLButtonElement>("[data-export]");
menu.innerHTML = `
  <button type="button" role="menuitem" disabled>${icon("table")}<b>Stundenpläne als Excel<span class="soon">bald</span></b><span>Alle Klassen, Lehrer und Räume. Braucht noch einen Export im Backend.</span></button>
  <button type="button" role="menuitem" data-act="base">${icon("download")}<b>Stammdaten als Excel</b><span>Lehrer, Klassen, Räume, Fächer und Zuteilungen</span></button>
  <button type="button" role="menuitem" data-act="print">${icon("print")}<b>Diesen Plan drucken oder als PDF</b><span>Der gerade gezeigte Plan, ohne Seitenleiste</span></button>`;
const toggleMenu = (open: boolean): void => {
  menu.hidden = !open;
  exp.setAttribute("aria-expanded", String(open));
  if (open) menu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
};
exp.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(!!menu.hidden); });
document.addEventListener("click", (e) => { if (!menu.contains(e.target as Node)) toggleMenu(false); });
menu.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
  if (!b) return;
  toggleMenu(false);
  if (b.dataset.act === "print") window.print();
  else void downloadBaseData();
});
el("[data-print]").addEventListener("click", () => window.print());

// ---------- the three kinds of plans ----------
function items(k: Kind): Item[] {
  if (!data || !school) return [];
  if (k === "klasse") return data.classes.map((c) => {
    const room = c.roomDTO ? (c.roomDTO.nameShort || String(c.roomDTO.roomNumber)).toUpperCase() : "";
    return { id: c.id, name: c.className.toUpperCase(), short: c.className.toUpperCase(), sub: room ? `Stammraum ${room}` : "ohne Stammraum", search: `${c.className} ${room}` };
  }).sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
  if (k === "lehrer") return data.teachers.map((t) => ({
    id: t.id, name: t.teacherName, short: t.nameSymbol.toUpperCase(), sub: t.nameSymbol.toUpperCase(), search: `${t.teacherName} ${t.nameSymbol}`,
  })).sort((a, b) => a.name.localeCompare(b.name, "de"));
  return data.rooms.map((r) => {
    const s = (r.nameShort || String(r.roomNumber)).toUpperCase();
    return { id: r.id, name: `Raum ${s}`, short: s, sub: title(r.roomName), search: `${r.roomName} ${r.nameShort} ${r.roomNumber}` };
  }).sort((a, b) => a.short.localeCompare(b.short, "de", { numeric: true }));
}
function lessonsOf(k: Kind, id: number): Lesson[] {
  const ls = school?.lessons ?? [];
  if (k === "klasse") return ls.filter((l) => l.classId === id);
  if (k === "lehrer") return ls.filter((l) => l.teachers.some((t) => t.id === id));
  return ls.filter((l) => l.roomId === id);
}
const visible = (): Item[] => items(kind).filter((it) => !q || it.search.toLowerCase().includes(q));

// ---------- summary ----------
function renderSummary(): void {
  if (!data || !school) return;
  const need = classHours(data.classSubjects);
  let complete = 0, classGaps = 0, hours = 0;
  for (const c of data.classes) {
    const s = statsFor(lessonsOf("klasse", c.id));
    hours += s.hours; classGaps += s.gaps;
    if (s.hours >= (need.get(c.className) ?? 0)) complete++;
  }
  const teacherGaps = data.teachers.reduce((a, t) => a + statsFor(lessonsOf("lehrer", t.id)).gaps, 0);
  const all = data.classes.length;
  el("[data-summary]").innerHTML = `
    <div class="${complete === all ? "ok" : "bad"}"><b>${complete}/${all}</b><span>Klassen vollständig verplant</span></div>
    <div><b>${num(hours)}</b><span>Wochenstunden</span></div>
    <div class="${classGaps ? "bad" : "ok"}"><b>${num(classGaps)}</b><span>Freistunden in Klassenplänen</span></div>
    <div><b>${num(teacherGaps)}</b><span>Freistunden bei Lehrkräften</span></div>
    <p class="note">${running ? "Die Optimierung läuft noch. Das ist ein Zwischenstand." : "Harte Regeln prüft der Server noch nicht einzeln."}</p>`;
}

// ---------- list ----------
function renderList(): void {
  const list = visible();
  const ul = el("[data-list]");
  if (!list.length) { ul.innerHTML = `<li class="empty">${q ? `Nichts gefunden für „${esc(q)}“.` : "Keine Einträge."}</li>`; return; }
  ul.innerHTML = list.map((it) => {
    const s = statsFor(lessonsOf(kind, it.id));
    const sub = kind === "raum" ? (s.hours ? `${s.hours} Std. belegt · ${esc(it.sub)}` : `nicht belegt · ${esc(it.sub)}`) : `${s.hours} Std. · ${esc(it.sub)}`;
    const badge = kind === "raum" ? "" : `<span class="badge ${s.gaps ? "warn" : ""}" title="Freistunden">${s.gaps} frei</span>`;
    return `<li><button type="button" data-id="${it.id}" ${it.id === current ? 'aria-current="true"' : ""}><span class="nm">${esc(it.name)}</span>${badge}<span class="sub">${sub}</span></button></li>`;
  }).join("");
}

// ---------- grid ----------
const grid = el("[data-grid]");
/** this many hours fill the panel; later ones are reached by scrolling the grid */
const VISIBLE_HOURS = 11;
let rows = 0;
/** the row height that fits VISIBLE_HOURS into the panel (never smaller than 38px) */
function sizeRows(): void {
  const shown = Math.min(rows, VISIBLE_HOURS);
  if (!shown) return;
  const free = grid.clientHeight - 32 - 8;
  grid.style.setProperty("--row", `${Math.max(38, Math.floor(free / shown))}px`);
}
new ResizeObserver(sizeRows).observe(grid);
function renderPlan(): void {
  const it = items(kind).find((i) => i.id === current);
  const [lo, hi] = school?.hourRange ?? [1, 8];
  rows = hi - lo + 1;
  grid.style.gridTemplateRows = `32px repeat(${rows}, var(--row, 38px))`;
  sizeRows();
  if (!it) {
    el("[data-title]").textContent = "–"; el("[data-sub]").textContent = ""; el("[data-stats]").innerHTML = "";
    grid.innerHTML = `<div class="grid-empty" style="grid-row:2 / span ${rows}"><div><b>Kein Plan ausgewählt.</b>Wählen Sie links eine Klasse, Lehrkraft oder einen Raum.</div></div>`;
    return;
  }
  const ls = lessonsOf(kind, it.id);
  const s = statsFor(ls);
  el("[data-title]").textContent = kind === "lehrer" ? `${it.name} (${it.short})` : it.name;
  el("[data-sub]").textContent = kind === "klasse" ? `${it.sub} · Klassenplan` : kind === "lehrer" ? "Lehrerplan"
    : ls.length ? `Raumplan · ${[...new Set(ls.map((l) => l.cls.toUpperCase()))].join(", ")}` : "Raumplan";
  el("[data-stats]").innerHTML = `<span><b>${s.hours}</b> Wochenstunden</span>${kind === "raum" ? "" : `<span class="${s.gaps ? "warn" : ""}"><b>${s.gaps}</b> ${s.gaps === 1 ? "Freistunde" : "Freistunden"}</span>`}<span><b>${s.doubles}</b> ${s.doubles === 1 ? "Doppelstunde" : "Doppelstunden"}</span>${s.latest ? `<span>bis zur <b>${s.latest}.</b> Stunde</span>` : ""}`;

  let h = `<div class="gd" style="grid-column:1"></div>` + DAY_SHORT.map((d, i) => `<div class="gd" style="grid-column:${i + 2}">${d}</div>`).join("");
  for (let r = 0; r < rows; r++) {
    const hour = lo + r, t = HOUR_TIMES[hour];
    h += `<div class="gh" style="grid-row:${r + 2}"><b>${hour}</b>${t ? t[0] : ""}</div>`;
    h += `<div class="gl" style="grid-row:${r + 2}"></div>`;
  }
  if (!ls.length) {
    const msg = kind === "raum" ? ["Dieser Raum ist nicht belegt.", "Kein Unterricht im aktuellen Plan. Unterricht findet derzeit im Stammraum der Klasse statt."]
      : kind === "lehrer" ? ["Diese Lehrkraft hat keinen Unterricht.", "Ihr ist im aktuellen Plan keine Stunde zugeteilt."]
      : ["Für diese Klasse gibt es noch keinen Plan.", "Starten Sie die Optimierung, dann erscheint er hier."];
    h += `<div class="grid-empty" style="grid-row:2 / span ${rows}"><div><b>${msg[0]}</b>${msg[1]}</div></div>`;
  }
  h += ls.filter((l) => l.hour <= hi).map((l, i) => {
    const t0 = l.teachers[0];
    const a = kind === "lehrer" ? l.cls.toUpperCase() : t0 ? `${t0.sym}${l.teachers.length > 1 ? ` +${l.teachers.length - 1}` : ""}` : "–";
    const b = kind === "raum" ? l.cls.toUpperCase() : l.room ? `Raum ${l.room}` : "kein Raum";
    return `<button type="button" class="tile${l.len === 1 ? " one" : ""}" style="--i:${i};--c:${rgb(l.color)};--ink-c:${tileInk(l.color)};grid-column:${l.day + 2};grid-row:${l.hour - lo + 2} / span ${Math.min(l.len, hi - l.hour + 1)}" data-k="${l.key}" data-t="${t0?.id ?? ""}"
      aria-label="${esc(title(l.subjectName))}, ${dayName(l.day)} ${l.hour}. Stunde${l.len > 1 ? ` bis ${l.hour + l.len - 1}.` : ""}, ${esc(l.teachers.map((x) => x.name).join(", ") || "ohne Lehrkraft")}, ${esc(b)}">
      <span class="s">${esc(l.subject)}</span><span class="a">${esc(a)}</span><span class="b">${esc(b)}</span></button>`;
  }).join("");
  grid.innerHTML = h;
  focusT = "";
}

function go(id: number | null): void {
  current = id;
  closePop();
  const url = new URL(location.href);
  url.searchParams.set("ansicht", kind);
  if (id) url.searchParams.set("id", String(id)); else url.searchParams.delete("id");
  history.replaceState(null, "", url);
  // the tiles animate in by themselves; a view transition snapshot of the whole panel was too slow
  renderList(); renderPlan();
}
function setKind(k: Kind): void {
  kind = k; q = "";
  el<HTMLInputElement>("[data-q]").value = "";
  document.querySelectorAll<HTMLButtonElement>("[data-kind]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.kind === k)));
}
function step(dir: number): void {
  const list = visible();
  if (!list.length) return;
  const i = list.findIndex((x) => x.id === current);
  go(list[(i + dir + list.length) % list.length]!.id);
}

el("[data-list]").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-id]");
  if (b) go(Number(b.dataset.id));
});
el<HTMLInputElement>("[data-q]").addEventListener("input", (e) => { q = (e.target as HTMLInputElement).value.trim().toLowerCase(); renderList(); });
document.querySelectorAll<HTMLButtonElement>("[data-kind]").forEach((b) => b.addEventListener("click", () => {
  setKind(b.dataset.kind as Kind);
  go(items(kind)[0]?.id ?? null);
}));
el("[data-prev]").addEventListener("click", () => step(-1));
el("[data-next]").addEventListener("click", () => step(1));
addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input, textarea, select")) return;
  if (e.key === "ArrowRight") step(1);
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "Escape") { closePop(); toggleMenu(false); }
});

// hover a lesson: light up everything that teacher teaches in this plan
// Dimming the other lessons repaints the whole grid, which is slow on computers without graphics
// acceleration. So it switches instantly (no fade) and only once the pointer rests on a lesson;
// sweeping across the plan just shows the hover ring.
let focusT = "", focusTimer = 0;
function setFocus(t: string): void {
  if (t === focusT) return;
  focusT = t;
  grid.classList.toggle("focus", !!t);
  if (t) for (const x of grid.querySelectorAll<HTMLElement>(".tile")) x.classList.toggle("match", x.dataset.t === t);
}
grid.addEventListener("pointerover", (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>(".tile");
  const next = t && kind !== "lehrer" ? t.dataset.t ?? "" : "";
  clearTimeout(focusTimer);
  if (!next) { setFocus(""); return; }
  focusTimer = window.setTimeout(() => setFocus(next), 120);
});
grid.addEventListener("pointerleave", () => { clearTimeout(focusTimer); setFocus(""); });

// click a lesson: details and jumps to the related plans
let pop: HTMLElement | null = null;
function closePop(): void { pop?.remove(); pop = null; }
grid.addEventListener("click", (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>(".tile");
  if (!t || !school) return;
  e.stopPropagation();
  closePop();
  const l = school.lessons.find((x) => x.key === Number(t.dataset.k));
  if (!l) return;
  const plan = el("[data-plan]"), pr = plan.getBoundingClientRect(), tr = t.getBoundingClientRect();
  const from = HOUR_TIMES[l.hour]?.[0], to = HOUR_TIMES[l.hour + l.len - 1]?.[1];
  pop = document.createElement("div");
  pop.className = "pop";
  pop.style.setProperty("--c", rgb(l.color));
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", title(l.subjectName));
  const teacherLinks = kind === "lehrer" ? "" : l.teachers.map((x) => `<button type="button" data-jump="lehrer:${x.id}">Plan von ${esc(x.sym)} öffnen ${icon("arrow")}</button>`).join("");
  pop.innerHTML = `<button type="button" class="close" aria-label="Schließen">${icon("close")}</button>
    <h3><i></i>${esc(title(l.subjectName))}</h3>
    <dl><dt>Wann</dt><dd>${dayName(l.day)}, ${l.hour}.${l.len > 1 ? `–${l.hour + l.len - 1}.` : ""} Stunde${from && to ? ` · <span class="num">${from}–${to}</span>` : ""}</dd>
    <dt>Klasse</dt><dd>${esc(l.cls.toUpperCase())}</dd>
    <dt>Lehrkraft</dt><dd>${l.teachers.length ? l.teachers.map((x) => `${esc(x.name)} (${esc(x.sym)})`).join(", ") : "keine"}</dd>
    <dt>Raum</dt><dd>${l.room ? esc(l.room) : "kein Raum"}</dd>
    ${l.len > 1 ? "<dt>Form</dt><dd>Doppelstunde</dd>" : ""}</dl>
    <div class="links">${teacherLinks}
      ${kind !== "klasse" ? `<button type="button" data-jump="klasse:${l.classId}">Plan der ${esc(l.cls.toUpperCase())} öffnen ${icon("arrow")}</button>` : ""}
      ${kind !== "raum" && l.roomId ? `<button type="button" data-jump="raum:${l.roomId}">Raum ${esc(l.room)} öffnen ${icon("arrow")}</button>` : ""}
    </div>`;
  plan.append(pop);
  let left = tr.right - pr.left + 10, top = tr.top - pr.top;
  if (left + 300 > pr.width) left = tr.left - pr.left - 300;
  top = Math.min(top, pr.height - pop.offsetHeight - 10);
  Object.assign(pop.style, { left: `${Math.max(10, left)}px`, top: `${Math.max(10, top)}px` });
  pop.querySelector(".close")!.addEventListener("click", closePop);
  pop.querySelector<HTMLButtonElement>(".close")!.focus();
  pop.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const j = (ev.target as HTMLElement).closest<HTMLElement>("[data-jump]");
    if (!j) return;
    const [k, id] = j.dataset.jump!.split(":");
    setKind(k as Kind);
    go(Number(id));
  });
});
document.addEventListener("click", closePop);

// ---------- states ----------
function setChip(state: string, text: string): void {
  const chip = el("[data-chip]");
  chip.dataset.state = state;
  el("[data-chip-text]").textContent = text;
}
function showWhole(html: string): void {
  el("[data-summary]").hidden = true;
  el("[data-main]").classList.add("bare");
  el("[data-content]").innerHTML = `<section class="glass whole state">${html}</section>`;
}

async function load(): Promise<void> {
  try {
    const [d, isRunning, ranBefore] = await Promise.all([store.all(), store.isRunning(), store.hasRunBefore()]);
    data = d;
    running = isRunning;
    if (!d.classes.length || !d.classSubjects.length) {
      setChip("loading", "Keine Daten");
      showWhole(`<div><b>Noch kein Stundenplan</b><p>Es sind noch keine Klassen und Fächer angelegt. Importieren Sie zuerst die Daten des Schuljahres.</p><a class="btn btn-dark" href="./import.html">Zum Import ${icon("arrow")}</a></div>`);
      el<HTMLButtonElement>("[data-export]").disabled = true;
      return;
    }
    school = await loadSchool(d.classes);
    if (running) setChip("running", "Läuft · Zwischenstand");
    else if (!ranBefore) setChip("paused", "Noch nicht optimiert");
    else setChip("done", school.cost !== null ? `Fertig · Kosten ${num(school.cost)}` : "Fertig");
    const banner = el("[data-banner]");
    if (running) banner.innerHTML = `<div class="banner banner-warn">${icon("info")}<span>Die Optimierung läuft noch. Sie sehen einen Zwischenstand.</span><button type="button" class="btn btn-glass" data-reload>Aktualisieren</button></div>`;
    else if (!ranBefore) banner.innerHTML = `<div class="banner banner-warn">${icon("info")}<span>Der Plan wurde noch nicht optimiert. Das ist eine zufällige Ausgangsverteilung.</span><a class="btn btn-glass" href="./optimierung.html">Zur Optimierung</a></div>`;
    else banner.innerHTML = "";
    banner.querySelector("[data-reload]")?.addEventListener("click", () => { store.invalidate("running"); void load(); });
    setKind(kind);
    if (!current || !items(kind).some((i) => i.id === current)) current = items(kind)[0]?.id ?? null;
    renderSummary();
    go(current);
  } catch {
    setChip("error", "Server offline");
    el<HTMLButtonElement>("[data-export]").disabled = true;
    el<HTMLButtonElement>("[data-print]").disabled = true;
    showWhole(`<div><b>Server nicht erreichbar</b><p>Der Stundenplan erscheint, sobald die Verbindung zum Server steht.</p><button type="button" class="btn btn-dark" data-retry>${icon("redo")}Erneut versuchen</button></div>`);
    document.querySelector("[data-retry]")?.addEventListener("click", () => location.reload());
  }
}

el("[data-list]").innerHTML = `<li class="empty">Lädt …</li>`;
grid.innerHTML = `<div class="state" style="grid-column:1/-1"><div><div class="spinner" aria-hidden="true"></div><p>Lädt den Stundenplan …</p></div></div>`;
void load();
void shell;
