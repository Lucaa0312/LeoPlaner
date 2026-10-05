// Stammdaten · Lehrer: table + detail with subjects and the availability week.
import { masterDetail, field, input, fieldError, problemList } from "../glas/masterDetail.js";
import { busy, confirmDialog, esc, icon, title, toast } from "../glas/ui.js";
import { DAYS, DAY_HOURS, DAY_SHORT, rgb, send, store, teacherFreeSlots, teacherLoad, HttpError } from "../glas/store.js";
let subjects = [];
let classSubjects = [];
let load = new Map();
const sym = (t) => t.nameSymbol.toUpperCase();
const loadCell = (t) => {
    const h = load.get(t.id) ?? 0, free = teacherFreeSlots(t, classSubjects);
    const pct = free ? Math.min(100, Math.round((h / free) * 100)) : 100;
    return `<span class="load"><span class="num">${h}/${free}</span><span class="bar${h > free ? " over" : ""}" aria-hidden="true"><i style="width:${pct}%"></i></span></span>`;
};
masterDetail({
    page: "lehrer",
    kind: "lehrer",
    noun: "Lehrkraft",
    addLabel: "Lehrkraft hinzufügen",
    id: (t) => t.id,
    searchText: (t) => `${t.teacherName} ${t.nameSymbol} ${t.teachingSubject.map((s) => `${s.subjectSymbol} ${s.subjectName}`).join(" ")}`,
    load: async () => {
        const [ts, ss, cs] = await Promise.all([store.teachers(), store.subjects(), store.classSubjects()]);
        subjects = ss;
        classSubjects = cs;
        load = teacherLoad(cs);
        return ts;
    },
    columns: [
        { label: "Kürzel", cell: (t) => `<span class="code">${esc(sym(t))}</span>`, sort: sym },
        { label: "Name", cell: (t) => `<span class="nm">${esc(t.teacherName)}</span>`, sort: (t) => t.teacherName },
        { label: "Fächer", compact: true, cell: (t) => `<span class="mini">${t.teachingSubject.slice(0, 4).map((s) => `<span class="tag">${esc(s.subjectSymbol.toUpperCase())}</span>`).join("")}${t.teachingSubject.length > 4 ? `<span class="mut">+${t.teachingSubject.length - 4}</span>` : ""}</span>` },
        { label: "Stunden / frei", num: true, cell: loadCell, sort: (t) => (load.get(t.id) ?? 0) / Math.max(1, teacherFreeSlots(t, classSubjects)) },
    ],
    idle: (items) => `<b>${items.length} Lehrkräfte</b>Wählen Sie eine Lehrkraft, um ihre Fächer und ihre Verfügbarkeit zu sehen und zu ändern.`,
    detail: renderDetail,
});
// ---------- detail ----------
const STATES = ["Verfügbar", "Will nicht", "Kann nicht"];
function renderDetail(t, api) {
    const root = api.body;
    const mine = t ? classSubjects.filter((cs) => cs.teacher.some((x) => x.id === t.id)) : [];
    const hours = t ? load.get(t.id) ?? 0 : 0;
    const free = t ? teacherFreeSlots(t, classSubjects) : DAYS.length * DAY_HOURS;
    const classes = [...new Set(mine.map((cs) => cs.className.toUpperCase()))];
    // availability state per cell: 0 free, 1 will nicht, 2 kann nicht
    const key = (d, h) => `${DAYS[d]}:${h}`;
    const state = new Map();
    for (const s of t?.teacherNonPreferredHours ?? [])
        state.set(`${s.day}:${s.schoolHour}`, 1);
    for (const s of t?.teacherNonWorkingHours ?? [])
        state.set(`${s.day}:${s.schoolHour}`, 2);
    const touched = new Set();
    let brush = 2;
    let picked = new Set((t?.teachingSubject ?? []).map((s) => s.id));
    let subjQ = "";
    const avail = () => {
        let h = `<div class="h"></div>${DAY_SHORT.map((d) => `<div class="h">${d}</div>`).join("")}`;
        for (let hr = 1; hr <= DAY_HOURS; hr++) {
            h += `<div class="r">${hr}</div>`;
            for (let d = 0; d < 5; d++) {
                const s = state.get(key(d, hr)) ?? 0;
                h += `<button type="button" data-cell="${key(d, hr)}" data-s="${s}" aria-label="${DAY_SHORT[d]} ${hr}. Stunde: ${STATES[s]}"></button>`;
            }
        }
        return h;
    };
    const subjPick = () => {
        const list = subjects.filter((s) => !subjQ || `${s.subjectName} ${s.subjectSymbol}`.toLowerCase().includes(subjQ))
            .sort((a, b) => Number(picked.has(b.id)) - Number(picked.has(a.id)) || a.subjectSymbol.localeCompare(b.subjectSymbol, "de"));
        return list.length ? list.map((s) => `<button type="button" class="tchip" data-subj="${s.id}" aria-pressed="${picked.has(s.id)}" title="${esc(title(s.subjectName))}">${icon("check", "ic ck")}<span class="sw" style="background:${rgb(s.subjectColor)}"></span>${esc(s.subjectSymbol.toUpperCase())}</button>`).join("")
            : `<span class="muted" style="font-size:13.5px">Kein Fach gefunden.</span>`;
    };
    root.innerHTML = `
    <div class="det-head"><div class="tt"><h2>${t ? esc(t.teacherName) : "Neue Lehrkraft"}</h2><p>${t ? `${esc(sym(t))} · ${hours} Wochenstunden in ${classes.length} ${classes.length === 1 ? "Klasse" : "Klassen"}` : "Name, Kürzel, Fächer und Verfügbarkeit"}</p></div>
      <button type="button" class="close" aria-label="Schließen" data-close>${icon("close")}</button></div>
    ${problemList(api.findings)}
    ${t ? `<div class="facts2" style="margin-bottom:14px"><div class="${hours > free ? "bad" : ""}"><b>${hours}</b><span>Stunden zugeteilt</span></div><div><b>${free}</b><span>Einheiten frei</span></div><div><b>${classes.length}</b><span>${classes.length === 1 ? "Klasse" : "Klassen"}</span></div></div>` : ""}
    <form class="form" data-form novalidate>
      ${field("Name", input("t-name", t?.teacherName ?? "", 'required maxlength="120"'), { id: "t-name" })}
      ${field("Kürzel", input("t-sym", t?.nameSymbol ?? "", 'required maxlength="10"'), { id: "t-sym" })}
    </form>
    <div class="sect" style="margin-top:14px"><h3>Unterrichtsfächer <span class="muted" data-subj-count>${picked.size} gewählt</span></h3>
      <label class="search"><span class="sr">Fächer suchen</span>${icon("search")}<input data-subj-q placeholder="Fach suchen …" autocomplete="off" /></label>
      <div class="chips subj-pick" data-subjects>${subjPick()}</div>
    </div>
    <div class="sect"><h3>Verfügbarkeit <span class="muted">Mo–Fr, 1.–10. Stunde</span></h3>
      <div class="paint seg" role="group" aria-label="Pinsel">${STATES.map((s, i) => `<button type="button" data-brush="${i}" aria-pressed="${i === brush}">${s}</button>`).join("")}</div>
      <div class="avail" data-avail>${avail()}</div>
      <div class="legend2"><span><i></i>verfügbar</span><span><i class="s1"></i>will nicht (Wunsch)</span><span><i class="s2"></i>kann nicht (gesperrt)</span></div>
      <p class="hint" style="margin-top:6px">Pinsel wählen, dann Stunden anklicken oder darüberziehen.</p>
    </div>
    ${t?.wishText ? `<div class="sect"><h3>Wunsch aus dem Import</h3><div class="wish">${esc(t.wishText)}</div></div>` : ""}
    ${t ? `<div class="sect"><h3>Unterricht <span class="muted">${mine.length} Zuteilungen</span></h3>${mine.length ? `<ul class="lines">${mine.map((cs) => `<li><span class="tag">${esc(cs.className.toUpperCase())}</span><span class="grow">${esc(cs.subject ? title(cs.subject.subjectName) : "Fach fehlt")}</span><span class="num">${cs.weeklyHours} Std.</span></li>`).join("")}</ul>` : `<p class="muted" style="font-size:13.5px">Keine Zuteilungen.</p>`}</div>` : ""}
    <div class="det-foot">
      <button type="button" class="btn btn-dark" data-save>${icon("check")}${t ? "Speichern" : "Anlegen"}</button>
      <button type="button" class="btn btn-quiet" data-reset hidden>Verwerfen</button>
      <span class="sp"></span>
      ${t ? `<a class="btn btn-quiet" href="./ergebnis.html?ansicht=lehrer&id=${t.id}">${icon("calendar")}Plan</a>` : ""}
      ${t && !mine.length ? `<button type="button" class="btn btn-quiet" data-delete aria-label="Löschen">${icon("trash")}</button>` : ""}
    </div>`;
    const dirty = () => { api.setDirty(true); root.querySelector("[data-reset]").hidden = false; };
    root.querySelector("[data-close]").addEventListener("click", api.close);
    root.querySelector("[data-reset]").addEventListener("click", () => { api.setDirty(false); renderDetail(t, api); });
    root.querySelector("[data-form]").addEventListener("input", dirty);
    root.querySelector("[data-form]").addEventListener("submit", (e) => e.preventDefault());
    // subjects
    const subjBox = root.querySelector("[data-subjects]");
    root.querySelector("[data-subj-q]").addEventListener("input", (e) => { subjQ = e.target.value.trim().toLowerCase(); subjBox.innerHTML = subjPick(); });
    subjBox.addEventListener("click", (e) => {
        const b = e.target.closest("[data-subj]");
        if (!b)
            return;
        const id = Number(b.dataset.subj);
        picked = new Set(picked);
        if (picked.has(id))
            picked.delete(id);
        else
            picked.add(id);
        b.setAttribute("aria-pressed", String(picked.has(id)));
        root.querySelector("[data-subj-count]").textContent = `${picked.size} gewählt`;
        dirty();
    });
    // availability painting: pointer down starts, moving over cells paints with the brush
    const grid = root.querySelector("[data-avail]");
    let painting = false;
    const paint = (b) => {
        const k = b.dataset.cell;
        if ((state.get(k) ?? 0) === brush)
            return;
        if (brush)
            state.set(k, brush);
        else
            state.delete(k);
        touched.add(k);
        b.dataset.s = String(brush);
        const [day, hr] = k.split(":");
        b.setAttribute("aria-label", `${DAY_SHORT[DAYS.indexOf(day)]} ${hr}. Stunde: ${STATES[brush]}`);
        dirty();
    };
    grid.addEventListener("pointerdown", (e) => {
        const b = e.target.closest("[data-cell]");
        if (!b)
            return;
        painting = true;
        grid.setPointerCapture(e.pointerId);
        paint(b);
    });
    grid.addEventListener("pointermove", (e) => {
        if (!painting)
            return;
        const b = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-cell]");
        if (b && grid.contains(b))
            paint(b);
    });
    const stop = () => { painting = false; };
    grid.addEventListener("pointerup", stop);
    grid.addEventListener("pointercancel", stop);
    grid.addEventListener("keydown", (e) => {
        const b = e.target.closest("[data-cell]");
        if (b && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            paint(b);
        }
    });
    root.querySelector(".paint").addEventListener("click", (e) => {
        const b = e.target.closest("[data-brush]");
        if (!b)
            return;
        brush = Number(b.dataset.brush);
        root.querySelectorAll("[data-brush]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    });
    // save
    const save = root.querySelector("[data-save]");
    save.addEventListener("click", async () => {
        const name = root.querySelector("#t-name").value.trim();
        const symbol = root.querySelector("#t-sym").value.trim();
        fieldError(root, "t-name", "");
        fieldError(root, "t-sym", "");
        if (!name) {
            fieldError(root, "t-name", "Bitte einen Namen eingeben.");
            return;
        }
        if (!symbol) {
            fieldError(root, "t-sym", "Bitte ein Kürzel eingeben.");
            return;
        }
        const all = await store.teachers().catch(() => []);
        if (all.some((x) => x.id !== t?.id && x.nameSymbol.toLowerCase() === symbol.toLowerCase())) {
            fieldError(root, "t-sym", `Das Kürzel ${symbol.toUpperCase()} gibt es schon.`);
            return;
        }
        // keep slots we do not show (evening hours) and cells nobody touched exactly as they were
        const nonWorking = [], nonPreferred = [];
        const orig = (list, k) => !!list?.some((s) => `${s.day}:${s.schoolHour}` === k);
        for (const d of DAYS)
            for (let h = 1; h <= DAY_HOURS; h++) {
                const k = `${d}:${h}`;
                if (touched.has(k)) {
                    const s = state.get(k) ?? 0;
                    if (s === 2)
                        nonWorking.push({ day: d, schoolHour: h });
                    if (s === 1)
                        nonPreferred.push({ day: d, schoolHour: h });
                }
                else {
                    if (orig(t?.teacherNonWorkingHours, k))
                        nonWorking.push({ day: d, schoolHour: h });
                    if (orig(t?.teacherNonPreferredHours, k))
                        nonPreferred.push({ day: d, schoolHour: h });
                }
            }
        for (const s of t?.teacherNonWorkingHours ?? [])
            if (s.schoolHour > DAY_HOURS)
                nonWorking.push(s);
        for (const s of t?.teacherNonPreferredHours ?? [])
            if (s.schoolHour > DAY_HOURS)
                nonPreferred.push(s);
        const body = {
            teacherName: name,
            nameSymbol: symbol,
            teachingSubject: [...picked].map((id) => ({ id })),
            teacher_non_working_hours: nonWorking,
            teacher_non_preferred_hours: nonPreferred,
        };
        const restore = busy(save, "Speichert …");
        try {
            if (t)
                await send("PUT", `/teachers/update/${t.id}`, body);
            else
                await send("POST", "/teachers", body);
            toast(t ? "Gespeichert." : "Lehrkraft angelegt.");
            await api.saved((x) => x.nameSymbol.toLowerCase() === symbol.toLowerCase());
        }
        catch (e) {
            restore();
            toast(e instanceof HttpError ? `Speichern fehlgeschlagen (Status ${e.status}).` : "Server nicht erreichbar.");
        }
    });
    root.querySelector("[data-delete]")?.addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        if (!t)
            return;
        const ok = await confirmDialog({ title: `${t.teacherName} löschen?`, text: "Die Lehrkraft hat keine Zuteilungen. Sie wird endgültig gelöscht.", confirm: "Löschen", danger: true });
        if (!ok)
            return;
        const restore = busy(btn, "");
        try {
            await send("DELETE", `/teachers/delete/${t.id}`);
            toast("Lehrkraft gelöscht.");
            await api.removed();
        }
        catch (err) {
            restore();
            toast(err instanceof HttpError ? `Löschen fehlgeschlagen (Status ${err.status}).` : "Server nicht erreichbar.");
        }
    });
}
