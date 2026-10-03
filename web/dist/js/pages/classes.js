import { initAppShell } from "../components/appShell.js";
import { createPageHeader, setPageKicker } from "../components/pageHeader.js";
import { createActionsCell, createDataTable, createEmptyRow, createSearchBox, createTextCell, matchesSearch, } from "../components/dataTable.js";
import { showNotAvailable } from "../components/placeholder.js";
import { fetchClassSubjects, fetchSchoolClasses } from "../api/classSubjectApi.js";
import { aquireElement } from "../utils/elementHelpers.js";
// The backend can only read classes. Create, edit and delete are placeholders.
const COLUMNS = ["Name", "Stammraum", "Fächer", "Std./Woche"];
let schoolClasses = [];
let classSubjects = [];
let searchQuery = "";
let tableBody = null;
function formatHomeRoom(schoolClass) {
    if (schoolClass.roomDTO) {
        return `${schoolClass.roomDTO.nameShort} · ${schoolClass.roomDTO.roomName}`;
    }
    return "";
}
function buildPage() {
    const page = aquireElement("page");
    const header = createPageHeader({
        kicker: "Stammdaten",
        title: "Klassen",
        actions: [{ id: "add-btn", icon: "ti-plus", label: "Neu: Klasse", primary: true }],
    });
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    toolbar.appendChild(createSearchBox(handleSearch));
    const layout = document.createElement("div");
    layout.className = "table-layout";
    const table = createDataTable(COLUMNS);
    tableBody = table.body;
    layout.appendChild(table.element);
    page.replaceChildren(header, toolbar, layout);
    const addButton = aquireElement("add-btn");
    addButton.addEventListener("click", showNotAvailable);
}
function handleSearch(query) {
    searchQuery = query;
    renderRows();
}
async function loadAndRenderClasses() {
    try {
        schoolClasses = await fetchSchoolClasses();
    }
    catch (error) {
        console.error("Fehler beim Laden der Klassen:", error);
        schoolClasses = [];
    }
    try {
        classSubjects = await fetchClassSubjects();
    }
    catch (error) {
        console.error("Fehler beim Laden der Klassen-Fächer:", error);
        classSubjects = [];
    }
    setPageKicker(`Stammdaten · ${schoolClasses.length} Einträge`);
    renderRows();
}
function renderRows() {
    if (!tableBody) {
        return;
    }
    tableBody.replaceChildren();
    for (const schoolClass of schoolClasses) {
        if (matchesSearch(searchQuery, [schoolClass.className, formatHomeRoom(schoolClass)])) {
            tableBody.appendChild(createClassRow(schoolClass));
        }
    }
    if (tableBody.children.length === 0) {
        tableBody.appendChild(createEmptyRow(COLUMNS.length, "Keine Einträge gefunden."));
    }
}
function createClassRow(schoolClass) {
    const row = document.createElement("tr");
    let subjectCount = 0;
    let weeklyHours = 0;
    for (const classSubject of classSubjects) {
        if (classSubject.className === schoolClass.className) {
            subjectCount = subjectCount + 1;
            weeklyHours = weeklyHours + classSubject.weeklyHours;
        }
    }
    let roomCell;
    if (schoolClass.roomDTO) {
        roomCell = createTextCell(formatHomeRoom(schoolClass), "");
    }
    else {
        roomCell = createTextCell("kein Stammraum", "text-bad");
    }
    row.append(createTextCell(schoolClass.className, "mono strong"), roomCell, createTextCell(String(subjectCount), "mono"), createTextCell(String(weeklyHours), "mono"), createActionsCell(showNotAvailable, showNotAvailable));
    return row;
}
function initializeApp() {
    initAppShell("classes");
    buildPage();
    void loadAndRenderClasses();
}
document.addEventListener("DOMContentLoaded", initializeApp);
