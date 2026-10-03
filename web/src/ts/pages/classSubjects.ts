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
import { createSidePanel, createFormField, createSelect, fillSelect } from "../components/sidePanel.js";
import { createSearchSelect } from "../components/searchSelect.js";
import type { SearchSelect } from "../components/searchSelect.js";
import type { SelectOption } from "../components/sidePanel.js";
import { createToggleSwitch } from "../components/toggleSwitch.js";
import { showNotAvailable } from "../components/placeholder.js";
import { showToast } from "../components/toast.js";
import { createClassSubject, fetchClassSubjects, fetchSchoolClasses } from "../api/classSubjectApi.js";
import { fetchSubjects } from "../api/subjectApi.js";
import { fetchTeachers } from "../api/teacherApi.js";
import { aquireElement } from "../utils/elementHelpers.js";
import type { ClassSubject, CreateClassSubjectRequest } from "../types/classSubject.js";
import type { SchoolClass } from "../types/schoolClass.js";
import type { Subject } from "../types/subject.js";
import type { Teacher } from "../types/teacher.js";

// Creating works. The backend has no update or delete and sends no id, so edit and delete are placeholders.

const COLUMNS = ["Klasse", "Fach", "Lehrer", "Std./Woche", "Doppelstunde"];
const ALL_CLASSES = "all";

let classSubjects: ClassSubject[] = [];
let schoolClasses: SchoolClass[] = [];
let subjects: Subject[] = [];
let teachers: Teacher[] = [];
let searchQuery = "";
let classFilter = ALL_CLASSES;
let tableBody: HTMLTableSectionElement | null = null;
let classFilterSelect: SearchSelect | null = null;
let panelSlot: HTMLElement | null = null;

function formatTeachers(classSubject: ClassSubject): string {
    const names: string[] = [];
    for (const teacher of classSubject.teacher) {
        names.push(`${teacher.nameSymbol} · ${teacher.teacherName}`);
    }
    return names.join(", ");
}

function formatDoublePeriod(classSubject: ClassSubject): string {
    if (classSubject.requiresDoublePeriod) {
        return "Pflicht";
    } else if (classSubject.isBetterDoublePeriod) {
        return "bevorzugt";
    }
    return "–";
}

function teachesSubject(teacher: Teacher, subjectId: number): boolean {
    for (const subject of teacher.teachingSubject) {
        if (subject.id === subjectId) {
            return true;
        }
    }
    return false;
}

function buildPage(): void {
    const page = aquireElement<HTMLElement>("page");

    const header = createPageHeader({
        kicker: "Stammdaten",
        title: "Klassen-Fächer",
        actions: [{ id: "add-btn", icon: "ti-plus", label: "Neu: Zuordnung", primary: true }],
    });

    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";

    classFilterSelect = createSearchSelect(handleClassFilterChange);
    classFilterSelect.element.classList.add("class-filter");

    toolbar.append(createSearchBox(handleSearch), classFilterSelect.element);
    // shows "Alle Klassen" right away, the classes are added after loading
    renderFilters();

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
    openClassSubjectForm();
}

async function loadAndRender(): Promise<void> {
    try {
        classSubjects = await fetchClassSubjects();
    } catch (error) {
        console.error("Fehler beim Laden der Klassen-Fächer:", error);
        classSubjects = [];
    }

    try {
        schoolClasses = await fetchSchoolClasses();
    } catch (error) {
        console.error("Fehler beim Laden der Klassen:", error);
        schoolClasses = [];
    }

    try {
        subjects = await fetchSubjects();
    } catch (error) {
        console.error("Fehler beim Laden der Fächer:", error);
        subjects = [];
    }

    try {
        teachers = await fetchTeachers();
    } catch (error) {
        console.error("Fehler beim Laden der Lehrer:", error);
        teachers = [];
    }

    setPageKicker(`Stammdaten · ${classSubjects.length} Einträge`);
    renderFilters();
    renderRows();
}

// "Alle Klassen" stays first, the classes are listed sorted and can be searched.
function renderFilters(): void {
    if (!classFilterSelect) {
        return;
    }

    const options: SelectOption[] = [];
    for (const schoolClass of schoolClasses) {
        options.push({ value: schoolClass.className, label: schoolClass.className });
    }

    classFilterSelect.setOptions(options, classFilter, { value: ALL_CLASSES, label: "Alle Klassen" });
}

function handleClassFilterChange(): void {
    if (!classFilterSelect) {
        return;
    }

    classFilter = classFilterSelect.getValue();
    renderRows();
}

function renderRows(): void {
    if (!tableBody) {
        return;
    }

    tableBody.replaceChildren();

    for (const classSubject of classSubjects) {
        let inFilter = true;
        if (classFilter !== ALL_CLASSES && classSubject.className !== classFilter) {
            inFilter = false;
        }

        const texts = [
            classSubject.className,
            classSubject.subject.subjectSymbol,
            classSubject.subject.subjectName,
            formatTeachers(classSubject),
        ];

        if (inFilter && matchesSearch(searchQuery, texts)) {
            tableBody.appendChild(createClassSubjectRow(classSubject));
        }
    }

    if (tableBody.children.length === 0) {
        tableBody.appendChild(createEmptyRow(COLUMNS.length, "Keine Einträge gefunden."));
    }
}

function createClassSubjectRow(classSubject: ClassSubject): HTMLTableRowElement {
    const row = document.createElement("tr");

    let teacherCell: HTMLTableCellElement;
    if (classSubject.teacher.length > 0) {
        teacherCell = createTextCell(formatTeachers(classSubject), "");
    } else {
        teacherCell = createTextCell("kein Lehrer", "text-bad strong");
    }

    let doublePeriodClass = "";
    if (classSubject.requiresDoublePeriod) {
        doublePeriodClass = "strong";
    } else if (!classSubject.isBetterDoublePeriod) {
        doublePeriodClass = "muted";
    }

    row.append(
        createTextCell(classSubject.className, "mono strong"),
        createTextCell(`${classSubject.subject.subjectSymbol} · ${classSubject.subject.subjectName}`, ""),
        teacherCell,
        createTextCell(String(classSubject.weeklyHours), "mono"),
        createTextCell(formatDoublePeriod(classSubject), doublePeriodClass),
        createActionsCell(showNotAvailable, showNotAvailable),
    );

    return row;
}

function openClassSubjectForm(): void {
    if (!panelSlot) {
        return;
    }

    if (schoolClasses.length === 0 || subjects.length === 0) {
        showToast("Zuerst werden Klassen und Fächer benötigt.");
        return;
    }

    const classOptions: SelectOption[] = [];
    let selectedClassId = String(schoolClasses[0]!.id);
    for (const schoolClass of schoolClasses) {
        classOptions.push({ value: String(schoolClass.id), label: schoolClass.className });
        if (schoolClass.className === classFilter) {
            selectedClassId = String(schoolClass.id);
        }
    }

    const subjectOptions: SelectOption[] = [];
    for (const subject of subjects) {
        subjectOptions.push({ value: String(subject.id), label: `${subject.subjectSymbol} · ${subject.subjectName}` });
    }

    const classSelect = createSearchSelect(handleClassChange);
    classSelect.setOptions(classOptions, selectedClassId);
    const subjectSelect = createSearchSelect(fillTeacherOptions);
    subjectSelect.setOptions(subjectOptions, String(subjects[0]!.id));
    const teacherSelect = createSelect([], "");
    fillTeacherOptions();

    const hoursInput = document.createElement("input");
    hoursInput.type = "number";
    hoursInput.className = "form-input mono";
    hoursInput.min = "1";
    hoursInput.max = "12";
    hoursInput.value = "2";

    const requiresDouble = createToggleSwitch("Muss als Doppelstunde stattfinden (hart)", false);
    const betterDouble = createToggleSwitch("Besser als Doppelstunde (weich)", false);

    const panel = createSidePanel({
        title: "Neue Zuordnung",
        onSave: handleSaveClick,
        onCancel: closeClassSubjectForm,
    });

    panel.body.append(
        createFormField("Klasse", classSelect.element, ""),
        createFormField("Fach", subjectSelect.element, ""),
        createFormField("Lehrer", teacherSelect, "Nur Lehrer, die das Fach unterrichten."),
        createFormField("Wochenstunden", hoursInput, ""),
        createFormField("Doppelstunde", requiresDouble.element, ""),
        createFormField("", betterDouble.element, ""),
    );

    // The class only matters when saving.
    function handleClassChange(): void {
        // nothing to update
    }

    // Offers only the teachers of the chosen subject.
    function fillTeacherOptions(): void {
        const subjectId = Number(subjectSelect.getValue());
        const teacherOptions: SelectOption[] = [{ value: "", label: "— kein Lehrer —" }];

        for (const teacher of teachers) {
            if (teachesSubject(teacher, subjectId)) {
                teacherOptions.push({ value: String(teacher.id), label: `${teacher.nameSymbol} · ${teacher.teacherName}` });
            }
        }

        fillSelect(teacherSelect, teacherOptions, "");
    }

    async function handleSaveClick(): Promise<void> {
        panel.clearError();

        const hours = Number(hoursInput.value);
        if (!Number.isInteger(hours) || hours <= 0) {
            panel.showError("Wochenstunden müssen größer als 0 sein.");
            return;
        }

        const assignedTeachers: { id: number }[] = [];
        if (teacherSelect.value !== "") {
            assignedTeachers.push({ id: Number(teacherSelect.value) });
        }

        const classSubjectData: CreateClassSubjectRequest = {
            subject: { id: Number(subjectSelect.getValue()) },
            teachers: assignedTeachers,
            schoolClass: { id: Number(classSelect.getValue()) },
            weeklyHours: hours,
            requiresDoublePeriod: requiresDouble.isOn(),
            betterDoublePeriod: betterDouble.isOn(),
        };

        panel.setSaving(true);
        try {
            await createClassSubject(classSubjectData);
        } catch (error) {
            console.error("Fehler beim Speichern der Zuordnung:", error);
            panel.showError("Speichern fehlgeschlagen.");
            panel.setSaving(false);
            return;
        }

        closeClassSubjectForm();
        showToast("Zuordnung gespeichert");
        await loadAndRender();
    }


    panelSlot.replaceChildren(panel.element);
    panelSlot.className = "";
}

function closeClassSubjectForm(): void {
    if (!panelSlot) {
        return;
    }

    panelSlot.replaceChildren();
    panelSlot.className = "hidden";
}

function initializeApp(): void {
    initAppShell("classSubjects");
    buildPage();
    void loadAndRender();
}

document.addEventListener("DOMContentLoaded", initializeApp);
