import { showToast } from "./toast.js";

// For buttons whose backend endpoint does not exist yet. Sends nothing.
export function showNotAvailable(): void {
    showToast("Diese Funktion ist noch nicht verfügbar.");
}
