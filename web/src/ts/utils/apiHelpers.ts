const API_BASE_URL = "http://localhost:8080/api";

export async function getJson<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`);

    if (!response.ok) {
        throw new Error(`GET ${path} failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
}

export async function postJson<TBody>(path: string, body: TBody): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`POST ${path} failed with status ${response.status}`);
    }
}