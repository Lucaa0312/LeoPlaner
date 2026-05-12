import { toggleEmptyState } from "../components/emptyState.js";
import { getElement } from "../utils/elementHelpers.js";
import initNavbar from "./navbar.js";
import { fetchClassSubjects } from "../api/classSubjectApi.js";
function groupClasses(classSubjects) {
    const groupedMap = new Map();
    for (const item of classSubjects) {
        const existing = groupedMap.get(item.className);
        if (existing) {
            existing.weeklyHours += item.weeklyHours;
            existing.subjects.push(item);
            existing.subjectCount++;
        }
        else {
            groupedMap.set(item.className, {
                className: item.className,
                weeklyHours: item.weeklyHours,
                subjectCount: 1,
                subjects: [item],
            });
        }
    }
    return Array.from(groupedMap.values());
}
function createClassSubjectCard(groupedClass) {
    const row = document.createElement("div");
    row.className = "class-row";
    const left = document.createElement("div");
    left.className = "class-main";
    const classTitle = document.createElement("h3");
    classTitle.className = "class-title";
    classTitle.textContent = groupedClass.className;
    const actions = document.createElement("div");
    actions.className = "class-actions";
    const subjectsBtn = document.createElement("button");
    subjectsBtn.className = "action-btn";
    subjectsBtn.innerHTML = 'Fächer <i class="fa-regular fa-square-plus" style="margin-left: 0.3vw; color: #4f46e5;"></i>';
    const roomBtn = document.createElement("button");
    roomBtn.className = "action-btn";
    roomBtn.innerHTML = 'Raum zuweisen <i class="fa-regular fa-square-plus" style="margin-left: 0.3vw; color: #4f46e5;"></i>';
    const overviewBtn = document.createElement("button");
    overviewBtn.className = "action-btn";
    overviewBtn.innerHTML = 'Überblick <i class="fa-regular fa-eye" style="margin-left: 0.3vw; color: #4f46e5;"></i>';
    actions.append(subjectsBtn, roomBtn, overviewBtn);
    left.append(classTitle, actions);
    const hoursBox = document.createElement("div");
    hoursBox.className = "info-box";
    const hours = document.createElement("span");
    hours.textContent = String(groupedClass.weeklyHours);
    hoursBox.appendChild(hours);
    const subjectCountBox = document.createElement("div");
    subjectCountBox.className = "info-box";
    const subjectCount = document.createElement("span");
    subjectCount.textContent = String(groupedClass.subjectCount);
    subjectCountBox.appendChild(subjectCount);
    row.append(left, hoursBox, subjectCountBox);
    return row;
}
async function loadAndRenderClassSubjects() {
    const noClassSubjectsElement = getElement("no-classSubjects");
    const classSubjectsContainer = getElement("display-classSubjects");
    if (!noClassSubjectsElement || !classSubjectsContainer) {
        return;
    }
    try {
        const classSubjects = await fetchClassSubjects();
        console.log(classSubjects);
        const groupedClasses = groupClasses(classSubjects);
        toggleEmptyState(noClassSubjectsElement, classSubjects.length > 0);
        classSubjectsContainer.replaceChildren();
        if (classSubjects.length === 0) {
            return;
        }
        const gridContainer = document.createElement("div");
        gridContainer.className = "grid-layout";
        const br = document.createElement("br");
        const headerRow = document.createElement("div");
        headerRow.className = "class-header-row";
        headerRow.innerHTML = `
        <div class="header-main">Klasse</div>
        <div class="header-box">Wöchentliche Stunden</div>
        <div class="header-box">Fächer Anzahl</div>
    `;
        gridContainer.appendChild(headerRow);
        for (const groupedClass of groupedClasses) {
            console.log(groupedClass);
            gridContainer.appendChild(createClassSubjectCard(groupedClass));
        }
        classSubjectsContainer.append(gridContainer, br, br, br);
    }
    catch (error) {
        console.error("Fehler beim Laden der Fächer:", error);
    }
}
function initializeApp() {
    initNavbar();
    void loadAndRenderClassSubjects();
}
document.addEventListener("DOMContentLoaded", initializeApp);
