import { initAppShell } from "../components/appShell.js";
import { createPageHeader, setPageKicker } from "../components/pageHeader.js";
import {
    createActionsCell,
    createDataTable,
    createEmptyRow,
    createSearchBox,
    createTextCell,
    matchesSearch,
} from "../components/dataTable.js";
import { showNotAvailable } from "../components/placeholder.js";
import { fetchClassSubjects, fetchSchoolClasses } from "../api/classSubjectApi.js";
import { aquireElement } from "../utils/elementHelpers.js";
import type { SchoolClass } from "../types/schoolClass.js";
import type { ClassSubject } from "../types/classSubject.js";

// The backend can only read classes. Create, edit and delete are placeholders.

const COLUMNS = ["Name", "Stammraum", "Fächer", "Std./Woche"];

let schoolClasses: SchoolClass[] = [];
let classSubjects: ClassSubject[] = [];
let searchQuery = "";
let tableBody: HTMLTableSectionElement | null = null;

function formatHomeRoom(schoolClass: SchoolClass): string {
    if (schoolClass.roomDTO) {
        return `${schoolClass.roomDTO.nameShort} · ${schoolClass.roomDTO.roomName}`;
    }
    return "";
}

function buildPage(): void {
    const page = aquireElement<HTMLElement>("page");

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

    const addButton = aquireElement<HTMLButtonElement>("add-btn");
    addButton.addEventListener("click", showNotAvailable);
}

function handleSearch(query: string): void {
    searchQuery = query;
    renderRows();
}

async function loadAndRenderClasses(): Promise<void> {
    try {
        schoolClasses = await fetchSchoolClasses();
    } catch (error) {
        console.error("Fehler beim Laden der Klassen:", error);
        schoolClasses = [];
    }

    try {
        classSubjects = await fetchClassSubjects();
    } catch (error) {
        console.error("Fehler beim Laden der Klassen-Fächer:", error);
        classSubjects = [];
    }

    setPageKicker(`Stammdaten · ${schoolClasses.length} Einträge`);
    renderRows();
}

function renderRows(): void {
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

function createClassRow(schoolClass: SchoolClass): HTMLTableRowElement {
    const row = document.createElement("tr");

    let subjectCount = 0;
    let weeklyHours = 0;
    for (const classSubject of classSubjects) {
        if (classSubject.className === schoolClass.className) {
            subjectCount = subjectCount + 1;
            weeklyHours = weeklyHours + classSubject.weeklyHours;
        }
    }

    let roomCell: HTMLTableCellElement;
    if (schoolClass.roomDTO) {
        roomCell = createTextCell(formatHomeRoom(schoolClass), "");
    } else {
        roomCell = createTextCell("kein Stammraum", "text-bad");
    }

    row.append(
        createTextCell(schoolClass.className, "mono strong"),
        roomCell,
        createTextCell(String(subjectCount), "mono"),
        createTextCell(String(weeklyHours), "mono"),
        createActionsCell(showNotAvailable, showNotAvailable),
    );

    return row;
}

function initializeApp(): void {
    initAppShell("classes");
    buildPage();
    void loadAndRenderClasses();
}

document.addEventListener("DOMContentLoaded", initializeApp);
