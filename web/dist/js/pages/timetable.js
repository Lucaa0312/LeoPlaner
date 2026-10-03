import { initAppShell, setRunningDot } from "../components/appShell.js";
import { createPageHeader } from "../components/pageHeader.js";
import { addEmptyCells, createWeekGrid, placeInGrid } from "../components/weekGrid.js";
import { createSearchSelect } from "../components/searchSelect.js";
import { initExportButton } from "../features/exportButton.js";
import { fetchIsAlgorithmRunning } from "../api/algorithmApi.js";
import { fetchSchoolClasses } from "../api/classSubjectApi.js";
import { fetchRooms } from "../api/roomApi.js";
import { fetchTeachers } from "../api/teacherApi.js";
import { fetchTimetableByClass, fetchTimetableByRoom, fetchTimetableByTeacher, } from "../api/timetableApi.js";
import { aquireElement } from "../utils/elementHelpers.js";
import { readSetting, writeSetting } from "../utils/storage.js";
import { DAYS } from "../utils/periods.js";
const VIEWS = ["Klasse", "Lehrer", "Raum"];
const VIEW_KEY = "leoplaner-timetable-view";
let currentView = "Klasse";
let schoolClasses = [];
let teachers = [];
let rooms = [];
let viewSwitch = null;
let selection = null;
let summary = null;
let gridContainer = null;
let liveBanner = null;
function readSavedView() {
    const saved = readSetting(VIEW_KEY);
    if (saved === "Lehrer" || saved === "Raum") {
        return saved;
    }
    return "Klasse";
}
function buildPage() {
    const page = aquireElement("page");
    const header = createPageHeader({
        kicker: "Planung",
        title: "Stundenplan",
        actions: [
            { id: "excel-export", icon: "ti-download", label: "Excel-Export", primary: false },
        ],
    });
    const exportError = document.createElement("p");
    exportError.className = "text-bad";
    liveBanner = document.createElement("div");
    liveBanner.className = "notice live hidden";
    liveBanner.innerHTML = `<span class="status-dot"></span>`;
    const liveText = document.createElement("span");
    liveText.className = "notice-text";
    liveText.textContent = "Optimierung läuft. Der Stundenplan zeigt den zuletzt geladenen Stand.";
    const liveLink = document.createElement("a");
    liveLink.className = "link-btn";
    liveLink.href = "./optimization.html";
    liveLink.innerHTML = `Verlauf ansehen <i class="ti ti-arrow-right"></i>`;
    liveBanner.append(liveText, liveLink);
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    viewSwitch = document.createElement("div");
    viewSwitch.className = "segmented";
    selection = createSearchSelect(handleSelectionChange);
    selection.element.classList.add("timetable-select");
    summary = document.createElement("span");
    summary.className = "muted timetable-summary";
    toolbar.append(viewSwitch, selection.element, summary);
    const card = document.createElement("div");
    card.className = "card timetable-card";
    gridContainer = document.createElement("div");
    gridContainer.className = "grid-scroller";
    card.appendChild(gridContainer);
    page.replaceChildren(header, exportError, liveBanner, toolbar, card);
    initExportButton(aquireElement("excel-export"), exportError);
}
function handleSelectionChange() {
    void loadTimetable();
}
function renderViewSwitch() {
    if (!viewSwitch) {
        return;
    }
    viewSwitch.replaceChildren();
    for (const view of VIEWS) {
        viewSwitch.appendChild(createViewButton(view));
    }
}
function createViewButton(view) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "segment";
    button.textContent = view;
    if (view === currentView) {
        button.classList.add("active");
    }
    function handleViewClick() {
        currentView = view;
        writeSetting(VIEW_KEY, view);
        renderViewSwitch();
        fillSelectionOptions();
        void loadTimetable();
    }
    button.addEventListener("click", handleViewClick);
    return button;
}
// The first entry from the backend is the default, so after a reset the first existing class is
// shown. The search select itself lists the entries sorted by name.
function fillSelectionOptions() {
    if (!selection) {
        return;
    }
    const options = [];
    if (currentView === "Klasse") {
        for (const schoolClass of schoolClasses) {
            options.push({ value: String(schoolClass.id), label: schoolClass.className });
        }
    }
    else if (currentView === "Lehrer") {
        for (const teacher of teachers) {
            options.push({ value: String(teacher.id), label: `${teacher.nameSymbol} · ${teacher.teacherName}` });
        }
    }
    else {
        for (const room of rooms) {
            options.push({ value: String(room.id), label: `${room.nameShort} · ${room.roomName}` });
        }
    }
    let firstValue = "";
    if (options.length > 0) {
        firstValue = options[0].value;
    }
    selection.setOptions(options, firstValue);
}
async function loadLists() {
    try {
        schoolClasses = await fetchSchoolClasses();
    }
    catch (error) {
        console.error("Fehler beim Laden der Klassen:", error);
        schoolClasses = [];
    }
    try {
        teachers = await fetchTeachers();
    }
    catch (error) {
        console.error("Fehler beim Laden der Lehrer:", error);
        teachers = [];
    }
    try {
        rooms = await fetchRooms();
    }
    catch (error) {
        console.error("Fehler beim Laden der Räume:", error);
        rooms = [];
    }
}
async function loadTimetable() {
    if (!selection) {
        return;
    }
    let lessons = [];
    const selectedValue = selection.getValue();
    const selectedId = Number(selectedValue);
    // No class or no timetable yet: the empty grid is shown.
    if (selectedValue !== "") {
        try {
            if (currentView === "Klasse") {
                lessons = await fetchTimetableByClass(selectedId);
            }
            else if (currentView === "Lehrer") {
                lessons = await fetchTimetableByTeacher(selectedId);
            }
            else {
                lessons = await fetchTimetableByRoom(selectedId);
            }
        }
        catch {
            lessons = [];
        }
    }
    renderGrid(lessons, selectedId);
}
function findTeacher(id) {
    for (const teacher of teachers) {
        if (teacher.id === id) {
            return teacher;
        }
    }
    return null;
}
function findDayIndex(dayKey) {
    for (let i = 0; i < DAYS.length; i++) {
        if (DAYS[i].key === dayKey) {
            return i;
        }
    }
    return -1;
}
function renderGrid(lessons, selectedId) {
    if (!gridContainer || !summary) {
        return;
    }
    const grid = createWeekGrid();
    addEmptyCells(grid);
    if (currentView === "Lehrer") {
        const teacher = findTeacher(selectedId);
        if (teacher) {
            addBlockedSlots(grid, teacher);
        }
    }
    let hours = 0;
    for (const lesson of lessons) {
        const dayIndex = findDayIndex(lesson.period.schoolDays);
        if (dayIndex >= 0 && !lesson.period.lunchBreak) {
            grid.appendChild(createLessonBlock(lesson, dayIndex));
            hours = hours + getDuration(lesson);
        }
    }
    summary.textContent = `${hours} Std.`;
    gridContainer.replaceChildren(grid);
}
function getDuration(lesson) {
    if (lesson.duration && lesson.duration > 0) {
        return lesson.duration;
    }
    return 1;
}
// "kann nicht" periods of the selected teacher, drawn under the lessons.
function addBlockedSlots(grid, teacher) {
    for (const slot of teacher.teacherNonWorkingHours) {
        const dayIndex = findDayIndex(slot.day);
        if (dayIndex >= 0) {
            const blocked = document.createElement("div");
            blocked.className = "blocked-slot";
            blocked.title = "kann nicht";
            placeInGrid(blocked, dayIndex, slot.schoolHour, 1);
            grid.appendChild(blocked);
        }
    }
}
function createLessonBlock(lesson, dayIndex) {
    const block = document.createElement("div");
    block.className = "lesson";
    placeInGrid(block, dayIndex, lesson.period.schoolHour, getDuration(lesson));
    let subjectSymbol = "";
    let subjectName = "";
    let className = "";
    let teacherSymbol = "";
    let roomShort = "–";
    const classSubject = lesson.classSubject;
    if (classSubject) {
        if (classSubject.subject) {
            subjectSymbol = classSubject.subject.subjectSymbol;
            subjectName = classSubject.subject.subjectName;
            if (classSubject.subject.subjectColor) {
                const color = classSubject.subject.subjectColor;
                block.style.setProperty("--lesson-color", `rgb(${color.red}, ${color.green}, ${color.blue})`);
            }
        }
        if (classSubject.className) {
            className = classSubject.className;
        }
        if (classSubject.teacher && classSubject.teacher.length > 0) {
            teacherSymbol = classSubject.teacher[0].nameSymbol;
        }
    }
    if (lesson.room) {
        roomShort = lesson.room.nameShort;
    }
    let secondLine = "";
    if (currentView === "Klasse") {
        secondLine = `${teacherSymbol} · ${roomShort}`;
    }
    else if (currentView === "Lehrer") {
        secondLine = `${className} · ${roomShort}`;
    }
    else {
        secondLine = `${className} · ${teacherSymbol}`;
    }
    const subjectElement = document.createElement("span");
    subjectElement.className = "lesson-subject";
    subjectElement.textContent = subjectSymbol;
    const secondElement = document.createElement("span");
    secondElement.className = "lesson-sub";
    secondElement.textContent = secondLine;
    block.title = `${subjectName} · ${className} · ${teacherSymbol} · Raum ${roomShort}`;
    block.append(subjectElement, secondElement);
    return block;
}
async function showLiveBanner() {
    let running = false;
    try {
        running = await fetchIsAlgorithmRunning();
    }
    catch {
        running = false;
    }
    setRunningDot(running);
    if (liveBanner && running) {
        liveBanner.classList.remove("hidden");
    }
}
async function initializeApp() {
    initAppShell("timetable");
    currentView = readSavedView();
    buildPage();
    renderViewSwitch();
    void showLiveBanner();
    await loadLists();
    fillSelectionOptions();
    await loadTimetable();
}
document.addEventListener("DOMContentLoaded", initializeApp);
