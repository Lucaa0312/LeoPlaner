// Stammdaten · Fächer: table + detail with colour (drives the timetable tiles) and room types.
import { masterDetail, field, input, fieldError, problemList, chips, chipValues, bindChips } from "../glas/masterDetail.js";
import { busy, confirmDialog, esc, icon, title, toast } from "../glas/ui.js";
import { rgb, send, store, ROOM_TYPES, ROOM_TYPE_LABEL, HttpError } from "../glas/store.js";
import { tileInk } from "../glas/plan.js";
let classSubjects = [];
let teachers = [];
const usage = (s) => {
    const cs = classSubjects.filter((c) => c.subject?.id === s.id);
    return { hours: cs.reduce((a, c) => a + c.weeklyHours, 0), classes: [...new Set(cs.map((c) => c.className.toUpperCase()))] };
};
// a calm default palette; any colour can still be picked
const PALETTE = [[20, 112, 250], [0, 168, 150], [46, 160, 67], [242, 170, 0], [240, 110, 40], [214, 52, 90], [150, 80, 220], [0, 150, 210], [120, 126, 140], [180, 120, 60]];
const hex = (c) => `#${[c.red, c.green, c.blue].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const fromHex = (h) => ({ red: parseInt(h.slice(1, 3), 16), green: parseInt(h.slice(3, 5), 16), blue: parseInt(h.slice(5, 7), 16) });
masterDetail({
    page: "faecher",
    kind: "fach",
    noun: "Fach",
    addLabel: "Fach hinzufügen",
    id: (s) => s.id,
    searchText: (s) => `${s.subjectName} ${s.subjectSymbol}`,
    load: async () => {
        const [ss, cs, ts] = await Promise.all([store.subjects(), store.classSubjects(), store.teachers()]);
        classSubjects = cs;
        teachers = ts;
        return ss;
    },
    columns: [
        { label: "Kürzel", cell: (s) => `<span class="sw" style="background:${rgb(s.subjectColor)}"></span><span class="code">${esc(s.subjectSymbol.toUpperCase())}</span>`, sort: (s) => s.subjectSymbol },
        { label: "Name", cell: (s) => `<span class="nm">${esc(title(s.subjectName))}</span>`, sort: (s) => s.subjectName },
        { label: "Raumtyp", compact: true, cell: (s) => s.requiredRoomTypes.length ? `<span class="mini">${s.requiredRoomTypes.map((t) => `<span class="tag">${ROOM_TYPE_LABEL[t]}</span>`).join("")}</span>` : `<span class="mut">beliebig</span>` },
        { label: "Klassen", num: true, compact: true, cell: (s) => String(usage(s).classes.length), sort: (s) => usage(s).classes.length },
        { label: "Wochenstd.", num: true, cell: (s) => String(usage(s).hours), sort: (s) => usage(s).hours },
    ],
    idle: (items) => `<b>${items.length} Fächer</b>Wählen Sie ein Fach, um Farbe, Kürzel und Raumtyp zu ändern. Die Farbe bestimmt die Kacheln im Stundenplan.`,
    detail: renderDetail,
});
function renderDetail(s, api) {
    const root = api.body;
    const u = s ? usage(s) : { hours: 0, classes: [] };
    const who = s ? teachers.filter((t) => t.teachingSubject.some((x) => x.id === s.id)) : [];
    let color = s?.subjectColor ?? { red: PALETTE[0][0], green: PALETTE[0][1], blue: PALETTE[0][2] };
    root.innerHTML = `
    <div class="det-head"><div class="tt"><h2>${s ? esc(title(s.subjectName)) : "Neues Fach"}</h2><p>${s ? `${esc(s.subjectSymbol.toUpperCase())} · ${u.hours} Wochenstunden in ${u.classes.length} ${u.classes.length === 1 ? "Klasse" : "Klassen"}` : "Name, Kürzel, Farbe und Raumtyp"}</p></div>
      <button type="button" class="close" aria-label="Schließen" data-close>${icon("close")}</button></div>
    ${problemList(api.findings)}
    <form class="form" data-form novalidate>
      ${field("Name", input("s-name", s ? title(s.subjectName) : "", 'required maxlength="120"'), { id: "s-name" })}
      ${field("Kürzel", input("s-sym", s?.subjectSymbol.toUpperCase() ?? "", 'required maxlength="10"'), { id: "s-sym" })}
    </form>
    <div class="sect" style="margin-top:14px"><h3>Farbe</h3>
      <div class="color-row">
        <div class="preview" data-preview><span class="s" data-pv-s></span><span class="a">SB</span><span class="b">Raum 101</span></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div class="swatches" role="group" aria-label="Vorschläge">${PALETTE.map(([r, g, b]) => `<button type="button" data-hex="${hex({ red: r, green: g, blue: b })}" style="background:rgb(${r},${g},${b})" aria-label="Farbe rgb(${r}, ${g}, ${b})"></button>`).join("")}</div>
          <label class="hint" style="display:flex;align-items:center;gap:8px">Eigene Farbe <input type="color" data-color value="${hex(color)}" /></label>
        </div>
      </div>
      <p class="hint" style="margin-top:8px">So sieht das Fach im Stundenplan aus. Die Schrift wird automatisch dunkel genug gewählt.</p>
    </div>
    <div class="sect"><h3>Raumtyp</h3>
      ${chips("types", ROOM_TYPES.map((t) => ({ value: t, label: ROOM_TYPE_LABEL[t] })), new Set(s?.requiredRoomTypes ?? []))}
      <p class="hint" style="margin-top:8px">Kein Typ gewählt heißt: jeder Raum passt. Der Algorithmus nutzt Raumtypen derzeit nur als Information.</p>
    </div>
    ${s ? `<div class="sect"><h3>Wird unterrichtet von <span class="muted">${who.length}</span></h3>${who.length ? `<div class="mini">${who.map((t) => `<a class="tag" style="text-decoration:none" href="./lehrer.html?id=${t.id}" title="${esc(t.teacherName)}">${esc(t.nameSymbol.toUpperCase())}</a>`).join("")}</div>` : `<p class="muted" style="font-size:13.5px">Keine Lehrkraft hat dieses Fach eingetragen.</p>`}</div>
      <div class="sect"><h3>In Klassen <span class="muted">${u.classes.length}</span></h3>${u.classes.length ? `<div class="mini">${u.classes.map((c) => `<span class="tag">${esc(c)}</span>`).join("")}</div>` : `<p class="muted" style="font-size:13.5px">Noch keiner Klasse zugeteilt.</p>`}</div>` : ""}
    <div class="det-foot">
      <button type="button" class="btn btn-dark" data-save>${icon("check")}${s ? "Speichern" : "Anlegen"}</button>
      <button type="button" class="btn btn-quiet" data-reset hidden>Verwerfen</button>
      <span class="sp"></span>
      ${s && !u.classes.length && !who.length ? `<button type="button" class="btn btn-quiet" data-delete aria-label="Löschen">${icon("trash")}</button>` : ""}
    </div>`;
    const dirty = () => { api.setDirty(true); root.querySelector("[data-reset]").hidden = false; };
    const preview = () => {
        const pv = root.querySelector("[data-preview]");
        pv.style.setProperty("--c", rgb(color));
        pv.style.setProperty("--ink-c", tileInk(color));
        root.querySelector("[data-pv-s]").textContent = root.querySelector("#s-sym").value.trim().toUpperCase() || "FACH";
        const h = hex(color);
        root.querySelectorAll("[data-hex]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.hex === h)));
    };
    preview();
    root.querySelector("[data-close]").addEventListener("click", api.close);
    root.querySelector("[data-reset]").addEventListener("click", () => { api.setDirty(false); renderDetail(s, api); });
    root.querySelector("[data-form]").addEventListener("input", () => { dirty(); preview(); });
    root.querySelector("[data-form]").addEventListener("submit", (e) => e.preventDefault());
    root.querySelector(".swatches").addEventListener("click", (e) => {
        const b = e.target.closest("[data-hex]");
        if (!b)
            return;
        color = fromHex(b.dataset.hex);
        root.querySelector("[data-color]").value = b.dataset.hex;
        preview();
        dirty();
    });
    root.querySelector("[data-color]").addEventListener("input", (e) => { color = fromHex(e.target.value); preview(); dirty(); });
    bindChips(root, dirty);
    const save = root.querySelector("[data-save]");
    save.addEventListener("click", async () => {
        const name = root.querySelector("#s-name").value.trim();
        const symbol = root.querySelector("#s-sym").value.trim();
        fieldError(root, "s-name", "");
        fieldError(root, "s-sym", "");
        if (!name) {
            fieldError(root, "s-name", "Bitte einen Namen eingeben.");
            return;
        }
        if (!symbol) {
            fieldError(root, "s-sym", "Bitte ein Kürzel eingeben.");
            return;
        }
        const all = await store.subjects().catch(() => []);
        if (all.some((x) => x.id !== s?.id && x.subjectSymbol.toLowerCase() === symbol.toLowerCase())) {
            fieldError(root, "s-sym", `Das Kürzel ${symbol.toUpperCase()} gibt es schon.`);
            return;
        }
        // imported names are lower case; keep that form when only the case differs
        const keepName = s && s.subjectName.toLowerCase() === name.toLowerCase() ? s.subjectName : name;
        const keepSym = s && s.subjectSymbol.toLowerCase() === symbol.toLowerCase() ? s.subjectSymbol : symbol;
        const body = { subjectName: keepName, subjectSymbol: keepSym, requiredRoomTypes: chipValues(root, "types"), subjectColor: color };
        const restore = busy(save, "Speichert …");
        try {
            if (s)
                await send("PUT", `/subjects/update/${s.id}`, body);
            else
                await send("POST", "/subjects", body);
            toast(s ? "Gespeichert." : "Fach angelegt.");
            await api.saved((x) => x.subjectSymbol.toLowerCase() === symbol.toLowerCase());
        }
        catch (e) {
            restore();
            toast(e instanceof HttpError ? `Speichern fehlgeschlagen (Status ${e.status}).` : "Server nicht erreichbar.");
        }
    });
    root.querySelector("[data-delete]")?.addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        if (!s)
            return;
        const ok = await confirmDialog({ title: `${title(s.subjectName)} löschen?`, text: "Das Fach wird nirgends verwendet. Es wird endgültig gelöscht.", confirm: "Löschen", danger: true });
        if (!ok)
            return;
        const restore = busy(btn, "");
        try {
            await send("DELETE", `/subjects/delete/${s.id}`);
            toast("Fach gelöscht.");
            await api.removed();
        }
        catch (err) {
            restore();
            toast(err instanceof HttpError ? `Löschen fehlgeschlagen (Status ${err.status}).` : "Server nicht erreichbar.");
        }
    });
}
