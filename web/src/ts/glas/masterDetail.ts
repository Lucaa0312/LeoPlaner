// Stammdaten pages: one table pattern (search, sort, "only with problems") plus a detail panel
// beside it for viewing and editing in place. No modal wizards for simple records.
import { renderShell, type PageKey } from "./shell.js";
import { confirmDialog, el, esc, icon } from "./ui.js";
import { param, store } from "./store.js";
import { countBy, runChecks, type EntityKind, type Finding } from "./checks.js";

export type Col<T> = {
  label: string;
  cell: (t: T) => string;
  sort?: (t: T) => string | number;
  num?: boolean;
  /** dropped below 1180px */
  compact?: boolean;
};

export type DetailApi<T> = {
  body: HTMLElement;
  findings: Finding[];
  /** mark the form as changed, so leaving it asks first */
  setDirty: (dirty: boolean) => void;
  /** after a save: reload everything and select the matching item */
  saved: (match: (t: T) => boolean) => Promise<void>;
  /** after a delete */
  removed: () => Promise<void>;
  close: () => void;
};

export type MDConfig<T> = {
  page: PageKey;
  kind: EntityKind;
  /** "Lehrkraft", used in sentences */
  noun: string;
  /** label of the add button; leave out when items cannot be created here */
  addLabel?: string;
  columns: Col<T>[];
  id: (t: T) => number;
  searchText: (t: T) => string;
  /** loads the items (after store.invalidate when needed) */
  load: () => Promise<T[]>;
  /** renders the detail of one item, or the empty form for a new one (null) */
  detail: (t: T | null, api: DetailApi<T>) => void;
  /** text in the detail panel while nothing is selected */
  idle: (items: T[]) => string;
  /** shown above the table, e.g. a note on what cannot be edited */
  note?: string;
};

export function masterDetail<T>(cfg: MDConfig<T>): void {
  const shell = renderShell({ active: cfg.page });
  let items: T[] = [];
  let findings: Finding[] = [];
  let q = "";
  let onlyProblems = false;
  let sortCol = 0, sortDir = 1;
  let selected: number | null = Number(param("id")) || null;
  let creating = false;
  let dirty = false;

  const add = el<HTMLButtonElement>("[data-add]");
  if (cfg.addLabel) add.innerHTML = `${icon("plus")}${esc(cfg.addLabel)}`; else add.hidden = true;
  el("[data-search-ic]").outerHTML = icon("search");
  if (cfg.note) { const n = el("[data-note]"); n.hidden = false; n.innerHTML = `${icon("info")}<span>${cfg.note}</span>`; }

  const tbody = el("[data-rows]"), thead = el("[data-head]"), det = el("[data-detail]");

  const probs = (t: T): Finding[] => findings.filter((f) => f.kind === cfg.kind && f.id === cfg.id(t));
  function visible(): T[] {
    const col = cfg.columns[sortCol];
    const list = items.filter((t) => (!q || cfg.searchText(t).toLowerCase().includes(q)) && (!onlyProblems || probs(t).length));
    if (col?.sort) {
      const key = col.sort;
      list.sort((a, b) => {
        const x = key(a), y = key(b);
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "de", { numeric: true })) * sortDir;
      });
    }
    return list;
  }

  function renderHead(): void {
    thead.innerHTML = `<tr>${cfg.columns.map((c, i) => {
      const s = i === sortCol ? (sortDir > 0 ? "ascending" : "descending") : "none";
      return `<th scope="col" class="${c.num ? "n" : ""}${c.compact ? " cpt" : ""}" aria-sort="${s}">${c.sort ? `<button type="button" data-sort="${i}">${esc(c.label)}${i === sortCol ? icon("chev", `ic arr${sortDir > 0 ? " up" : ""}`) : ""}</button>` : esc(c.label)}</th>`;
    }).join("")}<th scope="col" class="st">Status</th></tr>`;
  }

  function renderRows(): void {
    const list = visible();
    const { errors, warns } = countBy(findings.filter((f) => f.kind === cfg.kind));
    const fb = el<HTMLButtonElement>("[data-only]");
    fb.textContent = `Nur mit Problemen${errors + warns ? ` · ${errors + warns}` : ""}`;
    fb.disabled = !(errors + warns) && !onlyProblems;
    el("[data-count]").textContent = list.length === items.length ? `${items.length}` : `${list.length} von ${items.length}`;
    if (!list.length) {
      tbody.innerHTML = `<tr class="none"><td colspan="${cfg.columns.length + 1}">${items.length ? (q ? `Nichts gefunden für „${esc(q)}“.` : "Keine Einträge mit Problemen.") : `Noch keine Einträge. ${cfg.addLabel ? `Legen Sie den ersten an oder importieren Sie die Daten.` : `Importieren Sie die Daten im Schritt 1.`}`}</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map((t) => {
      const id = cfg.id(t), p = countBy(probs(t));
      const status = p.errors ? `<span class="badge err" title="${p.errors} Fehler">${p.errors}<span class="bw"> Fehler</span></span>` : p.warns ? `<span class="badge warn" title="${p.warns} ${p.warns === 1 ? "Hinweis" : "Hinweise"}">${p.warns}<span class="bw"> ${p.warns === 1 ? "Hinweis" : "Hinweise"}</span></span>` : "";
      return `<tr data-id="${id}" tabindex="0" aria-selected="${id === selected && !creating}">${cfg.columns.map((c) => `<td class="${c.num ? "n" : ""}${c.compact ? " cpt" : ""}">${c.cell(t)}</td>`).join("")}<td class="st">${status}</td></tr>`;
    }).join("");
  }

  async function guard(): Promise<boolean> {
    if (!dirty) return true;
    const ok = await confirmDialog({ title: "Änderungen verwerfen?", text: "Sie haben Änderungen, die noch nicht gespeichert sind.", confirm: "Verwerfen" });
    if (ok) dirty = false;
    return ok;
  }

  function setUrl(): void {
    const url = new URL(location.href);
    if (selected && !creating) url.searchParams.set("id", String(selected)); else url.searchParams.delete("id");
    history.replaceState(null, "", url);
  }

  const api: DetailApi<T> = {
    body: det,
    findings: [],
    setDirty: (d) => { dirty = d; },
    saved: async (match) => {
      dirty = false;
      await reload();
      const t = items.find(match);
      creating = false;
      selected = t ? cfg.id(t) : null;
      renderRows(); renderDetail(); setUrl();
    },
    removed: async () => { dirty = false; creating = false; selected = null; await reload(); renderRows(); renderDetail(); setUrl(); },
    close: () => { void (async () => { if (!(await guard())) return; creating = false; selected = null; renderRows(); renderDetail(); setUrl(); })(); },
  };

  function renderDetail(): void {
    det.scrollTop = 0;
    if (creating) { api.findings = []; cfg.detail(null, api); return; }
    const t = items.find((x) => cfg.id(x) === selected);
    if (!t) {
      det.innerHTML = `<div class="det-idle">${cfg.idle(items)}</div>`;
      return;
    }
    api.findings = probs(t);
    cfg.detail(t, api);
  }

  async function select(id: number | null): Promise<void> {
    if (id === selected && !creating) return;
    if (!(await guard())) return;
    creating = false;
    selected = id;
    tbody.querySelectorAll<HTMLElement>("tr[data-id]").forEach((r) => r.setAttribute("aria-selected", String(Number(r.dataset.id) === id)));
    renderDetail(); setUrl();
  }

  async function reload(): Promise<void> {
    store.invalidate();
    const [list, data] = await Promise.all([cfg.load(), store.all()]);
    items = list;
    findings = runChecks(data);
    shell.refresh();
  }

  // ---------- events ----------
  tbody.addEventListener("click", (e) => {
    const tr = (e.target as HTMLElement).closest<HTMLElement>("tr[data-id]");
    if (tr) void select(Number(tr.dataset.id));
  });
  tbody.addEventListener("keydown", (e) => {
    const tr = (e.target as HTMLElement).closest<HTMLElement>("tr[data-id]");
    if (!tr) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void select(Number(tr.dataset.id)); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (e.key === "ArrowDown" ? tr.nextElementSibling : tr.previousElementSibling) as HTMLElement | null;
      next?.focus();
    }
  });
  thead.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-sort]");
    if (!b) return;
    const i = Number(b.dataset.sort);
    sortDir = i === sortCol ? -sortDir : 1;
    sortCol = i;
    renderHead(); renderRows();
  });
  el<HTMLInputElement>("[data-q]").addEventListener("input", (e) => { q = (e.target as HTMLInputElement).value.trim().toLowerCase(); renderRows(); });
  el("[data-only]").addEventListener("click", () => {
    onlyProblems = !onlyProblems;
    el("[data-only]").setAttribute("aria-pressed", String(onlyProblems));
    renderRows();
  });
  add.addEventListener("click", async () => {
    if (!(await guard())) return;
    creating = true; selected = null;
    renderRows(); renderDetail(); setUrl();
    det.querySelector<HTMLInputElement>("input")?.focus();
  });
  addEventListener("beforeunload", (e) => { if (dirty) e.preventDefault(); });

  // ---------- first load ----------
  renderHead();
  tbody.innerHTML = `<tr class="none"><td colspan="${cfg.columns.length + 1}"><span class="spinner" style="display:inline-block;width:18px;height:18px;vertical-align:-4px;margin-right:8px"></span>Lädt …</td></tr>`;
  det.innerHTML = "";
  reload().then(() => {
    renderRows(); renderDetail();
    tbody.querySelector<HTMLElement>('tr[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }).catch(() => {
    tbody.innerHTML = `<tr class="none"><td colspan="${cfg.columns.length + 1}">Server nicht erreichbar. <button type="button" class="btn btn-glass btn-sm" data-retry>${icon("redo")}Erneut versuchen</button></td></tr>`;
    tbody.querySelector("[data-retry]")?.addEventListener("click", () => location.reload());
    det.innerHTML = `<div class="det-idle">Die Daten erscheinen, sobald die Verbindung zum Server steht.</div>`;
    add.disabled = true;
  });
}

// ---------- form helpers shared by the data pages ----------
export function field(label: string, control: string, opts: { hint?: string; id: string; wide?: boolean } ): string {
  return `<div class="field${opts.wide ? " wide" : ""}"><label for="${opts.id}">${esc(label)}</label>${control}${opts.hint ? `<p class="hint">${opts.hint}</p>` : ""}<p class="err" data-err="${opts.id}" hidden></p></div>`;
}
export function input(id: string, value: string | number, attrs = ""): string {
  return `<input class="inp" id="${id}" name="${id}" value="${esc(value)}" autocomplete="off" ${attrs} />`;
}
/** shows a message under a field; returns false so it can end a validation chain */
export function fieldError(root: HTMLElement, id: string, msg: string): boolean {
  const p = root.querySelector<HTMLElement>(`[data-err="${id}"]`);
  if (p) { p.textContent = msg; p.hidden = !msg; }
  if (msg) root.querySelector<HTMLElement>(`#${id}`)?.focus();
  return !msg;
}
/** a set of toggle chips; returns the html, read the state with chipValues */
export function chips(name: string, options: { value: string; label: string; title?: string }[], selected: Set<string>): string {
  return `<div class="chips" role="group" data-chips="${name}">${options.map((o) => `<button type="button" class="tchip" data-v="${esc(o.value)}" aria-pressed="${selected.has(o.value)}"${o.title ? ` title="${esc(o.title)}"` : ""}>${icon("check", "ic ck")}${esc(o.label)}</button>`).join("")}</div>`;
}
export function chipValues(root: HTMLElement, name: string): string[] {
  return [...root.querySelectorAll<HTMLElement>(`[data-chips="${name}"] [aria-pressed="true"]`)].map((b) => b.dataset.v ?? "");
}
export function bindChips(root: HTMLElement, onChange: () => void): void {
  root.querySelectorAll<HTMLElement>("[data-chips]").forEach((g) => g.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>(".tchip");
    if (!b) return;
    b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
    onChange();
  }));
}
/** the problems of the current item, shown at the top of its detail */
export function problemList(fs: Finding[]): string {
  if (!fs.length) return "";
  return `<ul class="det-probs">${fs.map((f) => `<li class="${f.sev}">${icon(f.sev === "error" ? "alert" : "info")}<span>${esc(f.text)}</span></li>`).join("")}</ul>`;
}
