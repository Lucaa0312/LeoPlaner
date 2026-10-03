import { API_BASE_URL } from "../utils/apiBase.js";

export type AdminFeatures = {
  resetEnabled: boolean;
  demoDataEnabled: boolean;
};

// Asks the backend which admin actions are enabled (dev: both, cloud: none).
// Any failure counts as "disabled", so the buttons stay hidden.
export async function fetchAdminFeatures(): Promise<AdminFeatures> {
  const disabled = { resetEnabled: false, demoDataEnabled: false };
  try {
    const res = await fetch(`${API_BASE_URL}/admin/features`);
    if (!res.ok) {
      return disabled;
    }
    return (await res.json()) as AdminFeatures;
  } catch {
    return disabled;
  }
}

// The callers need the status code (409 has its own message), so the response is returned as is.
export function loadDemoData(): Promise<Response> {
  return fetch(`${API_BASE_URL}/admin/demo-data`, { method: "POST" });
}

export function resetAllData(): Promise<Response> {
  return fetch(`${API_BASE_URL}/admin/data`, { method: "DELETE" });
}
