import { createActionButton } from "../components/pageHeader.js";
import { askConfirmation } from "../components/confirmDialog.js";
import { showToast } from "../components/toast.js";
import { loadDemoData, resetAllData } from "../api/adminApi.js";
// "Demodaten laden" and "Daten zurücksetzen", used on the Übersicht and on Import / Export.
// Only the actions enabled by the backend feature flags get a button.
let adminBusy = false;
// onChanged runs after the data was loaded or deleted, so the page can reload what it shows.
export function createAdminButtons(features, onChanged) {
    const buttons = [];
    async function handleDemoDataClick() {
        if (await runDemoData()) {
            onChanged();
        }
    }
    async function handleResetClick() {
        if (await runReset()) {
            onChanged();
        }
    }
    if (features.demoDataEnabled) {
        const demoButton = createActionButton({ id: "demo-data", icon: "ti-database-import", label: "Demodaten laden", primary: false });
        demoButton.addEventListener("click", handleDemoDataClick);
        buttons.push(demoButton);
    }
    if (features.resetEnabled) {
        const resetButton = createActionButton({ id: "reset-data", icon: "ti-trash", label: "Daten zurücksetzen", primary: false });
        resetButton.addEventListener("click", handleResetClick);
        buttons.push(resetButton);
    }
    return buttons;
}
async function runDemoData() {
    if (adminBusy) {
        return false;
    }
    adminBusy = true;
    try {
        const response = await loadDemoData();
        if (response.ok) {
            showToast("Demodaten geladen");
            return true;
        }
        else if (response.status === 409) {
            showToast("Es sind bereits Daten vorhanden. Bitte zuerst zurücksetzen.");
        }
        else {
            showToast(`Fehlgeschlagen (Status ${response.status})`);
        }
    }
    catch {
        showToast("Server nicht erreichbar");
    }
    finally {
        adminBusy = false;
    }
    return false;
}
async function runReset() {
    if (adminBusy) {
        return false;
    }
    const confirmed = await askConfirmation({
        title: "Alle Daten löschen?",
        text: "Alle Lehrer, Klassen, Räume, Fächer und Stundenpläne werden unwiderruflich gelöscht.",
        confirmLabel: "Alles löschen",
    });
    if (!confirmed) {
        return false;
    }
    adminBusy = true;
    try {
        const response = await resetAllData();
        if (response.ok) {
            showToast("Alle Daten gelöscht");
            return true;
        }
        else if (response.status === 409) {
            showToast("Der Algorithmus läuft gerade. Bitte zuerst stoppen.");
        }
        else {
            showToast(`Fehlgeschlagen (Status ${response.status})`);
        }
    }
    catch {
        showToast("Server nicht erreichbar");
    }
    finally {
        adminBusy = false;
    }
    return false;
}
