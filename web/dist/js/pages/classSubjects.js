import { toggleEmptyState } from "../components/emptyState.js";
import { getElement } from "../utils/elementHelpers.js";
import initNavbar from "./navbar.js";
import { fetchClassSubjects } from "../api/classSubjectApi.js";
/**
 * Groups the class subjects by their class name.
 */
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
/**
 * Closes the overview page for the given class.
 */
function closeOverview(groupedClassesLength) {
    const headerHoursBox = getElement("header-hours-box");
    const headerSubjectCountBox = getElement("header-subject-count-box");
    if (!headerHoursBox || !headerSubjectCountBox) {
        console.log("headerHoursBox or headerSubjectCountBox is null");
        return;
    }
    headerHoursBox.style.display = "";
    headerSubjectCountBox.style.display = "";
    for (let i = 0; i < groupedClassesLength; i++) {
        const hoursBox = getElement("hours-box-" + i);
        const subjectCountBox = getElement("subject-count-box-" + i);
        if (!hoursBox || !subjectCountBox) {
            console.log("hoursBox or subjectCountBox is null");
            return;
        }
        hoursBox.style.display = "";
        subjectCountBox.style.display = "";
    }
    const overviewBox = getElement("overview-box");
    if (overviewBox) {
        overviewBox.style.display = "none";
    }
    const closeOverviewBox = getElement("close-overview-box");
    closeOverviewBox?.remove();
}
/**
 * Opens the overview page for the given class.
 */
function openOverview(groupedClassesLength) {
    const headerHoursBox = getElement("header-hours-box");
    const headerSubjectCountBox = getElement("header-subject-count-box");
    if (!headerHoursBox || !headerSubjectCountBox) {
        console.log("headerHoursBox or headerSubjectCountBox is null");
        return;
    }
    else {
        headerHoursBox.style.display = "none";
        headerSubjectCountBox.style.display = "none";
        for (let i = 0; i < groupedClassesLength; i++) {
            const hoursBox = getElement("hours-box-" + i);
            const subjectCountBox = getElement("subject-count-box-" + i);
            if (!hoursBox || !subjectCountBox) {
                console.log("hoursBox or subjectCountBox is null");
                return;
            }
            else {
                hoursBox.style.display = "none";
                subjectCountBox.style.display = "none";
            }
        }
    }
    const overviewBox = getElement("overview-box");
    if (overviewBox) {
        overviewBox.style.display = "block";
    }
    const closeOverviewBox = document.createElement("div");
    closeOverviewBox.id = "close-overview-box";
    const xMark = document.createElement("i");
    xMark.className = "fa-solid fa-xmark";
    xMark.onclick = () => {
        closeOverview(groupedClassesLength);
    };
    closeOverviewBox.appendChild(xMark);
    overviewBox?.replaceChildren(closeOverviewBox);
}
/**
 * Creates a class subject card for the given grouped class.
 */
function createClassSubjectCard(groupedClass, count, groupedClassesLength) {
    const row = document.createElement("div");
    row.className = "class-row";
    const left = document.createElement("div");
    left.className = "class-main";
    const classTitle = document.createElement("input");
    classTitle.className = "class-title";
    classTitle.value = groupedClass.className.toUpperCase();
    const subjectsBtn = document.createElement("button");
    subjectsBtn.className = "action-btn";
    subjectsBtn.innerHTML =
        'Fächer <i class="fa-regular fa-square-plus" style="margin-left: 0.3vw; color: #4f46e5; scale: 1.3"></i>';
    subjectsBtn.onclick = () => { };
    const roomBtn = document.createElement("button");
    roomBtn.className = "action-btn";
    roomBtn.innerHTML =
        'Raum zuweisen <i class="fa-regular fa-square-plus" style="margin-left: 0.3vw; color: #4f46e5; scale: 1.3"></i>';
    const overviewBtn = document.createElement("button");
    overviewBtn.className = "action-btn";
    overviewBtn.innerHTML =
        'Überblick <i class="fa-regular fa-eye" style="margin-left: 0.3vw; color: #4f46e5; scale: 1.2"></i>';
    overviewBtn.onclick = () => {
        openOverview(groupedClassesLength);
    };
    left.append(classTitle, subjectsBtn, roomBtn, overviewBtn);
    const hoursBox = document.createElement("div");
    hoursBox.id = `hours-box-${count}`;
    hoursBox.className = "info-box";
    const hours = document.createElement("span");
    hours.textContent = String(groupedClass.weeklyHours);
    hoursBox.appendChild(hours);
    const subjectCountBox = document.createElement("div");
    subjectCountBox.id = `subject-count-box-${count}`;
    subjectCountBox.className = "info-box";
    const subjectCount = document.createElement("span");
    subjectCount.textContent = String(groupedClass.subjectCount);
    subjectCountBox.appendChild(subjectCount);
    row.append(left, hoursBox, subjectCountBox);
    return row;
}
/**
 * Loads and renders the class subjects on the page.
 */
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
        <div id="header-hours-box" class="header-box">Wöchentliche Stunden</div>
        <div id="header-subject-count-box" class="header-box">Fächer Anzahl</div>
    `;
        gridContainer.appendChild(headerRow);
        let groupedClassesLength = groupedClasses.length;
        let count = 0;
        for (const groupedClass of groupedClasses) {
            console.log(groupedClass);
            gridContainer.appendChild(createClassSubjectCard(groupedClass, count, groupedClassesLength));
            count++;
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
