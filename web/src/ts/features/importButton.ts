import { uploadFiles, type ImportResult } from "../api/uploadApi.js";

// Excel, or the school data: timetable export (.sql), Untis GPU006/GPU002 (.txt)
// and the teacher wishes (.json). What a file really is, the backend decides by its content.
const allowedExtensions = [".xlsx", ".xls", ".txt", ".sql", ".json"];
const maxFileSizeMB = 5;

type ImportElements = {
  input: HTMLInputElement;
  fileList: HTMLElement;
  statusText: HTMLElement;
  errorText: HTMLElement;
  onImported: () => void;
};

export function initImportButton({ input, fileList, statusText, errorText, onImported }: ImportElements): void {
  async function handleFilesChosen(): Promise<void> {
    fileList.replaceChildren();
    statusText.replaceChildren();
    errorText.textContent = "";

    const files: File[] = [];
    if (input.files) {
      for (const file of Array.from(input.files)) {
        files.push(file);
      }
    }
    // allows choosing the same files again after fixing something
    input.value = "";

    if (files.length === 0) {
      return;
    }

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
        onImported();
      }
    } catch (error) {
      statusText.textContent = "";
      errorText.textContent = "Fehler beim Hochladen";
    }
  }

  input.addEventListener("change", handleFilesChosen);
}

function hasAllowedExtension(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  for (const extension of allowedExtensions) {
    if (lowerName.endsWith(extension)) {
      return true;
    }
  }
  return false;
}

// Only what the browser can check cheaply; everything else is up to the backend.
function checkFiles(files: File[]): string | null {
  const maxBytes = maxFileSizeMB * 1024 * 1024;

  for (const file of files) {
    if (!hasAllowedExtension(file.name)) {
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
    const item = document.createElement("li");
    const icon = document.createElement("i");

    if (file.type !== "nicht erkannt") {
      item.className = "import-file";
      icon.className = "ti ti-circle-check";
    } else {
      item.className = "import-file unknown";
      icon.className = "ti ti-circle-x";
    }

    const text = document.createElement("span");
    text.textContent = `${file.name} → ${file.type}`;

    item.append(icon, text);
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
