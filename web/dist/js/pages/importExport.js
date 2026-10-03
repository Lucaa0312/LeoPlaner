import { initAppShell } from "../components/appShell.js";
import { createActionButton, createPageHeader } from "../components/pageHeader.js";
import { showToast } from "../components/toast.js";
import { initImportButton } from "../features/importButton.js";
import { initExportButton } from "../features/exportButton.js";
import { createAdminButtons } from "../features/adminActions.js";
import { fetchAdminFeatures } from "../api/adminApi.js";
import { aquireElement } from "../utils/elementHelpers.js";
let adminCard = null;
function createCardTitle(text) {
    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = text;
    return title;
}
function buildPage() {
    const page = aquireElement("page");
    const header = createPageHeader({
        kicker: "Excel · Tabellenblätter Subjects, Rooms, Teachers, SchoolClasses, ClassSubjects",
        title: "Import / Export",
        actions: [],
    });
    const layout = document.createElement("div");
    layout.className = "io-layout";
    adminCard = document.createElement("section");
    adminCard.className = "card hidden";
    layout.append(buildImportCard(), buildExportCard());
    page.replaceChildren(header, layout, adminCard);
}
function buildImportCard() {
    const card = document.createElement("section");
    card.className = "card";
    const dropArea = document.createElement("div");
    dropArea.className = "import-area";
    const icon = document.createElement("i");
    icon.className = "ti ti-file-spreadsheet";
    const text = document.createElement("span");
    text.className = "strong";
    text.textContent = "Excel-Datei oder Schuldaten auswählen";
    const hint = document.createElement("span");
    hint.className = "muted";
    hint.textContent = "Eine .xlsx-Datei oder alle Schuldaten-Dateien (.sql, GPU006, GPU002, Wünsche .json) gemeinsam";
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.txt,.sql,.json";
    input.multiple = true;
    input.hidden = true;
    const chooseButton = createActionButton({ id: "choose-files", icon: "ti-upload", label: "Dateien auswählen", primary: true });
    function handleChooseClick() {
        input.click();
    }
    chooseButton.addEventListener("click", handleChooseClick);
    dropArea.append(icon, text, hint, chooseButton, input);
    const fileList = document.createElement("ul");
    fileList.className = "import-files";
    const statusText = document.createElement("p");
    statusText.className = "import-status";
    const errorText = document.createElement("p");
    errorText.className = "text-bad";
    initImportButton({ input, fileList, statusText, errorText, onImported: handleImported });
    card.append(createCardTitle("Import"), dropArea, fileList, statusText, errorText);
    return card;
}
function handleImported() {
    showToast("Import abgeschlossen");
}
function buildExportCard() {
    const card = document.createElement("section");
    card.className = "card";
    const row = document.createElement("div");
    row.className = "export-row";
    const icon = document.createElement("i");
    icon.className = "ti ti-database";
    const text = document.createElement("div");
    text.className = "notice-text";
    const label = document.createElement("span");
    label.className = "strong";
    label.textContent = "Stammdaten";
    const file = document.createElement("span");
    file.className = "muted mono";
    file.textContent = "leoplaner-export-<Datum>.xlsx";
    text.append(label, file);
    const downloadButton = createActionButton({ id: "excel-export", icon: "ti-download", label: "Herunterladen", primary: false });
    const errorText = document.createElement("p");
    errorText.className = "text-bad";
    initExportButton(downloadButton, errorText);
    row.append(icon, text, downloadButton);
    card.append(createCardTitle("Export"), row, errorText);
    return card;
}
function renderAdminActions(features) {
    if (!adminCard) {
        return;
    }
    if (!features.demoDataEnabled && !features.resetEnabled) {
        adminCard.classList.add("hidden");
        return;
    }
    const actions = document.createElement("div");
    actions.className = "page-actions";
    for (const button of createAdminButtons(features, handleAdminDataChanged)) {
        actions.appendChild(button);
    }
    const hint = document.createElement("span");
    hint.className = "muted";
    hint.textContent = "Nur in der Entwicklungsumgebung verfügbar.";
    adminCard.replaceChildren(createCardTitle("Daten verwalten"), actions, hint);
    adminCard.classList.remove("hidden");
}
// Import / Export shows nothing that depends on the data, so there is nothing to reload.
function handleAdminDataChanged() {
    // nothing to do
}
async function initializeApp() {
    initAppShell("importExport");
    buildPage();
    renderAdminActions(await fetchAdminFeatures());
}
document.addEventListener("DOMContentLoaded", initializeApp);
