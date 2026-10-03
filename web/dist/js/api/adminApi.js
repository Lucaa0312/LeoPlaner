import { API_BASE_URL } from "../utils/apiBase.js";
// Asks the backend which admin actions are enabled (dev: both, cloud: none).
// Any failure counts as "disabled", so the buttons stay hidden.
export async function fetchAdminFeatures() {
    const disabled = { resetEnabled: false, demoDataEnabled: false };
    try {
        const res = await fetch(`${API_BASE_URL}/admin/features`);
        if (!res.ok) {
            return disabled;
        }
        return (await res.json());
    }
    catch {
        return disabled;
    }
}
// The callers need the status code (409 has its own message), so the response is returned as is.
export function loadDemoData() {
    return fetch(`${API_BASE_URL}/admin/demo-data`, { method: "POST" });
}
export function resetAllData() {
    return fetch(`${API_BASE_URL}/admin/data`, { method: "DELETE" });
}
