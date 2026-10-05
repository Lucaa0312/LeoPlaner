// Shared UI helpers for the Glas pages: icons, number formatting, toast, element lookup.

const PATHS = {
  check: '<path d="M4 10.5l4 4 8-9"/>',
  pause: '<path d="M7 4.5v11M13 4.5v11"/>',
  play: '<path d="M6.5 4.5v11l9-5.5z"/>',
  stop: '<rect x="5" y="5" width="10" height="10" rx="1"/>',
  arrow: '<path d="M4 10h11M11 6l4 4-4 4"/>',
  home: '<path d="M3.5 9.5L10 4l6.5 5.5V16h-13z"/>',
  help: '<circle cx="10" cy="10" r="6.5"/><path d="M8.2 8.2a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4M10 13.6v.2"/>',
  user: '<circle cx="10" cy="7.5" r="3"/><path d="M4.5 16c.8-2.8 3-4.2 5.5-4.2s4.7 1.4 5.5 4.2"/>',
  redo: '<path d="M15.5 9.5A5.5 5.5 0 1 1 13.9 5.6M16 3.5v3.8h-3.8"/>',
  alert: '<path d="M10 3.5l7 12.5H3z"/><path d="M10 8.5v3.2M10 14v.2"/>',
  wifi: '<path d="M3 8a10 10 0 0 1 14 0M5.5 10.8a6.5 6.5 0 0 1 9 0M8 13.5a3 3 0 0 1 4 0"/><path d="M10 16v.2"/>',
  search: '<circle cx="9" cy="9" r="5.5"/><path d="M13.2 13.2L17 17"/>',
  plus: '<path d="M10 4.5v11M4.5 10h11"/>',
  trash: '<path d="M4.5 6h11M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6"/>',
  download: '<path d="M10 3.5v9M6 9l4 4 4-4M4 16h12"/>',
  upload: '<path d="M10 13.5v-9M6 8l4-4 4 4M4 16h12"/>',
  print: '<path d="M6 7V3.5h8V7M6 14H4.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H14"/><rect x="6" y="11.5" width="8" height="5" rx=".5"/>',
  table: '<rect x="3.5" y="3.5" width="13" height="13" rx="1.5"/><path d="M3.5 8h13M3.5 12.5h13M8 3.5v13"/>',
  close: '<path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/>',
  file: '<path d="M5.5 3.5h6l3 3v10h-9z"/><path d="M11.5 3.5v3h3"/>',
  db: '<ellipse cx="10" cy="5.5" rx="5.5" ry="2"/><path d="M4.5 5.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9M4.5 10c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2"/>',
  info: '<circle cx="10" cy="10" r="6.5"/><path d="M10 9.2v4.3M10 6.6v.2"/>',
  lock: '<rect x="4.5" y="9" width="11" height="7.5" rx="1.5"/><path d="M7 9V6.8a3 3 0 0 1 6 0V9"/>',
  calendar: '<rect x="3.5" y="4.5" width="13" height="12" rx="1.5"/><path d="M3.5 8.5h13M7 3v3M13 3v3"/>',
  check2: '<circle cx="10" cy="10" r="6.5"/><path d="M7 10.2l2 2 4-4.4"/>',
  chev: '<path d="M6 8l4 4 4-4"/>',
  eye: '<path d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z"/><circle cx="10" cy="10" r="2.3"/>',
  eyeOff: '<path d="M8.2 5.2A7.6 7.6 0 0 1 10 5c4.7 0 7.5 5 7.5 5a12.6 12.6 0 0 1-2 2.6M12.1 12.2A2.3 2.3 0 0 1 7.8 9.9M5.3 6.6A12.8 12.8 0 0 0 2.5 10s2.8 5 7.5 5c1.4 0 2.6-.4 3.7-1M3.5 3.5l13 13"/>',
  spark: '<path d="M10 3v3.5M10 13.5V17M3 10h3.5M13.5 10H17M5.1 5.1l2.4 2.4M12.5 12.5l2.4 2.4M14.9 5.1l-2.4 2.4M7.5 12.5l-2.4 2.4"/>',
} as const;
export type IconName = keyof typeof PATHS;

export function icon(name: IconName, cls = "ic"): string {
  return `<svg class="${cls}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
}

const fmt = new Intl.NumberFormat("de-AT");
export const num = (n: number): string => fmt.format(Math.round(n));

/** 1 234 567 -> "1,2 Mio.", 412 386 -> "412 386" */
export function short(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "").replace(".", ",")} Mio.`;
  return num(n);
}

export function el<T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Element fehlt: ${selector}`);
  return found;
}

let toastTimer = 0;
export function toast(message: string): void {
  let t = document.querySelector<HTMLElement>(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    document.body.append(t);
  }
  t.textContent = message;
  t.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t?.classList.remove("show"), 3200);
}

export const reduceMotion = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** escapes text for use inside innerHTML templates */
export const esc = (v: unknown): string => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c] ?? c);

/** "software entwicklung" -> "Software Entwicklung" (names arrive lower case from imports) */
const SMALL = new Set(["und", "oder", "für", "mit", "in", "im", "von", "der", "die", "das", "des", "zu", "zur", "zum", "an", "am", "auf", "aus", "bei"]);
export const title = (s: string): string =>
  s.split(" ").map((w, i) => (i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w.replace(/^(\p{L})/u, (c) => c.toUpperCase()))).join(" ");
/** class names, subject and teacher codes are shown upper case */
export const code = (s: string): string => s.toUpperCase();

/** shows a spinner and a text in a button; returns a function that restores it */
export function busy(b: HTMLButtonElement, text: string): () => void {
  const html = b.innerHTML, dis = b.disabled;
  b.innerHTML = `<span class="btn-spin" aria-hidden="true"></span>${esc(text)}`;
  b.disabled = true;
  return () => { b.innerHTML = html; b.disabled = dis; };
}

/** a small glass dialog; resolves true when the primary action is chosen */
export function confirmDialog(o: { title: string; text: string; confirm: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    const d = document.createElement("dialog");
    d.className = "dlg";
    d.innerHTML = `<h2>${esc(o.title)}</h2><p>${esc(o.text)}</p>
      <div class="dlg-actions"><button type="button" class="btn btn-glass" data-no>Abbrechen</button>
      <button type="button" class="btn ${o.danger ? "btn-danger" : "btn-dark"}" data-yes>${esc(o.confirm)}</button></div>`;
    document.body.append(d);
    const done = (v: boolean): void => { d.close(); d.remove(); resolve(v); };
    d.querySelector("[data-no]")!.addEventListener("click", () => done(false));
    d.querySelector("[data-yes]")!.addEventListener("click", () => done(true));
    d.addEventListener("cancel", (e) => { e.preventDefault(); done(false); });
    d.showModal();
    d.querySelector<HTMLButtonElement>("[data-no]")!.focus();
  });
}

const DAY_WORDS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
export const dayName = (i: number): string => DAY_WORDS[i] ?? "";
