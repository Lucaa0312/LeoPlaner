// Stammdaten · Klassen: read-only, because the backend has no endpoints to change classes or their
// class subjects yet (BACKEND_TODO #18). Shows hours against the week and every assignment.
import { masterDetail, problemList } from "../glas/masterDetail.js";
import { esc, icon, title } from "../glas/ui.js";
import { classCapacity, isEvening, rgb, store } from "../glas/store.js";
let classSubjects = [];
const mine = (c) => classSubjects.filter((cs) => cs.className === c.className);
const hours = (c) => mine(c).reduce((a, cs) => a + cs.weeklyHours, 0);
const room = (c) => c.roomDTO ? (c.roomDTO.nameShort || String(c.roomDTO.roomNumber)).toUpperCase() : "";
masterDetail({
    page: "klassen",
    kind: "klasse",
    noun: "Klasse",
    id: (c) => c.id,
    searchText: (c) => `${c.className} ${room(c)}`,
    note: "Klassen und ihre Fächer kommen aus dem Import. Ändern lassen sie sich hier noch nicht, dafür fehlen Endpunkte im Backend.",
    load: async () => {
        const [cs, list] = await Promise.all([store.classSubjects(), store.classes()]);
        classSubjects = cs;
        return list;
    },
    columns: [
        { label: "Klasse", cell: (c) => `<span class="code">${esc(c.className.toUpperCase())}</span>`, sort: (c) => c.className },
        { label: "Stammraum", cell: (c) => room(c) ? `<span class="tag">${esc(room(c))}</span>` : `<span class="mut">keiner</span>`, sort: (c) => room(c) || "~" },
        { label: "Fächer", num: true, cell: (c) => String(mine(c).length), sort: (c) => mine(c).length },
        { label: "Wochenstunden", num: true, cell: (c) => {
                const h = hours(c), cap = classCapacity(c.className);
                return `<span class="load"><span class="num">${h}/${cap}</span><span class="bar${h > cap ? " over" : ""}" aria-hidden="true"><i style="width:${Math.min(100, Math.round((h / cap) * 100))}%"></i></span></span>`;
            }, sort: hours },
    ],
    idle: (items) => `<b>${items.length} Klassen</b>Wählen Sie eine Klasse, um ihre Fächer, Lehrkräfte und Wochenstunden zu sehen.`,
    detail: renderDetail,
});
function renderDetail(c, api) {
    const root = api.body;
    if (!c) {
        root.innerHTML = "";
        return;
    }
    const list = mine(c).sort((a, b) => b.weeklyHours - a.weeklyHours || (a.subject?.subjectSymbol ?? "").localeCompare(b.subject?.subjectSymbol ?? ""));
    const h = hours(c), cap = classCapacity(c.className);
    const teachers = new Set(list.flatMap((cs) => cs.teacher.map((t) => t.id)));
    const doubles = list.filter((cs) => cs.requiresDoublePeriod).length;
    root.innerHTML = `
    <div class="det-head"><div class="tt"><h2>${esc(c.className.toUpperCase())}</h2><p>${room(c) ? `Stammraum ${esc(room(c))}` : "ohne Stammraum"}${isEvening(c.className) ? " · Abendschule" : ""}</p></div>
      <button type="button" class="close" aria-label="Schließen" data-close>${icon("close")}</button></div>
    ${problemList(api.findings)}
    <div class="facts2"><div class="${h > cap ? "bad" : ""}"><b>${h}</b><span>Wochenstunden</span></div><div><b>${list.length}</b><span>Fächer</span></div><div><b>${teachers.size}</b><span>Lehrkräfte</span></div></div>
    <div class="cap${h > cap ? " over" : ""}" role="img" aria-label="${h} von ${cap} Einheiten der Woche belegt"><i style="width:${Math.min(100, Math.round((h / cap) * 100))}%"></i></div>
    <p class="hint" style="margin-top:6px">${h} von ${cap} Einheiten der Woche${doubles ? ` · ${doubles} ${doubles === 1 ? "Fach verlangt" : "Fächer verlangen"} Doppelstunden` : ""}</p>
    <div class="sect" style="margin-top:14px"><h3>Fächer und Lehrkräfte <span class="muted">${list.length}</span></h3>
      ${list.length ? `<ul class="lines">${list.map((cs) => `<li>
        <span class="sw" style="background:${rgb(cs.subject?.subjectColor)}"></span>
        <span class="grow"><b>${esc(cs.subject ? cs.subject.subjectSymbol.toUpperCase() : "?")}</b> <span class="muted">${esc(cs.subject ? title(cs.subject.subjectName) : "Fach fehlt")}</span>${cs.requiresDoublePeriod ? ` <span class="badge">Doppelstunde</span>` : ""}</span>
        <span class="mini">${cs.teacher.length ? cs.teacher.map((t) => `<a class="tag" style="text-decoration:none" href="./lehrer.html?id=${t.id}" title="${esc(t.teacherName)}">${esc(t.nameSymbol.toUpperCase())}</a>`).join("") : `<span class="badge err">keine Lehrkraft</span>`}</span>
        <span class="num">${cs.weeklyHours} Std.</span></li>`).join("")}</ul>` : `<p class="muted" style="font-size:13.5px">Dieser Klasse sind keine Fächer zugeteilt.</p>`}
    </div>
    <div class="det-foot"><a class="btn btn-dark" href="./ergebnis.html?ansicht=klasse&id=${c.id}">${icon("calendar")}Stundenplan ansehen</a></div>`;
    root.querySelector("[data-close]").addEventListener("click", api.close);
}
