// Landing page. Pings the dev seeding endpoint like before, but quietly – the
// landing page should not surface backend toasts.
const API_BASE_URL = "http://localhost:8080/api";

async function initializeApp(): Promise<void> {
    try {
        await fetch(`${API_BASE_URL}/run/testCsvNew`);
    } catch (error) {
        console.warn("Backend not reachable from landing page:", error);
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);
