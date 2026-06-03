import { getElement, aquireElement } from "../utils/elementHelpers.js";
import initNavbar from "./navbar.js";
import { clearCharts } from "./graph.js";
import { getFetchResponse } from "../utils/apiHelpers.js";
import { initExportButton } from "../features/exportButton.js";
const DAYS = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
];
const DAYS_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa"];
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
let lessons = [];
const ROW_HEIGHT = 86;
function initializeLayout() {
    let grid = getElement("timetable-content");
    if (!grid)
        return;
    const emptyCorner = document.createElement("div");
    emptyCorner.className = "header-cell";
    grid.appendChild(emptyCorner);
    DAYS_LABELS.forEach((label) => {
        const cell = document.createElement("div");
        cell.className = "header-cell";
        cell.textContent = label;
        grid.appendChild(cell);
    });
    units.forEach((unit, index) => {
        const cell = document.createElement("div");
        cell.className = "time-cell";
        cell.innerHTML = `
            <span class="time-start">${unit.start}</span>
            <span class="eh-label">${unit.eh}</span>
            <span class="time-end">${unit.end}</span>
        `;
        grid.appendChild(cell);
        DAYS.forEach((day) => {
            const slot = document.createElement("div");
            slot.className = "slot";
            slot.dataset.day = day;
            slot.dataset.row = String(index + 1);
            grid.appendChild(slot);
        });
    });
}
export function clearLayout() {
    DAYS.forEach((day) => {
        units.forEach((_, index) => {
            const slot = document.querySelector(`.slot[data-day="${day}"][data-row="${index + 1}"]`);
            if (slot) {
                slot.innerHTML = "";
            }
        });
    });
}
export function loadTimetable() {
    clearLayout();
    fetch("http://localhost:8080/api/timetable/getByClass/1")
        .then((response) => {
        return response.json();
    })
        .then((data) => {
        console.log(data.classSubjectInstances);
        createLayout(data.classSubjectInstances);
    })
        .catch((error) => {
        console.error("Error loading Timetable:", error);
    });
}
function createLayout(data) {
    clearLayout();
    data.forEach((item) => {
        const day = item.period.schoolDays;
        const rowStart = item.period.schoolHour;
        const duration = item.duration ?? 1;
        const slot = document.querySelector(`.slot[data-day="${day}"][data-row="${rowStart}"]`);
        if (!slot)
            return;
        const r = item.classSubject?.subject?.subjectColor?.red ?? 200;
        const g = item.classSubject?.subject?.subjectColor?.green ?? 200;
        const b = item.classSubject?.subject?.subjectColor?.blue ?? 200;
        const block = document.createElement("div");
        block.className = "lesson-block";
        block.style.height = `${duration * ROW_HEIGHT - 10}px`;
        block.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
        block.style.setProperty("--block-color", `rgb(${r}, ${g}, ${b})`);
        const subject = item.classSubject?.subject?.subjectSymbol ?? "";
        const teacher = item.classSubject?.teacher?.[0]?.nameSymbol ?? "";
        const room = item.room?.nameShort ?? "";
        block.innerHTML = `
            <span class="subject">${subject}</span>
            <span class="room">${room}</span>
            <span class="teacher">${teacher}</span>
        `;
        if (item.period.lunchBreak) {
            block.style.display = "none";
        }
        slot.appendChild(block);
    });
}
const randomizeButton = aquireElement("randomizeButton");
randomizeButton.addEventListener("click", getRandomizedTimeTable);
export async function getRandomizedTimeTable() {
    clearLayout();
    clearCharts();
    await getFetchResponse("/randomize");
    loadTimetable();
}
function initializeApp() {
    initNavbar();
    initializeLayout();
    loadTimetable();
    initExportButton();
}
document.addEventListener("DOMContentLoaded", initializeApp);
export function getTimetableByTeacher(teacherId) {
    clearLayout();
    fetch(`http://localhost:8080/api/timetable/getByTeacher/${teacherId}`)
        .then((response) => {
        return response.json();
    })
        .then((data) => {
        console.log("Fetched data:", data);
        createLayout(data.timetableDTO.classSubjectInstances);
    })
        .catch((error) => {
        console.error("Error loading Timetable by teacher:", error);
    });
}
export function getTimetableByClass(classId) {
    fetch(`http://localhost:8080/api/timetable/getByClass/${classId}`)
        .then((response) => {
        return response.json();
    })
        .then((data) => {
        console.log(data);
        createLayout(data.classSubjectInstances);
    })
        .catch((error) => {
        console.error("Error loading Timetable by class:", error);
    });
}
export function getTimetableByRoom(roomId) {
    fetch(`http://localhost:8080/api/timetable/getByRoom/${roomId}`)
        .then((response) => {
        return response.json();
    })
        .then((data) => {
        console.log(data);
        createLayout(data.classSubjectInstances);
    })
        .catch((error) => {
        console.error("Error loading Timetable by room:", error);
    });
}
