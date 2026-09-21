import { toast } from "../components/toast.js";

const API_BASE_URL = "http://localhost:8080/api";

// Every helper still throws so callers can react (keep a modal open, log …),
// but the user always gets a toast – previously failures only reached the
// console.
function report(message: string, error: unknown): never {
    console.error(message, error);
    toast.error(message);
    throw error instanceof Error ? error : new Error(String(error));
}

async function request(path: string, init?: RequestInit): Promise<Response> {
    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, init);
    } catch (error) {
        report("Server nicht erreichbar. Läuft das Backend?", error);
    }
    return response;
}

export async function getJson<T>(path: string): Promise<T> {
    const response = await request(path);

    if (!response.ok) {
        report(
            "Daten konnten nicht geladen werden.",
            new Error(`GET ${path} failed with status ${response.status}`),
        );
    }

    return response.json() as Promise<T>;
}

export async function postJson<TBody>(path: string, body: TBody): Promise<void> {
    const response = await request(path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        report(
            "Speichern fehlgeschlagen.",
            new Error(`POST ${path} failed with status ${response.status}`),
        );
    }
}

export async function getFetchResponse(path: string): Promise<void> {
    const res = await request(path, { method: "GET" });
    if (!res.ok) {
        report("Anfrage fehlgeschlagen.", new Error("Request failed: " + res.status));
    }
}

export async function putJson<T>(url: string, data: T): Promise<void> {
    const response = await request(url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        report(
            "Aktualisieren fehlgeschlagen.",
            new Error(`PUT ${url} failed with status ${response.status}`),
        );
    }
}
