// -----------------------------------------------------------------------------
// Sync log
//
// The backend keeps no history of Excel transfers, so the dashboard remembers
// the last import and export in the browser. Storage can be unavailable (private
// windows, blocked site data), in which case the strip simply shows "noch nie".
// -----------------------------------------------------------------------------
const STORAGE_KEY = {
    import: "leo.lastImport",
    export: "leo.lastExport",
};
// Fired after every recorded transfer so an open dashboard can refresh its strip.
export const SYNC_EVENT = "leo:sync";
export function recordSync(kind, fileName) {
    try {
        localStorage.setItem(STORAGE_KEY[kind], JSON.stringify({
            at: new Date().toISOString(),
            fileName,
        }));
    }
    catch {
        // Nothing to do – the timestamp is a convenience, not data.
    }
    document.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { kind } }));
}
export function readSync(kind) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY[kind]);
        if (!raw)
            return null;
        const value = JSON.parse(raw);
        if (!value?.at || Number.isNaN(Date.parse(value.at)))
            return null;
        return value;
    }
    catch {
        return null;
    }
}
// "29.09.2026, 14:03" – date and time, as the dashboard shows every number.
export function formatSyncStamp(entry) {
    return new Date(entry.at).toLocaleString("de-AT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
