import { initAppShell } from "../components/appShell.js";
import { createPageHeader } from "../components/pageHeader.js";
import { createWeekGrid, placeInGrid } from "../components/weekGrid.js";
import { showToast } from "../components/toast.js";
import { fetchTeachers, updateTeacher } from "../api/teacherApi.js";
import { aquireElement } from "../utils/elementHelpers.js";
import { DAYS, PERIODS } from "../utils/periods.js";
let teachers = [];
let selectedTeacherId = null;
let teacherList = null;
let gridCard = null;
function containsSlot(slots, day, schoolHour) {
    for (const slot of slots) {
        if (slot.day === day && slot.schoolHour === schoolHour) {
            return true;
        }
    }
    return false;
}
function withoutSlot(slots, day, schoolHour) {
    const result = [];
    for (const slot of slots) {
        if (slot.day !== day || slot.schoolHour !== schoolHour) {
            result.push(slot);
        }
    }
    return result;
}
function getSlotState(teacher, day, schoolHour) {
    if (containsSlot(teacher.teacherNonWorkingHours, day, schoolHour)) {
        return "nonWorking";
    }
    else if (containsSlot(teacher.teacherNonPreferredHours, day, schoolHour)) {
        return "nonPreferred";
    }
    return "free";
}
function formatSummary(teacher) {
    const nonWorking = teacher.teacherNonWorkingHours.length;
    const nonPreferred = teacher.teacherNonPreferredHours.length;
    if (nonWorking === 0 && nonPreferred === 0) {
        return "voll verfügbar";
    }
    const parts = [];
    if (nonWorking > 0) {
        parts.push(`${nonWorking} kann nicht`);
    }
    if (nonPreferred > 0) {
        parts.push(`${nonPreferred} möchte nicht`);
    }
    return parts.join(" · ");
}
function findSelectedTeacher() {
    for (const teacher of teachers) {
        if (teacher.id === selectedTeacherId) {
            return teacher;
        }
    }
    return null;
}
function buildPage() {
    const page = aquireElement("page");
    const header = createPageHeader({
        kicker: "Stammdaten · nicht Teil des Excel-Imports",
        title: "Verfügbarkeit",
        actions: [],
    });
    const layout = document.createElement("div");
    layout.className = "availability-layout";
    teacherList = document.createElement("section");
    teacherList.className = "card teacher-list";
    gridCard = document.createElement("section");
    gridCard.className = "card availability-card";
    layout.append(teacherList, gridCard);
    page.replaceChildren(header, layout);
}
async function loadTeachers() {
    try {
        teachers = await fetchTeachers();
    }
    catch (error) {
        console.error("Fehler beim Laden der Lehrer:", error);
        teachers = [];
    }
    if (selectedTeacherId === null && teachers.length > 0) {
        selectedTeacherId = teachers[0].id;
    }
    renderTeacherList();
    renderGrid();
}
function renderTeacherList() {
    if (!teacherList) {
        return;
    }
    teacherList.replaceChildren();
    if (teachers.length === 0) {
        const empty = document.createElement("span");
        empty.className = "muted";
        empty.textContent = "Noch keine Lehrer angelegt.";
        teacherList.appendChild(empty);
        return;
    }
    for (const teacher of teachers) {
        teacherList.appendChild(createTeacherButton(teacher));
    }
}
function createTeacherButton(teacher) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "teacher-item";
    if (teacher.id === selectedTeacherId) {
        button.classList.add("active");
    }
    const nameRow = document.createElement("span");
    nameRow.className = "teacher-item-name";
    const name = document.createElement("span");
    name.textContent = teacher.teacherName;
    const symbol = document.createElement("span");
    symbol.className = "mono muted";
    symbol.textContent = teacher.nameSymbol;
    nameRow.append(name, symbol);
    const summary = document.createElement("span");
    summary.className = "teacher-item-summary";
    summary.textContent = formatSummary(teacher);
    button.append(nameRow, summary);
    function handleTeacherClick() {
        selectedTeacherId = teacher.id;
        renderTeacherList();
        renderGrid();
    }
    button.addEventListener("click", handleTeacherClick);
    return button;
}
function renderGrid() {
    if (!gridCard) {
        return;
    }
    const teacher = findSelectedTeacher();
    if (!teacher) {
        gridCard.replaceChildren();
        return;
    }
    const header = document.createElement("div");
    header.className = "card-header";
    const heading = document.createElement("div");
    heading.className = "notice-text";
    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = `${teacher.teacherName} (${teacher.nameSymbol})`;
    const hint = document.createElement("span");
    hint.className = "muted";
    hint.textContent = "Klicke auf eine Stunde, um zwischen verfügbar, möchte nicht und kann nicht zu wechseln.";
    heading.append(title, hint);
    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "btn";
    resetButton.textContent = "Alle zurücksetzen";
    resetButton.addEventListener("click", handleResetClick);
    header.append(heading, resetButton);
    const legend = document.createElement("div");
    legend.className = "availability-legend";
    legend.append(createLegendItem("free", "verfügbar"), createLegendItem("nonPreferred", "möchte nicht (weich)"), createLegendItem("nonWorking", "kann nicht (hart)"));
    const scroller = document.createElement("div");
    scroller.className = "grid-scroller";
    const grid = createWeekGrid();
    for (let d = 0; d < DAYS.length; d++) {
        for (const period of PERIODS) {
            grid.appendChild(createSlotButton(teacher, d, period.schoolHour));
        }
    }
    scroller.appendChild(grid);
    gridCard.replaceChildren(header, legend, scroller);
}
function createLegendItem(state, label) {
    const item = document.createElement("span");
    item.className = "legend-item";
    const swatch = document.createElement("span");
    swatch.className = `legend-swatch slot-${state}`;
    const text = document.createElement("span");
    text.textContent = label;
    item.append(swatch, text);
    return item;
}
function createSlotButton(teacher, dayIndex, schoolHour) {
    const day = DAYS[dayIndex].key;
    const state = getSlotState(teacher, day, schoolHour);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `availability-slot slot-${state}`;
    placeInGrid(button, dayIndex, schoolHour, 1);
    if (state === "nonPreferred") {
        button.textContent = "möchte nicht";
    }
    else if (state === "nonWorking") {
        button.textContent = "kann nicht";
    }
    function handleSlotClick() {
        void cycleSlot(teacher, day, schoolHour);
    }
    button.addEventListener("click", handleSlotClick);
    return button;
}
async function cycleSlot(teacher, day, schoolHour) {
    const state = getSlotState(teacher, day, schoolHour);
    const nonWorking = withoutSlot(teacher.teacherNonWorkingHours, day, schoolHour);
    const nonPreferred = withoutSlot(teacher.teacherNonPreferredHours, day, schoolHour);
    if (state === "free") {
        nonPreferred.push({ day, schoolHour });
    }
    else if (state === "nonPreferred") {
        nonWorking.push({ day, schoolHour });
    }
    await saveAvailability(teacher, nonWorking, nonPreferred);
}
function handleResetClick() {
    const teacher = findSelectedTeacher();
    if (teacher) {
        void saveAvailability(teacher, [], []);
    }
}
// The teacher update overwrites every field, so name, subjects and wishes are sent unchanged.
async function saveAvailability(teacher, nonWorking, nonPreferred) {
    const teachingSubject = [];
    for (const subject of teacher.teachingSubject) {
        teachingSubject.push({ id: subject.id });
    }
    const teacherData = {
        teacherName: teacher.teacherName,
        nameSymbol: teacher.nameSymbol,
        teachingSubject: teachingSubject,
        teacher_non_working_hours: nonWorking,
        teacher_non_preferred_hours: nonPreferred,
        wishText: teacher.wishText,
    };
    try {
        await updateTeacher(teacher.id, teacherData);
    }
    catch (error) {
        console.error("Fehler beim Speichern der Verfügbarkeit:", error);
        showToast("Speichern fehlgeschlagen.");
        return;
    }
    teacher.teacherNonWorkingHours = nonWorking;
    teacher.teacherNonPreferredHours = nonPreferred;
    renderTeacherList();
    renderGrid();
}
function initializeApp() {
    initAppShell("availability");
    buildPage();
    void loadTeachers();
}
document.addEventListener("DOMContentLoaded", initializeApp);
