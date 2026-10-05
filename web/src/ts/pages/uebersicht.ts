// Übersicht: where the school year stands and what to do next (Option A "Leitfaden").
import { renderShell } from "../glas/shell.js";
import { el, esc, icon, num } from "../glas/ui.js";
import { store, classHours, type Data } from "../glas/store.js";
import { downloadBaseData, lastImport, renderAdminActions, when } from "../glas/admin.js";

const shell = renderShell({ active: "uebersicht" });
const page = el("[data-page]");

type Status = { data: Data; running: boolean; ranBefore: boolean };

function renderEmpty(): void {
  el("[data-h1]").textContent = "Willkommen bei LeoPlaner";
  el("[data-actions]").innerHTML = "";
  page.innerHTML = `
    <p class="lead" data-arrive style="--o:1">Vom Import bis zum fertigen Stundenplan in drei Schritten. Beginnen Sie mit den Daten für das nächste Schuljahr.</p>
    <section class="glass panel" data-arrive style="--o:2">
      <div class="drop">
        <span class="big">${icon("upload")}</span>
        <b>Daten für das Schuljahr importieren</b>
        <p>Eine Excel-Datei mit Fächern, Räumen, Lehrern, Klassen und Zuteilungen, oder die Schuldaten (.sql, GPU006, GPU002 und die Wünsche als .json). Der Dateityp wird automatisch erkannt.</p>
        <a class="btn btn-dark" href="./import.html">${icon("upload")}Zum Import</a>
      </div>
      <div class="toolbar" style="margin-top:12px;justify-content:center" data-admin></div>
    </section>
    <div class="steps" data-arrive style="--o:3">
      ${[["1", "Import", "Daten einlesen und den Importbericht ansehen."], ["2", "Optimierung", "Den Algorithmus starten und zusehen, wie der Plan besser wird."], ["3", "Ergebnis & Export", "Pläne für Klassen, Lehrer und Räume ansehen, drucken, exportieren."]]
        .map(([n, t, p]) => `<div class="card glass is-later"><div class="ch"><span class="mark">${n}</span>${t}</div><p>${p}</p></div>`).join("")}
    </div>`;
  void renderAdminActions(el("[data-admin]"), reload, { hasData: false });
}

function nextStep(s: Status): { tone: string; kick: string; title: string; text: string; cta: string; href: string } {
  if (s.running) return { tone: "run", kick: "2 Optimierung · läuft", title: "Die Optimierung läuft", text: "Sie können zusehen, wie die Kosten sinken, oder den Zwischenstand ansehen.", cta: "Zur Optimierung", href: "./optimierung.html" };
  if (!s.ranBefore) return { tone: "ready", kick: "Nächster Schritt · 2 Optimierung", title: "Bereit für die Optimierung", text: "Die Daten sind da. Starten Sie den Algorithmus, um den Stundenplan zu erstellen.", cta: "Optimierung starten", href: "./optimierung.html" };
  return { tone: "done", kick: "3 Ergebnis & Export", title: "Der Stundenplan ist fertig", text: "Sehen Sie sich die Pläne für Klassen, Lehrer und Räume an, drucken oder exportieren Sie sie.", cta: "Ergebnis ansehen", href: "./ergebnis.html" };
}

function render(s: Status): void {
  const { data: d } = s;
  const hours = [...classHours(d.classSubjects).values()].reduce((a, b) => a + b, 0);
  const imp = lastImport();
  const n = nextStep(s);
  el("[data-h1]").textContent = "Übersicht";
  el("[data-actions]").innerHTML = `<a class="btn btn-glass" href="./import.html">${icon("upload")}<span class="lbl">Neu importieren</span></a><button type="button" class="btn btn-glass" data-export>${icon("download")}<span class="lbl">Stammdaten exportieren</span></button>`;
  el("[data-export]").addEventListener("click", () => void downloadBaseData());

  const card = (state: string, mark: string, name: string, body: string, link: string): string =>
    `<div class="card glass is-${state}"><div class="ch"><span class="mark">${mark}</span>${name}</div>${body}<div class="go">${link}</div></div>`;
  const check = icon("check");


  page.innerHTML = `
    <section class="next glass" data-tone="${n.tone}" data-arrive style="--o:1">
      <div class="txt"><div class="kick"><span class="dot"></span>${esc(n.kick)}</div><h2>${esc(n.title)}</h2><p>${esc(n.text)}</p></div>
      <a class="btn btn-dark" href="${n.href}">${esc(n.cta)} ${icon("arrow")}</a>
    </section>

    <div class="steps" data-arrive style="--o:2">
      ${card("done", check, "1 Import", `<p>${imp ? `Zuletzt am <span class="num">${esc(when(imp.at))}</span>` : "Daten sind vorhanden"}</p><p><span class="num">${d.teachers.length}</span> Lehrer, <span class="num">${d.classes.length}</span> Klassen, <span class="num">${num(hours)}</span> Wochenstunden</p>`,
        `<a class="link" href="./import.html${imp ? "#bericht" : ""}">${imp ? "Importbericht ansehen" : "Neu importieren"} ${icon("arrow")}</a>`)}
      ${card(s.running ? "now" : s.ranBefore ? "done" : "later", s.ranBefore && !s.running ? check : "2", "2 Optimierung", `<p>${s.running ? "Läuft gerade." : s.ranBefore ? "Mindestens ein Lauf ist fertig." : "Noch nicht gestartet."}</p>`, `<a class="link" href="./optimierung.html">${s.ranBefore || s.running ? "Zur Optimierung" : "Starten"} ${icon("arrow")}</a>`)}
      ${card(s.ranBefore ? "now" : "later", "3", "3 Ergebnis & Export", `<p>${s.ranBefore ? (s.running ? "Ein Zwischenstand ist da." : "Pläne für Klassen, Lehrer und Räume.") : "Noch kein optimierter Plan."}</p>`, `<a class="link" href="./ergebnis.html">Pläne ansehen ${icon("arrow")}</a>`)}
    </div>

    <div data-arrive style="--o:3">
      <section class="glass panel" aria-label="Stammdaten">
        <div class="panel-head"><h2 class="panel-title">Stammdaten</h2></div>
        <ul class="rows">
          ${([["lehrer", "Lehrer", d.teachers.length, "./lehrer.html"], ["klasse", "Klassen", d.classes.length, "./klassen.html"], ["fach", "Fächer", d.subjects.length, "./faecher.html"], ["raum", "Räume", d.rooms.length, "./raeume.html"]] as const)
            .map(([, label, count, href]) => `<li><a class="t link" style="color:var(--ink)" href="${href}">${label}</a><span class="num">${count}</span></li>`).join("")}
        </ul>
      </section>
    </div>

    <div class="toolbar" data-arrive style="--o:4"><span class="sp"></span><span data-admin class="toolbar"></span></div>`;
  void renderAdminActions(el("[data-admin]"), reload);
}

function renderError(): void {
  page.innerHTML = `<section class="glass state"><div><b>Server nicht erreichbar</b><p>Der aktuelle Stand erscheint, sobald die Verbindung zum Server steht.</p><button type="button" class="btn btn-dark" data-retry>${icon("redo")}Erneut versuchen</button></div></section>`;
  el("[data-retry]").addEventListener("click", reload);
}

async function load(): Promise<void> {
  try {
    const [data, running, ranBefore] = await Promise.all([store.all(), store.isRunning(), store.hasRunBefore()]);
    if (!data.classSubjects.length && !data.teachers.length) { renderEmpty(); return; }
    render({ data, running, ranBefore });
  } catch { renderError(); }
}
function reload(): void { store.invalidate(); shell.refresh(); void load(); }

void load();
