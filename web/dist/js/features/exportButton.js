import { exportFile } from "../api/downloadApi.js";
export function initExportButton() {
    const button = document.getElementById("excel-export");
    const errorText = document.getElementById("export-error");
    if (!button || !errorText)
        return;
    button.addEventListener("click", async () => {
        errorText.textContent = "";
        button.disabled = true;
        try {
            const blob = await exportFile();
            if (blob.size === 0) {
                errorText.textContent = "Die exportierte Datei ist leer";
                return;
            }
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const timestamp = new Date().toISOString().slice(0, 10);
            a.download = `leoplaner-export-${timestamp}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            console.log("Export successful");
        }
        catch (error) {
            errorText.textContent = "Fehler beim Exportieren";
        }
        finally {
            button.disabled = false;
        }
    });
}
