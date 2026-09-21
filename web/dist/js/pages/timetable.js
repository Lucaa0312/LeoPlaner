import { getElement, aquireElement } from "../utils/elementHelpers.js";
import initNavbar from "./navbar.js";
import { clearCharts } from "./graph.js";
import { getFetchResponse } from "../utils/apiHelpers.js";
import { initExportButton } from "../features/exportButton.js";
import { initViewSwitcher } from "../features/viewSwitcher.js";
import { renderEmptyState } from "../components/emptyState.js";
import { toast } from "../components/toast.js";
const API = "http://localhost:8080/api";
const DAYS = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
];
const DAYS_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const DAYS_LONG = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
];
const units = [
    { eh: "1. EH", start: "08:00", end: "08:50" },
    { eh: "2. EH", start: "08:55", end: "09:45" },
    { eh: "3. EH", start: "10:00", end: "10:50" },
    { eh: "4. EH", start: "10:55", end: "11:45" },
    { eh: "5. EH", start: "11:50", end: "12:40" },
    { eh: "6. EH", start: "12:45", end: "13:35" },
    { eh: "7. EH", start: "13:40", end: "14:30" },
    { eh: "8. EH", start: "14:35", end: "15:25" },
    { eh: "9. EH", start: "15:30", end: "16:20" },
    { eh: "10. EH", start: "16:25", end: "17:15" },
];
const KIND_LABEL = {
    class: "Klasse",
    teacher: "Lehrkraft",
    room: "Raum",
};
// The default view is class 1 – the same the old page loaded on start.
let currentView = { kind: "class", id: "1", label: "" };
export function getCurrentView() {
    return currentView;
}
function updateHeader() {
    const subtitle = getElement("timetable-subtitle");
    if (!subtitle)
        return;
    subtitle.textContent = currentView.label
        ? `${KIND_LABEL[currentView.kind]} · ${currentView.label}`
        : "Wählen Sie eine Klasse, eine Lehrkraft oder einen Raum.";
}
export function setWorkbenchState(state) {
    const workbench = getElement("body-container");
    if (workbench)
        workbench.dataset.state = state;
}
// ------------------------------------------------------------------- grid
function gridColumn(dayIndex) {
    return dayIndex + 2; // column 1 is the time gutter
}
function gridRow(unitIndex) {
    return unitIndex + 2; // row 1 is the day header
}
function initializeLayout() {
    const grid = getElement("timetable-content");
    if (!grid)
        return;
    grid.style.setProperty("--tt-rows", String(units.length));
    grid.replaceChildren();
    // highlight today's column (Date.getDay(): 0 = Sunday, 1 = Monday …)
    const todayIndex = new Date().getDay() - 1;
    const corner = document.createElement("div");
    corner.className = "tt-corner header-cell";
    corner.style.gridColumn = "1";
    corner.style.gridRow = "1";
    grid.appendChild(corner);
    DAYS.forEach((day, dayIndex) => {
        const cell = document.createElement("div");
        cell.className = "tt-day header-cell";
        cell.dataset.day = day;
        cell.style.gridColumn = String(gridColumn(dayIndex));
        cell.style.gridRow = "1";
        cell.innerHTML = `<span class="tt-day__short">${DAYS_LABELS[dayIndex]}</span><span class="tt-day__long">${DAYS_LONG[dayIndex]}</span>`;
        if (dayIndex === todayIndex) {
            cell.classList.add("is-today");
            cell.title = "Heute";
        }
        grid.appendChild(cell);
    });
    units.forEach((unit, index) => {
        const cell = document.createElement("div");
        cell.className = "tt-time time-cell";
        cell.dataset.row = String(index + 1);
        cell.style.gridColumn = "1";
        cell.style.gridRow = String(gridRow(index));
        cell.innerHTML = `
            <span class="eh-label">${unit.eh}</span>
            <span class="time-start">${unit.start}</span>
            <span class="time-end">${unit.end}</span>
        `;
        grid.appendChild(cell);
        DAYS.forEach((day, dayIndex) => {
            const slot = document.createElement("div");
            slot.className = "tt-slot slot";
            slot.dataset.day = day;
            slot.dataset.row = String(index + 1);
            slot.style.gridColumn = String(gridColumn(dayIndex));
            slot.style.gridRow = String(gridRow(index));
            if (dayIndex === todayIndex)
                slot.classList.add("is-today");
            grid.appendChild(slot);
        });
    });
}
export function clearLayout() {
    const grid = getElement("timetable-content");
    if (!grid)
        return;
    grid.querySelectorAll(".tt-lesson").forEach((lesson) => lesson.remove());
    grid
        .querySelectorAll(".is-break, .is-blocked")
        .forEach((el) => el.classList.remove("is-break", "is-blocked"));
    grid.classList.remove("has-saturday");
    setCanvasEmpty(false);
}
function setCanvasEmpty(isEmpty) {
    const wrap = getElement("timetable-empty-wrap");
    if (wrap)
        wrap.hidden = !isEmpty;
}
function markBreakRow(row) {
    document
        .querySelectorAll(`#timetable-content [data-row="${row}"]`)
        .forEach((cell) => cell.classList.add("is-break"));
}
function markBlockedSlots(hours) {
    hours.forEach((hour) => {
        const slot = document.querySelector(`#timetable-content .tt-slot[data-day="${hour.day}"][data-row="${hour.schoolHour}"]`);
        slot?.classList.add("is-blocked");
    });
}
function createLayout(data) {
    clearLayout();
    const grid = getElement("timetable-content");
    if (!grid)
        return;
    const visible = data.filter((item) => !item.period.lunchBreak);
    setCanvasEmpty(visible.length === 0);
    data.forEach((item) => {
        const day = item.period.schoolDays;
        const dayIndex = DAYS.indexOf(day);
        const rowStart = item.period.schoolHour;
        const duration = item.duration ?? 1;
        if (item.period.lunchBreak) {
            markBreakRow(rowStart);
            return;
        }
        if (dayIndex === -1 || rowStart < 1 || rowStart > units.length)
            return;
        if (day === "SATURDAY")
            grid.classList.add("has-saturday");
        const r = item.classSubject?.subject?.subjectColor?.red ?? 148;
        const g = item.classSubject?.subject?.subjectColor?.green ?? 163;
        const b = item.classSubject?.subject?.subjectColor?.blue ?? 184;
        const subject = item.classSubject?.subject?.subjectSymbol ?? "";
        const subjectName = item.classSubject?.subject?.subjectName ?? "";
        const teacher = item.classSubject?.teacher?.[0]?.nameSymbol ?? "";
        const teacherName = item.classSubject?.teacher?.[0]?.teacherName ?? "";
        const room = item.room?.nameShort ?? "";
        const block = document.createElement("div");
        block.className = "tt-lesson lesson-block";
        block.dataset.day = day;
        block.style.gridColumn = String(gridColumn(dayIndex));
        block.style.gridRow = `${gridRow(rowStart - 1)} / span ${Math.max(1, duration)}`;
        block.style.setProperty("--block-color", `rgb(${r}, ${g}, ${b})`);
        if (duration > 1)
            block.classList.add("is-double");
        const unit = units[rowStart - 1];
        const endUnit = units[Math.min(units.length, rowStart - 1 + duration) - 1];
        block.title = [
            subjectName || subject,
            teacherName,
            room ? `Raum ${room}` : "",
            unit && endUnit ? `${unit.start}–${endUnit.end}` : "",
        ]
            .filter(Boolean)
            .join(" · ");
        block.innerHTML = `
            <span class="subject">${subject}</span>
            <span class="room">${room}</span>
            <span class="teacher">${teacher}</span>
        `;
        grid.appendChild(block);
    });
}
// --------------------------------------------------------------- loading
export function loadTimetable() {
    clearLayout();
    switch (currentView.kind) {
        case "teacher":
            getTimetableByTeacher(currentView.id);
            break;
        case "room":
            getTimetableByRoom(currentView.id);
            break;
        default:
            getTimetableByClass(currentView.id);
    }
}
export function getTimetableByTeacher(teacherId) {
    clearLayout();
    fetch(`${API}/timetable/getByTeacher/${teacherId}`)
        .then((response) => {
        return response.json();
    })
        .then((data) => {
        createLayout(data.timetableDTO.classSubjectInstances);
        markBlockedSlots(data.teacher?.teacherNonWorkingHours ?? []);
    })
        .catch((error) => {
        console.error("Error loading Timetable by teacher:", error);
        toast.error("Stundenplan der Lehrkraft konnte nicht geladen werden.");
    });
}
export function getTimetableByClass(classId) {
    clearLayout();
    fetch(`${API}/timetable/getByClass/${classId}`)
        .then((response) => {
        return response.json();
    })
        .then((data) => {
        createLayout(data.classSubjectInstances);
    })
        .catch((error) => {
        console.error("Error loading Timetable by class:", error);
        toast.error("Stundenplan der Klasse konnte nicht geladen werden.");
    });
}
export function getTimetableByRoom(roomId) {
    clearLayout();
    fetch(`${API}/timetable/getByRoom/${roomId}`)
        .then((response) => {
        return response.json();
    })
        .then((data) => {
        createLayout(data.classSubjectInstances);
    })
        .catch((error) => {
        console.error("Error loading Timetable by room:", error);
        toast.error("Stundenplan des Raums konnte nicht geladen werden.");
    });
}
export async function getRandomizedTimeTable() {
    clearLayout();
    clearCharts();
    try {
        await getFetchResponse("/randomize");
        toast.info("Stundenplan wurde zufällig neu verteilt.");
    }
    finally {
        loadTimetable();
    }
}
// ------------------------------------------------------------------- init
function initializeApp() {
    initNavbar();
    initializeLayout();
    const empty = getElement("timetable-empty");
    if (empty) {
        renderEmptyState(empty, {
            illustration: "timetable",
            title: "Noch keine Stunden geplant",
            hint: "Starten Sie die Optimierung rechts – der Stundenplan füllt sich, sobald ein Ergebnis vorliegt.",
            compact: true,
        });
    }
    updateHeader();
    initViewSwitcher({
        initialKind: currentView.kind,
        initialId: currentView.id,
        onSelect: (kind, entity) => {
            currentView = { kind, id: String(entity.id), label: entity.label };
            updateHeader();
            loadTimetable();
        },
    });
    initExportButton();
    aquireElement("randomizeButton").addEventListener("click", () => {
        void getRandomizedTimeTable();
    });
}
document.addEventListener("DOMContentLoaded", initializeApp);
