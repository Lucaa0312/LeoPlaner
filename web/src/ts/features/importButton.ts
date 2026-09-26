import { uploadFiles, type ImportResult } from "../api/uploadApi.js";
import { initializeApp } from "../pages/dashboard.js";

// Excel, or the school data: timetable export (.sql), Untis GPU006/GPU002 (.txt)
// and the teacher wishes (.json). What a file really is, the backend decides by its content.
const allowedExtensions = [".xlsx", ".xls", ".txt", ".sql", ".json"];
const maxFileSizeMB = 5;

export function initImportButton(): void {
  const input = document.getElementById(
    "data-upload",
  ) as HTMLInputElement | null;
  const fileList = document.getElementById("import-files");
  const statusText = document.getElementById("import-status");
  const errorText = document.getElementById("import-error");

  if (!input || !fileList || !statusText || !errorText) return;

  input.addEventListener("change", async () => {
    fileList.replaceChildren();
    statusText.replaceChildren();
    errorText.textContent = "";

    const files = Array.from(input.files ?? []);
    // allows choosing the same files again after fixing something
    input.value = "";

    if (files.length === 0) return;

    const problem = checkFiles(files);
    if (problem) {
      errorText.textContent = problem;
      return;
    }

    statusText.textContent = "Wird importiert …";
    try {
      const { ok, result } = await uploadFiles(files);
      showResult(result, ok, fileList, statusText, errorText);
      if (ok) {
        await initializeApp();
      }
    } catch (error) {
      statusText.textContent = "";
      errorText.textContent = "Fehler beim Hochladen";
    }
  });
}

// Only what the browser can check cheaply; everything else is up to the backend.
function checkFiles(files: File[]): string | null {
  const maxBytes = maxFileSizeMB * 1024 * 1024;

  for (const file of files) {
    const isValidExtension = allowedExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );
    if (!isValidExtension) {
      return `„${file.name}“: nur Excel-Dateien (.xlsx, .xls) oder Schuldaten (.sql, .txt, .json) erlaubt`;
    }
    if (file.size > maxBytes) {
      return `„${file.name}“ darf maximal ${maxFileSizeMB}MB groß sein`;
    }
    if (file.size === 0) {
      return `„${file.name}“ ist leer`;
    }
    if (file.name.length > 255) {
      return "Dateiname ist zu lang";
    }
  }
  return null;
}

// Lists every file with what it was recognized as, so a correct file is never
// mistaken for a broken one when only the combination is wrong.
function showResult(
  result: ImportResult,
  ok: boolean,
  fileList: HTMLElement,
  statusText: HTMLElement,
  errorText: HTMLElement,
): void {
  for (const file of result.files) {
    const recognized = file.type !== "nicht erkannt";
    const item = document.createElement("li");
    item.className = recognized ? "import-file" : "import-file unknown";
    item.textContent = `${recognized ? "✓" : "✗"} ${file.name} → ${file.type}`;
    fileList.appendChild(item);
  }

  statusText.replaceChildren();
  if (ok) {
    statusText.textContent = result.message;
    for (const warning of result.warnings) {
      const line = document.createElement("span");
      line.className = "import-warning";
      line.textContent = warning;
      statusText.appendChild(line);
    }
  } else {
    errorText.textContent = result.message;
  }
}
