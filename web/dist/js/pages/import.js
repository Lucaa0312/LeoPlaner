// 1 Import: drop files, see what they were recognised as, and keep the import report
// (warnings and feasibility used to be thrown away when the dialog closed).
import { renderShell } from "../glas/shell.js";
import { el, esc, icon, num } from "../glas/ui.js";
import { store } from "../glas/store.js";
import { renderAdminActions, lastImport, saveImport, when } from "../glas/admin.js";
import { API_BASE_URL } from "../utils/apiBase.js";
const shell = renderShell({ active: "import", ownsStep: true });
const ALLOWED = [".xlsx", ".xls", ".txt", ".sql", ".json"];
const MAX_MB = 5;
const drop = el("[data-drop]"), input = el("[data-input]"), pick = el("[data-pick]");
el("[data-big]").innerHTML = icon("upload");
pick.innerHTML = `${icon("file")}Dateien auswählen`;
let uploading = false;
function setChip(state, text) {
    el("[data-chip]").dataset.state = state;
    el("[data-chip-text]").textContent = text;
    shell.setStep("import", state === "done" ? "done" : "active", state === "done" ? "Daten da" : "");
}
function showError(text) {
    el("[data-error]").innerHTML = text ? `<div class="banner banner-error" role="alert">${icon("alert")}<span>${esc(text)}</span></div>` : "";
}
// only what the browser can check cheaply; the server decides what a file really is
function checkFiles(files) {
    for (const f of files) {
        if (!ALLOWED.some((ext) => f.name.toLowerCase().endsWith(ext)))
            return `„${f.name}“: nur Excel-Dateien (.xlsx, .xls) oder Schuldaten (.sql, .txt, .json) sind erlaubt.`;
        if (f.size > MAX_MB * 1024 * 1024)
            return `„${f.name}“ ist größer als ${MAX_MB} MB.`;
        if (f.size === 0)
            return `„${f.name}“ ist leer.`;
        if (f.name.length > 255)
            return "Ein Dateiname ist zu lang.";
    }
    return null;
}
async function upload(files) {
    if (uploading || !files.length)
        return;
    showError("");
    const problem = checkFiles(files);
    if (problem) {
        showError(problem);
        return;
    }
    uploading = true;
    drop.classList.add("busy");
    el("[data-big]").innerHTML = `<span class="spinner" aria-hidden="true"></span>`;
    el("[data-drop-title]").textContent = `${files.length === 1 ? "Datei wird" : `${files.length} Dateien werden`} importiert …`;
    pick.disabled = true;
    const form = new FormData();
    for (const f of files)
        form.append("files", f, f.name);
    let ok = false, answer;
    try {
        const r = await fetch(`${API_BASE_URL}/import`, { method: "POST", body: form });
        ok = r.ok;
        try {
            answer = (await r.json());
        }
        catch {
            answer = { message: `Fehler beim Hochladen (Status ${r.status}).`, files: [], warnings: [] };
        }
    }
    catch {
        answer = { message: "Der Server ist nicht erreichbar. Bitte prüfen Sie, ob er läuft.", files: [], warnings: [] };
    }
    uploading = false;
    drop.classList.remove("busy");
    el("[data-big]").innerHTML = icon("upload");
    el("[data-drop-title]").textContent = "Dateien hierher ziehen";
    pick.disabled = false;
    if (!ok) {
        showError(answer.message);
        renderFiles(answer.files, true);
        return;
    }
    store.invalidate();
    const d = await store.all().catch(() => null);
    const g = answer.schoolData?.gpu ?? null, t = answer.schoolData?.teachers ?? null;
    const counts = d ? [["Lehrer", d.teachers.length], ["Klassen", d.classes.length], ["Fächer", d.subjects.length], ["Räume", d.rooms.length], ["Zuteilungen", d.classSubjects.length]] : [];
    if (g)
        counts.push(["Unterrichtseinheiten", g.lessons]);
    if (t)
        counts.push(["gesperrte Stunden", t.nonWorkingHours], ["Wunsch-Stunden", t.nonPreferredHours]);
    const skipped = g?.skippedLessons ? Object.entries(g.skippedLessons).map(([why, n]) => `${n} Unterrichtseinheiten übersprungen: ${why}`) : [];
    const rec = {
        at: new Date().toISOString(),
        message: answer.message,
        files: answer.files,
        warnings: [...(answer.warnings ?? []), ...(t?.warnings ?? []), ...(g?.warnings ?? []), ...skipped],
        feasibility: g?.feasibility ?? [],
        counts,
    };
    saveImport(rec);
    renderReport(rec, true);
    shell.refresh();
    void refreshChip();
    el("[data-report]").scrollIntoView({ behavior: "smooth", block: "start" });
}
function renderFiles(files, failed) {
    const r = el("[data-report]");
    if (!files.length) {
        if (failed)
            r.hidden = true;
        return;
    }
    r.hidden = false;
    r.innerHTML = `<div class="panel-head"><h2 class="panel-title">Erkannte Dateien</h2></div>${fileList(files)}`;
}
function fileList(files) {
    return `<ul class="files">${files.map((f) => {
        const known = f.type !== "nicht erkannt";
        return `<li class="${known ? "" : "bad"}">${icon(known ? "check2" : "alert")}<span>${esc(f.name)}</span><span class="ty">${esc(f.type)}</span></li>`;
    }).join("")}</ul>`;
}
function renderReport(rec, fresh) {
    const r = el("[data-report]");
    r.hidden = false;
    const msgs = (list, cls, ic) => list.map((m) => `<div class="msg ${cls}">${icon(ic)}<span>${esc(m)}</span></div>`).join("");
    r.innerHTML = `
    <div class="panel-head"><h2 class="panel-title">Importbericht</h2><span class="muted" style="font-size:13px">${fresh ? "gerade eben" : `vom <span class="num">${esc(when(rec.at))}</span>`}</span></div>
    <p>${esc(rec.message)}</p>
    ${rec.counts.length ? `<div class="figs">${rec.counts.map(([k, v]) => `<div><b>${num(v)}</b><span>${esc(k)}</span></div>`).join("")}</div>` : ""}
    ${rec.files.length ? `<h3 class="sub-title">Dateien</h3>${fileList(rec.files)}` : ""}
    ${rec.feasibility.length ? `<h3 class="sub-title">Nicht lösbar (${rec.feasibility.length})</h3><p class="hint">Diese Punkte kann keine Anordnung lösen. Sie müssen in den Daten geändert werden.</p>${msgs(rec.feasibility, "error", "alert")}` : ""}
    ${rec.warnings.length ? `<h3 class="sub-title">Hinweise (${rec.warnings.length})</h3>${msgs(rec.warnings, "warn", "info")}` : ""}
    ${!rec.feasibility.length && !rec.warnings.length ? `<p class="muted" style="margin-top:8px">Der Import hat keine Hinweise gemeldet.</p>` : ""}
    <div class="toolbar" style="margin-top:16px"><span class="sp"></span><a class="btn btn-dark" href="./pruefung.html">Weiter zur Prüfung ${icon("arrow")}</a></div>`;
}
// ---------- drag and drop, picker ----------
pick.addEventListener("click", () => input.click());
input.addEventListener("change", () => { const fs = [...(input.files ?? [])]; input.value = ""; void upload(fs); });
for (const ev of ["dragenter", "dragover"])
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); });
for (const ev of ["dragleave", "drop"])
    drop.addEventListener(ev, () => drop.classList.remove("over"));
drop.addEventListener("drop", (e) => { e.preventDefault(); void upload([...(e.dataTransfer?.files ?? [])]); });
// a file dropped next to the zone must not open in the browser and leave the app
addEventListener("dragover", (e) => e.preventDefault());
addEventListener("drop", (e) => e.preventDefault());
async function refreshChip() {
    try {
        const d = await store.all();
        const has = d.classSubjects.length > 0;
        setChip(has ? "done" : "loading", has ? `${d.teachers.length} Lehrer · ${d.classes.length} Klassen` : "Noch keine Daten");
        el("[data-replace]").textContent = has ? "Ein Import ändert die vorhandenen Stammdaten. Danach sollte die Optimierung neu laufen." : "";
    }
    catch {
        setChip("error", "Server offline");
    }
}
void refreshChip();
void renderAdminActions(el("[data-admin]"), () => { shell.refresh(); void refreshChip(); const rec = lastImport(); if (!rec)
    el("[data-report]").hidden = true; });
const rec = lastImport();
if (rec)
    renderReport(rec, false);
