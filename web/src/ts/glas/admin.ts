// Demo data, reset and the record of the last import: shared by Übersicht and Import.
import { API_BASE_URL } from "../utils/apiBase.js";
import { store } from "./store.js";
import { busy, confirmDialog, icon, toast } from "./ui.js";
import { exportFile } from "../api/downloadApi.js";

/** Adds "Demodaten laden" / "Daten zurücksetzen" buttons, only when the backend enables them. */
export async function renderAdminActions(slot: HTMLElement, onChange: () => void, opts: { hasData?: boolean } = {}): Promise<void> {
  const f = await store.features();
  const btns: string[] = [];
  if (f.demoDataEnabled) btns.push(`<button type="button" class="btn btn-quiet" data-demo>${icon("db")}Demodaten laden</button>`);
  if (f.resetEnabled && opts.hasData !== false) btns.push(`<button type="button" class="btn btn-quiet" data-reset>${icon("trash")}Daten zurücksetzen …</button>`);
  slot.innerHTML = btns.join("");
  slot.querySelector<HTMLButtonElement>("[data-demo]")?.addEventListener("click", async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    const restore = busy(b, "Lädt …");
    try {
      const r = await fetch(`${API_BASE_URL}/admin/demo-data`, { method: "POST" });
      if (r.ok) { toast("Demodaten geladen."); store.invalidate(); forgetImport(); onChange(); }
      else if (r.status === 409) toast("Es sind bereits Daten vorhanden. Bitte zuerst zurücksetzen.");
      else toast(`Demodaten laden fehlgeschlagen (Status ${r.status}).`);
    } catch { toast("Server nicht erreichbar."); }
    finally { restore(); }
  });
  slot.querySelector<HTMLButtonElement>("[data-reset]")?.addEventListener("click", async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    const ok = await confirmDialog({
      title: "Alle Daten löschen?",
      text: "Lehrer, Klassen, Räume, Fächer und Stundenpläne werden unwiderruflich gelöscht.",
      confirm: "Endgültig löschen",
      danger: true,
    });
    if (!ok) return;
    const restore = busy(b, "Löscht …");
    try {
      const r = await fetch(`${API_BASE_URL}/admin/data`, { method: "DELETE" });
      if (r.ok) { toast("Alle Daten gelöscht."); store.invalidate(); forgetImport(); onChange(); }
      else if (r.status === 409) toast("Die Optimierung läuft gerade. Bitte zuerst beenden.");
      else toast(`Zurücksetzen fehlgeschlagen (Status ${r.status}).`);
    } catch { toast("Server nicht erreichbar."); }
    finally { restore(); }
  });
}

// ---------- the last import, remembered in this browser (the server keeps no report) ----------
export type ImportRecord = {
  at: string;
  message: string;
  files: { name: string; type: string }[];
  warnings: string[];
  feasibility: string[];
  counts: [string, number][];
};
const KEY = "leoplaner.lastImport";
export function saveImport(r: ImportRecord): void { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch {} }
export function lastImport(): ImportRecord | null {
  try { const s = localStorage.getItem(KEY); return s ? (JSON.parse(s) as ImportRecord) : null; } catch { return null; }
}
export function forgetImport(): void { try { localStorage.removeItem(KEY); } catch {} }

const fmt = new Intl.DateTimeFormat("de-AT", { dateStyle: "medium", timeStyle: "short" });
export const when = (iso: string): string => { try { return fmt.format(new Date(iso)); } catch { return ""; } };

/** downloads the master data as Excel (GET /test-export) */
export async function downloadBaseData(): Promise<void> {
  toast("Export wird erstellt …");
  try {
    const blob = await exportFile();
    if (blob.size === 0) { toast("Die exportierte Datei ist leer."); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leoplaner-stammdaten-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.append(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("Stammdaten exportiert.");
  } catch { toast("Export hat nicht geklappt. Ist der Server erreichbar?"); }
}
