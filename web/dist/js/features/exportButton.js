import { exportFile } from "../api/downloadApi.js";
// Downloads the master data as leoplaner-export-<date>.xlsx. errorText shows what went wrong.
export function initExportButton(button, errorText) {
    async function handleExportClick() {
        errorText.textContent = "";
        button.disabled = true;
        try {
            const blob = await exportFile();
            if (blob.size === 0) {
                errorText.textContent = "Die exportierte Datei ist leer";
                return;
            }
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const timestamp = new Date().toISOString().slice(0, 10);
            link.download = `leoplaner-export-${timestamp}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }
        catch (error) {
            errorText.textContent = "Fehler beim Exportieren";
        }
        finally {
            button.disabled = false;
        }
    }
    button.addEventListener("click", handleExportClick);
}
