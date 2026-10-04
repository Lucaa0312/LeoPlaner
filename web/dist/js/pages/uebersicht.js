// Übersicht: where the school year stands and what to do next (Option A "Leitfaden").
import { renderShell } from "../glas/shell.js";
import { el, esc, icon, num } from "../glas/ui.js";
import { store, classHours } from "../glas/store.js";
import { countBy, findingHref, runChecks, summaryText, ENTITY_WORD } from "../glas/checks.js";
import { downloadBaseData, lastImport, renderAdminActions, when } from "../glas/admin.js";
const shell = renderShell({ active: "uebersicht" });
const page = el("[data-page]");
function sev(f) {
    return `<span class="sev ${f.sev}" aria-label="${f.sev === "error" ? "Fehler" : "Hinweis"}">${icon(f.sev === "error" ? "alert" : "info")}</span>`;
}
function renderEmpty() {
    el("[data-h1]").textContent = "Willkommen bei LeoPlaner";
    el("[data-actions]").innerHTML = "";
    page.innerHTML = `
    <p class="lead" data-arrive style="--o:1">Vom Import bis zum fertigen Stundenplan in vier Schritten. Beginnen Sie mit den Daten für das nächste Schuljahr.</p>
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
      ${[["1", "Import", "Daten einlesen und den Importbericht ansehen."], ["2", "Prüfung", "Fehlende oder widersprüchliche Daten finden und beheben."], ["3", "Optimierung", "Den Algorithmus starten und zusehen, wie der Plan besser wird."], ["4", "Ergebnis & Export", "Pläne für Klassen, Lehrer und Räume ansehen, drucken, exportieren."]]
        .map(([n, t, p]) => `<div class="card glass is-later"><div class="ch"><span class="mark">${n}</span>${t}</div><p>${p}</p></div>`).join("")}
    </div>`;
    void renderAdminActions(el("[data-admin]"), reload, { hasData: false });
}
function nextStep(s) {
    const { errors } = countBy(s.findings);
    if (s.running)
        return { tone: "run", kick: "3 Optimierung · läuft", title: "Die Optimierung läuft", text: "Sie können zusehen, wie die Kosten sinken, oder den Zwischenstand ansehen.", cta: "Zur Optimierung", href: "./optimierung.html" };
    if (errors)
        return { tone: "error", kick: "Nächster Schritt · 2 Prüfung", title: `${errors} ${errors === 1 ? "Problem verhindert" : "Probleme verhindern"} einen brauchbaren Plan`, text: "Beheben Sie diese Einträge, dann kann der Stundenplan erstellt werden.", cta: "Probleme beheben", href: "./pruefung.html" };
    if (!s.ranBefore)
        return { tone: "ready", kick: "Nächster Schritt · 3 Optimierung", title: "Bereit für die Optimierung", text: s.findings.length ? `Die Prüfung meldet keine Fehler, nur ${summaryText(s.findings)}.` : "Die Prüfung meldet keine Probleme.", cta: "Optimierung starten", href: "./optimierung.html" };
    return { tone: "done", kick: "4 Ergebnis & Export", title: "Der Stundenplan ist fertig", text: "Sehen Sie sich die Pläne für Klassen, Lehrer und Räume an, drucken oder exportieren Sie sie.", cta: "Ergebnis ansehen", href: "./ergebnis.html" };
}
function render(s) {
    const { data: d, findings } = s;
    const { errors } = countBy(findings);
    const hours = [...classHours(d.classSubjects).values()].reduce((a, b) => a + b, 0);
    const imp = lastImport();
    const n = nextStep(s);
    el("[data-h1]").textContent = "Übersicht";
    el("[data-actions]").innerHTML = `<a class="btn btn-glass" href="./import.html">${icon("upload")}<span class="lbl">Neu importieren</span></a><button type="button" class="btn btn-glass" data-export>${icon("download")}<span class="lbl">Stammdaten exportieren</span></button>`;
    el("[data-export]").addEventListener("click", () => void downloadBaseData());
    const card = (state, mark, name, body, link) => `<div class="card glass is-${state}"><div class="ch"><span class="mark">${mark}</span>${name}</div>${body}<div class="go">${link}</div></div>`;
    const check = icon("check");
    const byKind = (k) => {
        const fs = findings.filter((f) => f.kind === k), c = countBy(fs);
        return `${c.errors ? `<span class="badge err">${c.errors} Fehler</span>` : ""}${c.warns ? `<span class="badge warn">${c.warns} ${c.warns === 1 ? "Hinweis" : "Hinweise"}</span>` : ""}`;
    };
    const top = findings.slice(0, 6);
    page.innerHTML = `
    <section class="next glass" data-tone="${n.tone}" data-arrive style="--o:1">
      <div class="txt"><div class="kick"><span class="dot"></span>${esc(n.kick)}</div><h2>${esc(n.title)}</h2><p>${esc(n.text)}</p></div>
      <a class="btn btn-dark" href="${n.href}">${esc(n.cta)} ${icon("arrow")}</a>
    </section>

    <div class="steps" data-arrive style="--o:2">
      ${card("done", check, "1 Import", `<p>${imp ? `Zuletzt am <span class="num">${esc(when(imp.at))}</span>` : "Daten sind vorhanden"}</p><p><span class="num">${d.teachers.length}</span> Lehrer, <span class="num">${d.classes.length}</span> Klassen, <span class="num">${num(hours)}</span> Wochenstunden</p>`, `<a class="link" href="./import.html${imp ? "#bericht" : ""}">${imp ? "Importbericht ansehen" : "Neu importieren"} ${icon("arrow")}</a>`)}
      ${card(errors ? "error" : "done", errors ? "2" : check, "2 Prüfung", `<p>${esc(summaryText(findings))}</p>${errors ? "<p>Fehler sollten vor dem Start behoben werden.</p>" : ""}`, `<a class="link" href="./pruefung.html">Zur Prüfung ${icon("arrow")}</a>`)}
      ${card(s.running ? "now" : s.ranBefore ? "done" : "later", s.ranBefore && !s.running ? check : "3", "3 Optimierung", `<p>${s.running ? "Läuft gerade." : s.ranBefore ? "Mindestens ein Lauf ist fertig." : "Noch nicht gestartet."}</p>`, `<a class="link" href="./optimierung.html">${s.ranBefore || s.running ? "Zur Optimierung" : "Starten"} ${icon("arrow")}</a>`)}
      ${card(s.ranBefore ? "now" : "later", "4", "4 Ergebnis & Export", `<p>${s.ranBefore ? (s.running ? "Ein Zwischenstand ist da." : "Pläne für Klassen, Lehrer und Räume.") : "Noch kein optimierter Plan."}</p>`, `<a class="link" href="./ergebnis.html">Pläne ansehen ${icon("arrow")}</a>`)}
    </div>

    <div class="duo" data-arrive style="--o:3">
      <section class="glass panel" aria-label="Probleme">
        <div class="panel-head"><h2 class="panel-title">Probleme</h2><span class="muted" style="font-size:13px">aus der Prüfung</span></div>
        ${top.length ? `<ul class="rows">${top.map((f) => `<li>${sev(f)}<span class="t"><span class="tag">${esc(f.tag)}</span> ${esc(f.text)}</span><a class="link" href="${findingHref(f)}">${ENTITY_WORD[f.kind]} öffnen ${icon("arrow")}</a></li>`).join("")}</ul>
          ${findings.length > top.length ? `<p class="more">und ${findings.length - top.length} weitere · <a class="link" href="./pruefung.html">alle ansehen</a></p>` : ""}`
        : `<p class="muted">Keine Probleme gefunden.</p>`}
      </section>
      <section class="glass panel" aria-label="Stammdaten">
        <div class="panel-head"><h2 class="panel-title">Stammdaten</h2></div>
        <ul class="rows">
          ${[["lehrer", "Lehrer", d.teachers.length, "./lehrer.html"], ["klasse", "Klassen", d.classes.length, "./klassen.html"], ["fach", "Fächer", d.subjects.length, "./faecher.html"], ["raum", "Räume", d.rooms.length, "./raeume.html"]]
        .map(([k, label, count, href]) => `<li><a class="t link" style="color:var(--ink)" href="${href}">${label}</a>${byKind(k)}<span class="num">${count}</span></li>`).join("")}
        </ul>
      </section>
    </div>

    <div class="toolbar" data-arrive style="--o:4"><span class="sp"></span><span data-admin class="toolbar"></span></div>`;
    void renderAdminActions(el("[data-admin]"), reload);
}
function renderError() {
    page.innerHTML = `<section class="glass state"><div><b>Server nicht erreichbar</b><p>Der aktuelle Stand erscheint, sobald die Verbindung zum Server steht.</p><button type="button" class="btn btn-dark" data-retry>${icon("redo")}Erneut versuchen</button></div></section>`;
    el("[data-retry]").addEventListener("click", reload);
}
async function load() {
    try {
        const [data, running, ranBefore] = await Promise.all([store.all(), store.isRunning(), store.hasRunBefore()]);
        if (!data.classSubjects.length && !data.teachers.length) {
            renderEmpty();
            return;
        }
        render({ data, findings: runChecks(data), running, ranBefore });
    }
    catch {
        renderError();
    }
}
function reload() { store.invalidate(); shell.refresh(); void load(); }
void load();
