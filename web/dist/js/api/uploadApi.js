import { API_BASE_URL } from "../utils/apiBase.js";
// Sends all selected files in one request. The backend decides by content what
// each file is and whether the combination can be imported.
export async function uploadFiles(files) {
    const formData = new FormData();
    for (const file of files) {
        formData.append("files", file, file.name);
    }
    const response = await fetch(`${API_BASE_URL}/import`, {
        method: "POST",
        body: formData,
    });
    try {
        return { ok: response.ok, result: (await response.json()) };
    }
    catch {
        // no JSON, e.g. a proxy error page
        return {
            ok: false,
            result: {
                message: `Fehler beim Hochladen (Status ${response.status})`,
                files: [],
                warnings: [],
            },
        };
    }
}
