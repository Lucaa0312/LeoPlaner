// Wünsche: every teacher's wish text next to what the model made of it, for a human to correct and confirm.
import { renderShell } from "../glas/shell.js";
import { busy, el, esc, icon, toast } from "../glas/ui.js";
import { fetchWishProgress, fetchWishReview, forgetWishReview, saveWishReview, startWishExtraction } from "../api/wishApi.js";
const shell = renderShell({ active: "wuensche" });
const page = el("[data-page]");
const extractBtn = el("[data-extract]");
extractBtn.innerHTML = `${icon("spark")}<span class="lbl">Wünsche auslesen</span>`;
let items = [];
let filter = "open";
/** texts changed here and not saved yet */
const dirty = new Set();
/** texts whose "add a wish" form is open */
const adding = new Set();
const DAYS = [["MONDAY", "Montag"], ["TUESDAY", "Dienstag"], ["WEDNESDAY", "Mittwoch"], ["THURSDAY", "Donnerstag"], ["FRIDAY", "Freitag"]];
const day = (d) => DAYS.find(([k]) => k === d)?.[1] ?? "";
const DEGREES = [["LOW", "schwach"], ["MID", "normal"], ["HIGH", "stark"], ["SEVERE", "zwingend"]];
/** label and the fields a type reads, as TeacherWishProfile.WishType lists them */
const TYPES = {
    FREE_DAY: { label: "Freier Tag", fields: ["count", "candidates"] },
    FREE_AFTERNOON: { label: "Freier Nachmittag", fields: ["hour", "count", "candidates"] },
    LATEST_END: { label: "Spätestes Ende", fields: ["hour", "day"] },
    EARLIEST_START: { label: "Frühester Beginn", fields: ["hour", "day"] },
    MAX_CONSECUTIVE: { label: "Höchstens Stunden am Stück", fields: ["count"] },
    MAX_HOURS_PER_DAY: { label: "Höchstens Stunden pro Tag", fields: ["count"] },
    FEW_DAYS: { label: "Wenige Unterrichtstage", fields: ["count"] },
    NO_GAPS: { label: "Keine Freistunden", fields: [] },
    LINKED_TEACHER: { label: "Tage wie andere Lehrkraft", fields: ["otherTeacherName", "linkMode", "day"] },
    DOUBLE_PERIOD: { label: "Doppelstunde", fields: ["className", "doublePeriodMode"] },
    ROOM: { label: "Raum", fields: ["className", "roomName"] },
};
/** a text still needs a human: not read yet, or read with passages the model could not place */
const isOpen = (i) => !i.reviewed && (!i.extracted || i.unmappable.length > 0);
function describe(w) {
    const days = (w.candidates ?? []).map(day).filter(Boolean).join(", dann ");
    const on = w.day ? ` am ${day(w.day)}` : "";
    switch (w.type) {
        case "FREE_DAY": return `${w.count && w.count > 1 ? `${w.count} freie Tage` : "Freier Tag"}${days ? `: ${days}` : ", egal welcher"}`;
        case "FREE_AFTERNOON": return `${w.count && w.count > 1 ? `${w.count} freie Nachmittage` : "Freier Nachmittag"} ab der ${w.hour}. Stunde${days ? `: ${days}` : ", egal welcher"}`;
        case "LATEST_END": return `Unterricht höchstens bis zur ${w.hour}. Stunde${on}`;
        case "EARLIEST_START": return `Unterricht frühestens ab der ${w.hour}. Stunde${on}`;
        case "MAX_CONSECUTIVE": return `Höchstens ${w.count} Stunden am Stück`;
        case "MAX_HOURS_PER_DAY": return `Höchstens ${w.count} Stunden pro Tag`;
        case "FEW_DAYS": return w.count ? `Unterricht an ${w.count} ${w.count === 1 ? "Tag" : "Tagen"}` : "Unterricht an möglichst wenigen Tagen";
        case "NO_GAPS": return "Keine Freistunden zwischen den Stunden";
        case "LINKED_TEACHER": return `${w.linkMode === "OPPOSITE_DAYS" ? "Gegengleiche" : "Gleiche"} Tage wie ${w.otherTeacherName ?? "?"}${on}`;
        case "DOUBLE_PERIOD": return `${w.doublePeriodMode === "AVOID" ? "Keine Doppelstunden" : "Doppelstunden"} in der ${w.className ?? "?"}`;
        case "ROOM": return `${w.className ?? "?"} im Raum ${w.roomName ?? "?"}`;
    }
}
function setChip(state, text) {
    el("[data-chip]").dataset.state = state;
    el("[data-chip-text]").textContent = text;
}
function addForm(hash) {
    const opt = (pairs) => pairs.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("");
    return `<form class="wish-add" data-add-form="${hash}">
    <div class="field"><label>Art</label><select class="inp" name="type">${opt(Object.entries(TYPES).map(([k, t]) => [k, t.label]))}</select></div>
    <div class="field"><label>Stärke</label><select class="inp" name="degree">${opt(DEGREES)}</select></div>
    <div class="field" data-for="hour"><label>Stunde</label><input class="inp" name="hour" type="number" min="1" max="16" /></div>
    <div class="field" data-for="count"><label>Anzahl</label><input class="inp" name="count" type="number" min="1" /></div>
    <div class="field" data-for="day"><label>Tag</label><select class="inp" name="day"><option value="">jeder</option>${opt(DAYS)}</select></div>
    <div class="field" data-for="candidates"><label>Tage, bester zuerst</label><input class="inp" name="candidates" placeholder="Fr, Mo – leer = egal" /></div>
    <div class="field" data-for="className"><label>Klasse</label><input class="inp" name="className" /></div>
    <div class="field" data-for="roomName"><label>Raum</label><input class="inp" name="roomName" /></div>
    <div class="field" data-for="otherTeacherName"><label>Lehrkraft</label><input class="inp" name="otherTeacherName" /></div>
    <div class="field" data-for="linkMode"><label>Tage</label><select class="inp" name="linkMode">${opt([["SAME_DAYS", "gleiche"], ["OPPOSITE_DAYS", "gegengleiche"]])}</select></div>
    <div class="field" data-for="doublePeriodMode"><label>Doppelstunde</label><select class="inp" name="doublePeriodMode">${opt([["PREFER", "erwünscht"], ["AVOID", "vermeiden"]])}</select></div>
    <button type="submit" class="btn btn-dark btn-sm">Hinzufügen</button>
  </form>`;
}
/** shows only the fields the chosen type reads */
function fitForm(form) {
    const fields = TYPES[form.elements.namedItem("type").value].fields;
    form.querySelectorAll("[data-for]").forEach((f) => { f.hidden = !fields.includes(f.dataset.for ?? ""); });
}
function readForm(form) {
    const data = new FormData(form);
    const text = (k) => String(data.get(k) ?? "").trim();
    const type = text("type");
    const reads = (k) => TYPES[type].fields.includes(k);
    const short = { mo: "MONDAY", di: "TUESDAY", mi: "WEDNESDAY", do: "THURSDAY", fr: "FRIDAY" };
    const candidates = text("candidates").toLowerCase().split(/[^a-zäöü]+/).map((d) => short[d.slice(0, 2)]).filter((d) => !!d);
    return {
        type,
        degree: text("degree"),
        hour: reads("hour") && text("hour") ? Number(text("hour")) : null,
        count: reads("count") && text("count") ? Number(text("count")) : null,
        day: reads("day") && text("day") ? text("day") : null,
        candidates: reads("candidates") ? candidates : null,
        className: reads("className") ? text("className") || null : null,
        roomName: reads("roomName") ? text("roomName") || null : null,
        otherTeacherName: reads("otherTeacherName") ? text("otherTeacherName") || null : null,
        linkMode: reads("linkMode") ? text("linkMode") : null,
        doublePeriodMode: reads("doublePeriodMode") ? text("doublePeriodMode") : null,
        sourceSnippet: null,
    };
}
function card(i, n) {
    const changed = dirty.has(i.textHash);
    const state = changed ? ["warn", "Geändert, nicht gespeichert"]
        : i.reviewed ? ["ok", "Geprüft"]
            : !i.extracted ? ["err", "Nicht ausgelesen"]
                : i.unmappable.length ? ["warn", "Zu prüfen"] : ["", "Ausgelesen"];
    return `<section class="glass panel group wish-card" data-arrive style="--o:${Math.min(n, 12) + 2}" data-hash="${i.textHash}">
    <h3><span class="tag">${esc(i.teacherId.replace(/^TR_/, ""))}</span> <span class="badge ${state[0]}">${state[1]}</span></h3>
    <blockquote class="wish-text">${esc(i.text)}</blockquote>
    ${i.wishes.length ? `<ul class="rows">${i.wishes.map((w, k) => `<li>
      <span class="t">${esc(describe(w))}${w.sourceSnippet ? `<span class="wish-src">„${esc(w.sourceSnippet)}“</span>` : ""}</span>
      <select class="inp wish-degree" aria-label="Stärke" data-degree="${k}">${DEGREES.map(([v, l]) => `<option value="${v}"${v === w.degree ? " selected" : ""}>${l}</option>`).join("")}</select>
      <button type="button" class="btn btn-quiet btn-sm" data-drop-wish="${k}" aria-label="Wunsch entfernen">${icon("trash")}</button></li>`).join("")}</ul>`
        : `<p class="muted">${i.extracted ? "Kein Wunsch erkannt." : "Dieser Text wurde noch nicht ausgelesen."}</p>`}
    ${i.unmappable.length ? `<p class="why">Nicht zugeordnet – als Wunsch nachtragen oder als erledigt abhaken:</p>
      <ul class="rows">${i.unmappable.map((u, k) => `<li><span class="t">${esc(u)}</span>
      <button type="button" class="btn btn-quiet btn-sm" data-drop-open="${k}">${icon("check")}Erledigt</button></li>`).join("")}</ul>` : ""}
    ${adding.has(i.textHash) ? addForm(i.textHash) : ""}
    <div class="wish-actions">
      <button type="button" class="btn btn-glass btn-sm" data-add>${icon("plus")}Wunsch nachtragen</button>
      ${i.extracted || i.reviewed ? `<button type="button" class="btn btn-quiet btn-sm" data-forget>${icon("redo")}Neu auslesen lassen</button>` : ""}
      <button type="button" class="btn btn-dark btn-sm" data-save>${icon("check")}${changed ? "Speichern" : i.reviewed ? "Geprüft" : "Als geprüft bestätigen"}</button>
    </div>
  </section>`;
}
function render() {
    const open = items.filter(isOpen).length;
    const unread = items.filter((i) => !i.extracted && !i.reviewed).length;
    const shown = filter === "open" ? items.filter((i) => isOpen(i) || dirty.has(i.textHash)) : items;
    const verdict = !items.length
        ? { tone: "ok", h: "Keine Wunschtexte", p: "Keine Lehrkraft hat einen Wunschtext. Wünsche kommen mit dem Import des Stundenplan-Exports." }
        : open
            ? { tone: "warn", h: `${open} ${open === 1 ? "Text braucht" : "Texte brauchen"} einen Blick`, p: unread ? `${unread} davon ${unread === 1 ? "ist" : "sind"} noch nicht ausgelesen. Nicht zugeordnete Passagen fließen nicht in den Plan ein.` : "Passagen, die keinem Wunsch zugeordnet wurden, fließen nicht in den Plan ein." }
            : { tone: "ok", h: "Alle Wünsche sind zugeordnet", p: "Bestätigte Texte bleiben auch nach einem Modellwechsel so, wie sie hier stehen." };
    page.innerHTML = `
    <section class="verdict glass ${verdict.tone}" data-arrive style="--o:1">
      <span class="big">${icon(open ? "info" : "check")}</span>
      <div><h2>${esc(verdict.h)}</h2><p>${esc(verdict.p)}</p></div>
    </section>
    ${shown.map(card).join("")}
    ${items.length && !shown.length ? `<section class="glass panel"><p class="muted">Nichts offen. Unter „Alle“ stehen auch die bestätigten Texte.</p></section>` : ""}
    <p class="hint" style="padding:0 6px">Das Modell liest nur den Text. Stunde und Stärke rechnet der Server aus dem, was das Modell zitiert; was nicht im Text steht, wird nicht übernommen.</p>`;
    page.querySelectorAll("[data-add-form]").forEach(fitForm);
    setChip(open ? "paused" : "done", !items.length ? "Keine Texte" : open ? `${open} offen` : "Alles zugeordnet");
}
async function load() {
    try {
        items = await fetchWishReview();
        render();
    }
    catch {
        setChip("error", "Server offline");
        page.innerHTML = `<section class="glass state"><div><b>Server nicht erreichbar</b><p>Die Wünsche kommen vom Server.</p><button type="button" class="btn btn-dark" data-retry>${icon("redo")}Erneut versuchen</button></div></section>`;
        el("[data-retry]").addEventListener("click", () => void load());
    }
}
/** follows a running extraction until it ends, then shows its results */
async function follow(p) {
    let restore = null;
    try {
        while (p.running) {
            restore?.();
            restore = busy(extractBtn, `Liest ${p.done} von ${p.total} …`);
            setChip("running", `Liest ${p.done} von ${p.total}`);
            await new Promise((r) => setTimeout(r, 2000));
            p = await fetchWishProgress();
        }
        if (p.error)
            toast(`Auslesen abgebrochen: ${p.error}`);
    }
    catch {
        toast("Der Server antwortet nicht mehr.");
    }
    restore?.();
    await load();
    shell.refresh();
}
extractBtn.addEventListener("click", async () => {
    try {
        await follow(await startWishExtraction());
    }
    catch {
        toast("Das Auslesen ließ sich nicht starten.");
    }
});
el("[data-filter]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]");
    if (!b)
        return;
    filter = b.dataset.f === "all" ? "all" : "open";
    el("[data-filter]").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
});
const itemOf = (target) => {
    const hash = target.closest("[data-hash]")?.dataset.hash;
    return items.find((i) => i.textHash === hash);
};
page.addEventListener("click", async (e) => {
    const t = e.target.closest("button");
    const item = itemOf(e.target);
    if (!t || !item)
        return;
    if (t.dataset.dropWish !== undefined) {
        item.wishes.splice(Number(t.dataset.dropWish), 1);
        dirty.add(item.textHash);
        render();
    }
    else if (t.dataset.dropOpen !== undefined) {
        item.unmappable.splice(Number(t.dataset.dropOpen), 1);
        dirty.add(item.textHash);
        render();
    }
    else if (t.dataset.add !== undefined) {
        if (!adding.delete(item.textHash))
            adding.add(item.textHash);
        render();
    }
    else if (t.dataset.save !== undefined) {
        const restore = busy(t, "Speichert …");
        try {
            await saveWishReview(item.textHash, item.wishes, item.unmappable);
            dirty.delete(item.textHash);
            adding.delete(item.textHash);
            // the server resolves rooms, teachers and classes again and says what does not fit
            await load();
            shell.refresh();
            toast("Gespeichert. Dieser Text bleibt jetzt so.");
        }
        catch {
            restore();
            toast("Speichern fehlgeschlagen.");
        }
    }
    else if (t.dataset.forget !== undefined) {
        const restore = busy(t, "Verwirft …");
        try {
            await forgetWishReview(item.textHash);
            dirty.delete(item.textHash);
            await load();
            shell.refresh();
            toast("Verworfen. Beim nächsten Auslesen liest das Modell den Text neu.");
        }
        catch {
            restore();
            toast("Verwerfen fehlgeschlagen.");
        }
    }
});
page.addEventListener("change", (e) => {
    const t = e.target;
    if (t instanceof HTMLSelectElement && t.dataset.degree !== undefined) {
        const item = itemOf(t);
        const wish = item?.wishes[Number(t.dataset.degree)];
        if (!item || !wish)
            return;
        wish.degree = t.value;
        dirty.add(item.textHash);
        render();
    }
    else if (t instanceof HTMLSelectElement && t.name === "type" && t.form) {
        fitForm(t.form);
    }
});
page.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const item = itemOf(form);
    if (!item)
        return;
    item.wishes.push(readForm(form));
    dirty.add(item.textHash);
    adding.delete(item.textHash);
    render();
});
void load().then(async () => {
    // an extraction started earlier, or by another tab, is still shown
    try {
        const p = await fetchWishProgress();
        if (p.running)
            await follow(p);
    }
    catch { /* load() already said the server is down */ }
});
