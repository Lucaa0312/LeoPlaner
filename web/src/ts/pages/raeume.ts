// Stammdaten · Räume: table + detail with number, short name and room types.
import { masterDetail, field, input, fieldError, problemList, chips, chipValues, bindChips, type DetailApi } from "../glas/masterDetail.js";
import { busy, confirmDialog, esc, icon, title, toast } from "../glas/ui.js";
import { send, store, ROOM_TYPES, ROOM_TYPE_LABEL, HttpError, type ClassInfo, type Room, type RoomType } from "../glas/store.js";

let classes: ClassInfo[] = [];
const short = (r: Room): string => (r.nameShort || String(r.roomNumber)).toUpperCase();
const homeOf = (r: Room): string[] => classes.filter((c) => c.roomDTO?.id === r.id).map((c) => c.className.toUpperCase());

masterDetail<Room>({
  page: "raeume",
  kind: "raum",
  noun: "Raum",
  addLabel: "Raum hinzufügen",
  id: (r) => r.id,
  searchText: (r) => `${r.roomName} ${r.nameShort} ${r.roomNumber} ${r.roomTypes.map((t) => ROOM_TYPE_LABEL[t]).join(" ")}`,
  load: async () => {
    const [rs, cs] = await Promise.all([store.rooms(), store.classes()]);
    classes = cs;
    return rs;
  },
  columns: [
    { label: "Kürzel", cell: (r) => `<span class="code">${esc(short(r))}</span>`, sort: short },
    { label: "Name", cell: (r) => `<span class="nm">${esc(title(r.roomName))}</span>`, sort: (r) => r.roomName },
    { label: "Nummer", num: true, cell: (r) => String(r.roomNumber), sort: (r) => r.roomNumber },
    { label: "Raumtyp", compact: true, cell: (r) => r.roomTypes.length ? `<span class="mini">${r.roomTypes.map((t) => `<span class="tag">${ROOM_TYPE_LABEL[t]}</span>`).join("")}</span>` : `<span class="mut">keiner</span>` },
    { label: "Stammraum von", cell: (r) => { const h = homeOf(r); return h.length ? `<span class="mini">${h.map((c) => `<span class="tag">${esc(c)}</span>`).join("")}</span>` : `<span class="mut">–</span>`; }, sort: (r) => homeOf(r).join(",") || "~" },
  ],
  idle: (items) => `<b>${items.length} Räume</b>Wählen Sie einen Raum, um Nummer, Kürzel und Raumtyp zu ändern.`,
  detail: renderDetail,
});

function renderDetail(r: Room | null, api: DetailApi<Room>): void {
  const root = api.body;
  const home = r ? homeOf(r) : [];
  root.innerHTML = `
    <div class="det-head"><div class="tt"><h2>${r ? `Raum ${esc(short(r))}` : "Neuer Raum"}</h2><p>${r ? `${esc(title(r.roomName))} · Nummer <span class="num">${r.roomNumber}</span>` : "Name, Kürzel, Nummer und Raumtyp"}</p></div>
      <button type="button" class="close" aria-label="Schließen" data-close>${icon("close")}</button></div>
    ${problemList(api.findings)}
    <form class="form" data-form novalidate>
      ${field("Name", input("r-name", r ? title(r.roomName) : "", 'required maxlength="120"'), { id: "r-name" })}
      ${field("Kürzel", input("r-sym", r?.nameShort.toUpperCase() ?? "", 'required maxlength="10"'), { id: "r-sym" })}
      ${field("Raumnummer", input("r-num", r?.roomNumber ?? "", 'inputmode="numeric" required'), { id: "r-num", hint: "Eine ganze Zahl, zum Beispiel 101." })}
    </form>
    <div class="sect" style="margin-top:14px"><h3>Raumtyp</h3>
      ${chips("types", ROOM_TYPES.map((t) => ({ value: t, label: ROOM_TYPE_LABEL[t] })), new Set(r?.roomTypes ?? []))}
      <p class="hint" style="margin-top:8px">Ein Raum kann mehrere Typen haben, etwa Chemie- und Physiksaal.</p>
    </div>
    ${r ? `<div class="sect"><h3>Stammraum von <span class="muted">${home.length}</span></h3>${home.length ? `<div class="mini">${home.map((c) => `<span class="tag">${esc(c)}</span>`).join("")}</div>` : `<p class="muted" style="font-size:13.5px">Keine Klasse hat diesen Raum als Stammraum.</p>`}</div>` : ""}
    <div class="det-foot">
      <button type="button" class="btn btn-dark" data-save>${icon("check")}${r ? "Speichern" : "Anlegen"}</button>
      <button type="button" class="btn btn-quiet" data-reset hidden>Verwerfen</button>
      <span class="sp"></span>
      ${r ? `<a class="btn btn-quiet" href="./ergebnis.html?ansicht=raum&id=${r.id}">${icon("calendar")}Plan</a>` : ""}
      ${r && !home.length ? `<button type="button" class="btn btn-quiet" data-delete aria-label="Löschen">${icon("trash")}</button>` : ""}
    </div>`;

  const dirty = (): void => { api.setDirty(true); root.querySelector<HTMLElement>("[data-reset]")!.hidden = false; };
  root.querySelector("[data-close]")!.addEventListener("click", api.close);
  root.querySelector("[data-reset]")!.addEventListener("click", () => { api.setDirty(false); renderDetail(r, api); });
  root.querySelector("[data-form]")!.addEventListener("input", dirty);
  root.querySelector("[data-form]")!.addEventListener("submit", (e) => e.preventDefault());
  bindChips(root, dirty);

  const save = root.querySelector<HTMLButtonElement>("[data-save]")!;
  save.addEventListener("click", async () => {
    const name = root.querySelector<HTMLInputElement>("#r-name")!.value.trim();
    const sym = root.querySelector<HTMLInputElement>("#r-sym")!.value.trim();
    const numText = root.querySelector<HTMLInputElement>("#r-num")!.value.trim();
    for (const id of ["r-name", "r-sym", "r-num"]) fieldError(root, id, "");
    if (!name) { fieldError(root, "r-name", "Bitte einen Namen eingeben."); return; }
    if (!sym) { fieldError(root, "r-sym", "Bitte ein Kürzel eingeben."); return; }
    const n = Number(numText);
    // the server stores the number as a short
    if (!/^\d+$/.test(numText) || n > 32767) { fieldError(root, "r-num", "Bitte eine ganze Zahl zwischen 0 und 32767 eingeben."); return; }
    const all = await store.rooms().catch(() => [] as Room[]);
    if (all.some((x) => x.id !== r?.id && x.nameShort.toLowerCase() === sym.toLowerCase())) { fieldError(root, "r-sym", `Das Kürzel ${sym.toUpperCase()} gibt es schon.`); return; }
    const body = {
      roomName: r && r.roomName.toLowerCase() === name.toLowerCase() ? r.roomName : name,
      nameShort: r && r.nameShort.toLowerCase() === sym.toLowerCase() ? r.nameShort : sym,
      roomNumber: n,
      roomTypes: chipValues(root, "types") as RoomType[],
    };
    const restore = busy(save, "Speichert …");
    try {
      if (r) await send("PUT", `/rooms/update/${r.id}`, body); else await send("POST", "/rooms", body);
      toast(r ? "Gespeichert." : "Raum angelegt.");
      await api.saved((x) => x.nameShort.toLowerCase() === sym.toLowerCase());
    } catch (e) {
      restore();
      toast(e instanceof HttpError ? `Speichern fehlgeschlagen (Status ${e.status}).` : "Server nicht erreichbar.");
    }
  });

  root.querySelector<HTMLButtonElement>("[data-delete]")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    if (!r) return;
    const ok = await confirmDialog({ title: `Raum ${short(r)} löschen?`, text: "Keine Klasse hat diesen Raum als Stammraum. Er wird endgültig gelöscht.", confirm: "Löschen", danger: true });
    if (!ok) return;
    const restore = busy(btn, "");
    try { await send("DELETE", `/rooms/delete/${r.id}`); toast("Raum gelöscht."); await api.removed(); }
    catch (err) { restore(); toast(err instanceof HttpError ? `Löschen fehlgeschlagen (Status ${err.status}).` : "Server nicht erreichbar."); }
  });
}
