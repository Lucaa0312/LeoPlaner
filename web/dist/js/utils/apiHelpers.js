const API_BASE_URL = "http://localhost:8080/api";
export async function getJson(path) {
    const response = await fetch(`${API_BASE_URL}${path}`);
    if (!response.ok) {
        throw new Error(`GET ${path} failed with status ${response.status}`);
    }
    return response.json();
}
export async function postJson(path, body) {
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
export async function getFetchResponse(path) {
    const res = await fetch(`${API_BASE_URL}${path}`, { method: "GET" });
    if (!res.ok) {
        throw new Error("Request failed: " + res.status);
    }
}
export async function putJson(url, data) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    }).then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    });
}
