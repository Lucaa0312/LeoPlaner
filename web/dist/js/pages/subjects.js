import { initAppShell } from "../components/appShell.js";
import { createPageHeader, setPageKicker } from "../components/pageHeader.js";
import { createActionsCell, createDataTable, createElementCell, createEmptyRow, createSearchBox, createTextCell, matchesSearch, } from "../components/dataTable.js";
import { createSidePanel, createFormField, createTextInput } from "../components/sidePanel.js";
import { createChipList, createChipSelect } from "../components/chipSelect.js";
import { askConfirmation } from "../components/confirmDialog.js";
import { showToast } from "../components/toast.js";
import { initColorPicker } from "../features/colorSelector.js";
import { fetchSubjects, createSubject, updateSubject, deleteSubject } from "../api/subjectApi.js";
import { fetchTeachers } from "../api/teacherApi.js";
import { aquireElement } from "../utils/elementHelpers.js";
import { ROOM_TYPES } from "../types/room.js";
const COLUMNS = ["Farbe", "Kürzel", "Name", "Benötigter Raumtyp", "Lehrer"];
let subjects = [];
let teachers = [];
let searchQuery = "";
let editingSubjectId = null;
let tableBody = null;
let panelSlot = null;
function formatColor(color) {
    return `rgb(${color.red}, ${color.green}, ${color.blue})`;
}
// Short codes of all teachers who teach this subject.
function findTeacherSymbols(subject) {
    const symbols = [];
    for (const teacher of teachers) {
        for (const taught of teacher.teachingSubject) {
            if (taught.id === subject.id) {
                symbols.push(teacher.nameSymbol);
                break;
            }
        }
    }
    return symbols;
}
function buildPage() {
    const page = aquireElement("page");
    const header = createPageHeader({
        kicker: "Stammdaten",
        title: "Fächer",
        actions: [{ id: "add-btn", icon: "ti-plus", label: "Neu: Fach", primary: true }],
    });
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    toolbar.appendChild(createSearchBox(handleSearch));
    const layout = document.createElement("div");
    layout.className = "table-layout";
    const table = createDataTable(COLUMNS);
    tableBody = table.body;
    panelSlot = document.createElement("div");
    panelSlot.className = "hidden";
    layout.append(table.element, panelSlot);
    page.replaceChildren(header, toolbar, layout);
    const addButton = aquireElement("add-btn");
    addButton.addEventListener("click", handleAddClick);
}
function handleSearch(query) {
    searchQuery = query;
    renderRows();
}
function handleAddClick() {
    openSubjectForm(null);
}
async function loadAndRenderSubjects() {
    try {
        subjects = await fetchSubjects();
    }
    catch (error) {
        console.error("Fehler beim Laden der Fächer:", error);
        subjects = [];
    }
    try {
        teachers = await fetchTeachers();
    }
    catch (error) {
        console.error("Fehler beim Laden der Lehrer:", error);
        teachers = [];
    }
    setPageKicker(`Stammdaten · ${subjects.length} Einträge`);
    renderRows();
}
function renderRows() {
    if (!tableBody) {
        return;
    }
    tableBody.replaceChildren();
    for (const subject of subjects) {
        const texts = [subject.subjectSymbol, subject.subjectName, subject.requiredRoomTypes.join(" ")];
        if (matchesSearch(searchQuery, texts)) {
            tableBody.appendChild(createSubjectRow(subject));
        }
    }
    if (tableBody.children.length === 0) {
        tableBody.appendChild(createEmptyRow(COLUMNS.length, "Keine Einträge gefunden."));
    }
}
function createSubjectRow(subject) {
    const row = document.createElement("tr");
    if (subject.id === editingSubjectId) {
        row.className = "selected";
    }
    const colorDot = document.createElement("span");
    colorDot.className = "color-dot";
    if (subject.subjectColor) {
        colorDot.style.background = formatColor(subject.subjectColor);
    }
    let typesCell;
    if (subject.requiredRoomTypes.length > 0) {
        typesCell = createElementCell(createChipList(subject.requiredRoomTypes));
    }
    else {
        typesCell = createTextCell("beliebig", "muted");
    }
    const teacherSymbols = findTeacherSymbols(subject);
    let teachersCell;
    if (teacherSymbols.length > 0) {
        teachersCell = createElementCell(createChipList(teacherSymbols));
    }
    else {
        teachersCell = createTextCell("keiner", "muted");
    }
    function handleEditClick() {
        openSubjectForm(subject);
    }
    function handleDeleteClick() {
        void confirmAndDeleteSubject(subject);
    }
    row.append(createElementCell(colorDot), createTextCell(subject.subjectSymbol, "mono strong"), createTextCell(subject.subjectName, ""), typesCell, teachersCell, createActionsCell(handleEditClick, handleDeleteClick));
    return row;
}
function openSubjectForm(subject) {
    if (!panelSlot) {
        return;
    }
    let title = "Neues Fach";
    let nameValue = "";
    let symbolValue = "";
    let selectedTypes = [];
    if (subject) {
        title = "Fach bearbeiten";
        nameValue = subject.subjectName;
        symbolValue = subject.subjectSymbol;
        selectedTypes = subject.requiredRoomTypes;
        editingSubjectId = subject.id;
    }
    else {
        editingSubjectId = null;
    }
    const nameInput = createTextInput(nameValue, "z. B. Angewandte Mathematik", false);
    const symbolInput = createTextInput(symbolValue, "z. B. AM", true);
    const typeOptions = [];
    for (const type of ROOM_TYPES) {
        typeOptions.push({ value: type, label: type });
    }
    const typeSelect = createChipSelect(typeOptions, selectedTypes);
    const colorContainer = document.createElement("div");
    const colorPicker = initColorPicker(colorContainer);
    if (subject && subject.subjectColor) {
        colorPicker.setColor(subject.subjectColor);
    }
    const panel = createSidePanel({ title, onSave: handleSaveClick, onCancel: closeSubjectForm });
    panel.body.append(createFormField("Name", nameInput, ""), createFormField("Kürzel", symbolInput, ""), createFormField("Benötigte Raumtypen", typeSelect.element, "Leer = jeder Raum. Bei mehreren reicht einer davon."), createFormField("Farbe", colorContainer, "Wird im Stundenplan verwendet."));
    async function handleSaveClick() {
        panel.clearError();
        const name = nameInput.value.trim();
        const symbol = symbolInput.value.trim();
        if (name === "" || symbol === "") {
            panel.showError("Bitte Name und Kürzel ausfüllen.");
            return;
        }
        const subjectData = {
            subjectName: name,
            subjectSymbol: symbol,
            requiredRoomTypes: typeSelect.getSelected(),
            subjectColor: colorPicker.getSelectedColor(),
        };
        panel.setSaving(true);
        try {
            if (subject) {
                await updateSubject(subject.id, subjectData);
            }
            else {
                await createSubject(subjectData);
            }
        }
        catch (error) {
            console.error("Fehler beim Speichern des Fachs:", error);
            panel.showError("Speichern fehlgeschlagen.");
            panel.setSaving(false);
            return;
        }
        closeSubjectForm();
        showToast("Fach gespeichert");
        await loadAndRenderSubjects();
    }
    panelSlot.replaceChildren(panel.element);
    panelSlot.className = "";
    renderRows();
    nameInput.focus();
}
function closeSubjectForm() {
    if (!panelSlot) {
        return;
    }
    editingSubjectId = null;
    panelSlot.replaceChildren();
    panelSlot.className = "hidden";
    renderRows();
}
async function confirmAndDeleteSubject(subject) {
    const confirmed = await askConfirmation({
        title: `Fach „${subject.subjectSymbol} · ${subject.subjectName}“ löschen?`,
        text: "Das kann nicht rückgängig gemacht werden.",
        confirmLabel: "Löschen",
    });
    if (!confirmed) {
        return;
    }
    try {
        await deleteSubject(subject.id);
    }
    catch (error) {
        console.error("Fehler beim Löschen des Fachs:", error);
        showToast("Löschen fehlgeschlagen.");
        return;
    }
    if (editingSubjectId === subject.id) {
        closeSubjectForm();
    }
    showToast("Fach gelöscht");
    await loadAndRenderSubjects();
}
function initializeApp() {
    initAppShell("subjects");
    buildPage();
    void loadAndRenderSubjects();
}
document.addEventListener("DOMContentLoaded", initializeApp);
