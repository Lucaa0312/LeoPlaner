const API_BASE_URL = "http://localhost:8080/api";
export async function uploadFile(file) {
    const response = await fetch(`${API_BASE_URL}/uploadExcel`, {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
        },
        body: file,
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`POST failed with status ${response.status}: ${errorText}`);
    }
}
