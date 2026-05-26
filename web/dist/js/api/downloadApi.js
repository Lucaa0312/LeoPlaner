const API_BASE_URL = "http://localhost:8080/api";
export async function exportFile() {
    const response = await fetch(`${API_BASE_URL}/test-export`, {
        method: "GET",
        headers: {
            Accept: "application/octet-stream",
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GET failed with status ${response.status}: ${errorText}`);
    }
    return await response.blob();
}
