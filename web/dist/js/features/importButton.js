import { uploadFile } from "../api/uploadApi.js";
import { initializeApp } from "../pages/dashboard.js";
const allowedExtensions = [".xlsx", ".xls"];
const maxFileSizeMB = 5;
export function initImportButton() {
    const input = document.getElementById("excel-upload");
    const fileName = document.getElementById("import-file-name");
    const errorText = document.getElementById("import-error");
    if (!input || !fileName || !errorText)
        return;
    input.addEventListener("change", async () => {
        errorText.textContent = "";
        const file = input.files?.[0];
        if (!file)
            return;
        // extension check
        const isValidExtension = allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
        if (!isValidExtension) {
            errorText.textContent = "Nur Excel-Dateien erlaubt (.xlsx, .xls)";
            input.value = "";
            return;
        }
        // size check
        const maxBytes = maxFileSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
            errorText.textContent = `Datei darf maximal ${maxFileSizeMB}MB groß sein`;
            input.value = "";
            return;
        }
        if (file.size === 0) {
            errorText.textContent = "Die Datei ist leer";
            return;
        }
        if (file.name.length > 255) {
            errorText.textContent = "Dateiname ist zu lang";
            return;
        }
        const allowedMimeTypes = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
            "application/vnd.ms-excel", // .xls
        ];
        const isValidMime = allowedMimeTypes.includes(file.type);
        if (!isValidMime || !isValidExtension) {
            errorText.textContent = "Ungültige Datei";
            input.value = "";
            return;
        }
        fileName.textContent = file.name;
        console.log("Valid Excel file:", file);
        try {
            await uploadFile(file);
            await initializeApp();
        }
        catch (error) {
            errorText.textContent = "Fehler beim Hochladen";
        }
    });
}
