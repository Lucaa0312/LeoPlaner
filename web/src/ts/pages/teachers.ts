import { initAppShell } from "../components/appShell.js";
import { createPageHeader, setPageKicker } from "../components/pageHeader.js";
import {
    createActionsCell,
    createDataTable,
    createElementCell,
    createEmptyRow,
    createSearchBox,
    createTextCell,
    matchesSearch,
} from "../components/dataTable.js";
import { createSidePanel, createFormField, createTextInput } from "../components/sidePanel.js";
import { createChipList } from "../components/chipSelect.js";
import { createSearchMultiSelect } from "../components/searchSelect.js";
import type { MultiOption } from "../components/searchSelect.js";
import { askConfirmation } from "../components/confirmDialog.js";
import { showToast } from "../components/toast.js";
import { fetchTeachers, createTeacher, updateTeacher, deleteTeacher } from "../api/teacherApi.js";
import { fetchSubjects } from "../api/subjectApi.js";
import { fetchClassSubjects } from "../api/classSubjectApi.js";
import { aquireElement } from "../utils/elementHelpers.js";
import type { CreateTeacherRequest, Teacher, TimeSlot } from "../types/teacher.js";
import type { Subject } from "../types/subject.js";
import type { ClassSubject } from "../types/classSubject.js";

const COLUMNS = ["Name", "Kürzel", "Unterrichtsfächer", "Std./Woche"];

let teachers: Teacher[] = [];
let subjects: Subject[] = [];
let classSubjects: ClassSubject[] = [];
let searchQuery = "";
let editingTeacherId: number | null = null;
let tableBody: HTMLTableSectionElement | null = null;
let panelSlot: HTMLElement | null = null;

// Weekly hours of all class-subjects this teacher is assigned to.
function countWeeklyHours(teacher: Teacher): number {
    let hours = 0;

    for (const classSubject of classSubjects) {
        for (const assigned of classSubject.teacher) {
            if (assigned.id === teacher.id) {
                hours = hours + classSubject.weeklyHours;
                break;
            }
        }
    }

    return hours;
}

function getSubjectSymbols(teacher: Teacher): string[] {
    const symbols: string[] = [];
    for (const subject of teacher.teachingSubject) {
        symbols.push(subject.subjectSymbol);
    }
    return symbols;
}

function buildPage(): void {
    const page = aquireElement<HTMLElement>("page");

    const header = createPageHeader({
        kicker: "Stammdaten",
        title: "Lehrer",
        actions: [{ id: "add-btn", icon: "ti-plus", label: "Neu: Lehrer", primary: true }],
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

    const addButton = aquireElement<HTMLButtonElement>("add-btn");
    addButton.addEventListener("click", handleAddClick);
}

function handleSearch(query: string): void {
    searchQuery = query;
    renderRows();
}

function handleAddClick(): void {
    openTeacherForm(null);
}

async function loadAndRenderTeachers(): Promise<void> {
    try {
        teachers = await fetchTeachers();
    } catch (error) {
        console.error("Fehler beim Laden der Lehrer:", error);
        teachers = [];
    }

    try {
        subjects = await fetchSubjects();
    } catch (error) {
        console.error("Fehler beim Laden der Fächer:", error);
        subjects = [];
    }

    try {
        classSubjects = await fetchClassSubjects();
    } catch (error) {
        console.error("Fehler beim Laden der Klassen-Fächer:", error);
        classSubjects = [];
    }

    setPageKicker(`Stammdaten · ${teachers.length} Einträge`);
    renderRows();
}

function renderRows(): void {
    if (!tableBody) {
        return;
    }

    tableBody.replaceChildren();

    for (const teacher of teachers) {
        const texts = [teacher.teacherName, teacher.nameSymbol, getSubjectSymbols(teacher).join(" ")];
        if (matchesSearch(searchQuery, texts)) {
            tableBody.appendChild(createTeacherRow(teacher));
        }
    }

    if (tableBody.children.length === 0) {
        tableBody.appendChild(createEmptyRow(COLUMNS.length, "Keine Einträge gefunden."));
    }
}

function createTeacherRow(teacher: Teacher): HTMLTableRowElement {
    const row = document.createElement("tr");

    if (teacher.id === editingTeacherId) {
        row.className = "selected";
    }

    const subjectSymbols = getSubjectSymbols(teacher);
    let subjectsCell: HTMLTableCellElement;
    if (subjectSymbols.length > 0) {
        subjectsCell = createElementCell(createChipList(subjectSymbols));
    } else {
        subjectsCell = createTextCell("keine", "muted");
    }

    function handleEditClick(): void {
        openTeacherForm(teacher);
    }

    function handleDeleteClick(): void {
        void confirmAndDeleteTeacher(teacher);
    }

    row.append(
        createTextCell(teacher.teacherName, "strong"),
        createTextCell(teacher.nameSymbol, "mono"),
        subjectsCell,
        createTextCell(String(countWeeklyHours(teacher)), "mono"),
        createActionsCell(handleEditClick, handleDeleteClick),
    );

    return row;
}

function openTeacherForm(teacher: Teacher | null): void {
    if (!panelSlot) {
        return;
    }

    let title = "Neuer Lehrer";
    let nameValue = "";
    let symbolValue = "";
    const selectedSubjects: string[] = [];

    if (teacher) {
        title = "Lehrer bearbeiten";
        nameValue = teacher.teacherName;
        symbolValue = teacher.nameSymbol;
        for (const subject of teacher.teachingSubject) {
            selectedSubjects.push(String(subject.id));
        }
        editingTeacherId = teacher.id;
    } else {
        editingTeacherId = null;
    }

    const nameInput = createTextInput(nameValue, "Nachname Vorname", false);
    const symbolInput = createTextInput(symbolValue, "z. B. HOF", true);

    const subjectOptions: MultiOption[] = [];
    for (const subject of subjects) {
        subjectOptions.push({
            value: String(subject.id),
            label: `${subject.subjectSymbol} · ${subject.subjectName}`,
            chipLabel: subject.subjectSymbol,
        });
    }
    const subjectSelect = createSearchMultiSelect(subjectOptions, selectedSubjects, "Fach hinzufügen");

    const panel = createSidePanel({ title, onSave: handleSaveClick, onCancel: closeTeacherForm });

    panel.body.append(
        createFormField("Name", nameInput, ""),
        createFormField("Kürzel", symbolInput, ""),
        createFormField(
            "Unterrichtsfächer",
            subjectSelect.element,
            "Verfügbarkeiten werden separat unter „Verfügbarkeit“ gepflegt.",
        ),
    );

    async function handleSaveClick(): Promise<void> {
        panel.clearError();

        const name = nameInput.value.trim();
        const symbol = symbolInput.value.trim();

        if (name === "" || symbol === "") {
            panel.showError("Bitte Name und Kürzel ausfüllen.");
            return;
        }

        const teachingSubject: { id: number }[] = [];
        for (const subjectId of subjectSelect.getSelected()) {
            teachingSubject.push({ id: Number(subjectId) });
        }

        // Keep what is stored, the form does not edit availability or wishes.
        let nonWorkingHours: TimeSlot[] = [];
        let nonPreferredHours: TimeSlot[] = [];
        let wishText: string | null = null;
        if (teacher) {
            nonWorkingHours = teacher.teacherNonWorkingHours;
            nonPreferredHours = teacher.teacherNonPreferredHours;
            wishText = teacher.wishText;
        }

        const teacherData: CreateTeacherRequest = {
            teacherName: name,
            nameSymbol: symbol,
            teachingSubject: teachingSubject,
            teacher_non_working_hours: nonWorkingHours,
            teacher_non_preferred_hours: nonPreferredHours,
            wishText: wishText,
        };

        panel.setSaving(true);
        try {
            if (teacher) {
                await updateTeacher(teacher.id, teacherData);
            } else {
                await createTeacher(teacherData);
            }
        } catch (error) {
            console.error("Fehler beim Speichern des Lehrers:", error);
            panel.showError("Speichern fehlgeschlagen.");
            panel.setSaving(false);
            return;
        }

        closeTeacherForm();
        showToast("Lehrer gespeichert");
        await loadAndRenderTeachers();
    }

    panelSlot.replaceChildren(panel.element);
    panelSlot.className = "";
    renderRows();
    nameInput.focus();
}

function closeTeacherForm(): void {
    if (!panelSlot) {
        return;
    }

    editingTeacherId = null;
    panelSlot.replaceChildren();
    panelSlot.className = "hidden";
    renderRows();
}

async function confirmAndDeleteTeacher(teacher: Teacher): Promise<void> {
    const confirmed = await askConfirmation({
        title: `Lehrer „${teacher.nameSymbol} · ${teacher.teacherName}“ löschen?`,
        text: "Das kann nicht rückgängig gemacht werden.",
        confirmLabel: "Löschen",
    });

    if (!confirmed) {
        return;
    }

    try {
        await deleteTeacher(teacher.id);
    } catch (error) {
        console.error("Fehler beim Löschen des Lehrers:", error);
        showToast("Löschen fehlgeschlagen.");
        return;
    }

    if (editingTeacherId === teacher.id) {
        closeTeacherForm();
    }
    showToast("Lehrer gelöscht");
    await loadAndRenderTeachers();
}

function initializeApp(): void {
    initAppShell("teachers");
    buildPage();
    void loadAndRenderTeachers();
}

document.addEventListener("DOMContentLoaded", initializeApp);
