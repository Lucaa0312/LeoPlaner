import { toggleEmptyState } from "../components/emptyState.js";
import { getElement } from "../utils/elementHelpers.js";
import initNavbar from "./navbar.js";
import { fetchClassSubjects } from "../api/classSubjectApi.js";
import type { ClassSubject, GroupedClass } from "../types/classSubject.js";
import type { SchoolClass } from "../types/schoolClass.js";
import { fetchSchoolClasses } from "../api/classSubjectApi.js";

/**
 * Groups the class subjects by their class name.
 */
function groupClasses(classSubjects: ClassSubject[]): GroupedClass[] {
  const groupedMap = new Map<string, GroupedClass>();

  for (const item of classSubjects) {
    const existing = groupedMap.get(item.className);

    if (existing) {
      existing.weeklyHours += item.weeklyHours;

      existing.subjects.push(item);

      existing.subjectCount++;
    } else {
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
function closeOverview(groupedClassesLength: number) {
  const headerHoursBox = getElement<HTMLDivElement>("header-hours-box");
  const headerSubjectCountBox = getElement<HTMLDivElement>(
    "header-subject-count-box",
  );
  if (!headerHoursBox || !headerSubjectCountBox) {
    console.log("headerHoursBox or headerSubjectCountBox is null");
    return;
  }
  headerHoursBox.style.display = "";
  headerSubjectCountBox.style.display = "";

  for (let i = 0; i < groupedClassesLength; i++) {
    const hoursBox = getElement<HTMLDivElement>("hours-box-" + i);
    const subjectCountBox = getElement<HTMLDivElement>(
      "subject-count-box-" + i,
    );
    if (!hoursBox || !subjectCountBox) {
      console.log("hoursBox or subjectCountBox is null");
      return;
    }
    hoursBox.style.display = "";
    subjectCountBox.style.display = "";
  }

  const overviewBox = getElement<HTMLDivElement>("overview-box");
  if (overviewBox) {
    overviewBox.style.display = "none";
  }
  const closeOverviewBox = getElement<HTMLDivElement>("close-overview-box");
  closeOverviewBox?.remove();
}

/**
 * Opens the overview page for the given class.
 */
/*function openOverview(groupedClassesLength: number) {
  const headerHoursBox = getElement<HTMLDivElement>("header-hours-box");
  const headerSubjectCountBox = getElement<HTMLDivElement>(
    "header-subject-count-box",
  );

  if (!headerHoursBox || !headerSubjectCountBox) {
    console.log("headerHoursBox or headerSubjectCountBox is null");
    return;
  } else {
    headerHoursBox.style.display = "none";
    headerSubjectCountBox.style.display = "none";
    for (let i = 0; i < groupedClassesLength; i++) {
      const hoursBox = getElement<HTMLDivElement>("hours-box-" + i);
      const subjectCountBox = getElement<HTMLDivElement>(
        "subject-count-box-" + i,
      );
      if (!hoursBox || !subjectCountBox) {
        console.log("hoursBox or subjectCountBox is null");
        return;
      } else {
        hoursBox.style.display = "none";
        subjectCountBox.style.display = "none";
      }
    }
  }

  const overviewBox = getElement<HTMLDivElement>("overview-box");
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
*/
function openOverview(
  groupedClass: GroupedClass,
  groupedClassesLength: number,
) {
  const headerHoursBox = getElement<HTMLDivElement>("header-hours-box");
  const headerSubjectCountBox = getElement<HTMLDivElement>(
    "header-subject-count-box",
  );

  if (!headerHoursBox || !headerSubjectCountBox) {
    console.log("headerHoursBox or headerSubjectCountBox is null");
    return;
  } else {
    headerHoursBox.style.display = "none";
    headerSubjectCountBox.style.display = "none";
    for (let i = 0; i < groupedClassesLength; i++) {
      const hoursBox = getElement<HTMLDivElement>("hours-box-" + i);
      const subjectCountBox = getElement<HTMLDivElement>(
        "subject-count-box-" + i,
      );
      if (!hoursBox || !subjectCountBox) {
        console.log("hoursBox or subjectCountBox is null");
        return;
      } else {
        hoursBox.style.display = "none";
        subjectCountBox.style.display = "none";
      }
    }
  }

  const overviewBox = getElement<HTMLDivElement>("overview-box");
  if (overviewBox) {
    overviewBox.style.display = "block";
  }

  // --- Titelleiste mit Klassennamen + X ----------------------------------
  const titleBar = document.createElement("div");
  titleBar.id = "overview-title-bar";

  const title = document.createElement("span");
  title.id = "overview-title";
  title.textContent = `${groupedClass.className.toUpperCase()} - Überblick`;

  const closeOverviewBox = document.createElement("div");
  closeOverviewBox.id = "close-overview-box";

  const xMark = document.createElement("i");
  xMark.className = "fa-solid fa-xmark";

  xMark.onclick = () => {
    closeOverview(groupedClassesLength);
  };

  closeOverviewBox.appendChild(xMark);
  titleBar.append(title, closeOverviewBox);

  // --- Suchfeld ----------------------------------------------------------
  const searchBox = document.createElement("div");
  searchBox.id = "overview-search-box";

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Suchen";
  searchInput.id = "overview-search-input";

  const searchIcon = document.createElement("i");
  searchIcon.className = "fa-solid fa-magnifying-glass";
  searchIcon.id = "overview-search-icon";

  searchBox.append(searchInput, searchIcon);

  // --- Scrollbarer Inhalt (Fächer) ---------------------------------------
  const content = document.createElement("div");
  content.id = "overview-content";

  // Fächer
  const subjectsHeader = document.createElement("div");
  subjectsHeader.className = "overview-section-header";
  subjectsHeader.textContent = "Fächer";
  content.appendChild(subjectsHeader);

  for (const cs of groupedClass.subjects) {
    const item = document.createElement("div");
    item.className = "overview-item";

    const label = document.createElement("span");
    label.textContent = cs.subject?.subjectName ?? "(unbekannt)";

    const remove = document.createElement("i");
    remove.className = "fa-solid fa-xmark overview-item-remove";
    remove.onclick = () => {
      console.log("remove subject", cs);
      // TODO: API-Call zum Entfernen des Fachs
    };

    item.append(label, remove);
    content.appendChild(item);
  }

  // Raum
  const room = groupedClass.schoolClass?.classRoom;
  if (room) {
    const roomHeader = document.createElement("div");
    roomHeader.className = "overview-section-header";
    roomHeader.textContent = "Raum";
    content.appendChild(roomHeader);

    const item = document.createElement("div");
    item.className = "overview-item";
    const label = document.createElement("span");
    label.textContent = room.roomName;
    const remove = document.createElement("i");
    remove.className = "fa-solid fa-xmark overview-item-remove";
    remove.onclick = () => {
      console.log("remove room", room);
      // TODO: API-Call zum Entfernen/Ändern des Raums
    };
    item.append(label, remove);
    content.appendChild(item);
  }
  // Live-Suche
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    const items = content.querySelectorAll<HTMLElement>(".overview-item");
    for (const item of items) {
      const text = item.querySelector("span")?.textContent ?? "";
      item.style.display = text.toLowerCase().includes(q) ? "" : "none";
    }
  });

  overviewBox?.replaceChildren(titleBar, searchBox, content);
}
/**
 * Creates a class subject card for the given grouped class.
 */
function createClassSubjectCard(
  groupedClass: GroupedClass,
  count: number,
  groupedClassesLength: number,
): HTMLElement {
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

  subjectsBtn.onclick = () => {};

  const roomBtn = document.createElement("button");
  roomBtn.className = "action-btn";
  roomBtn.innerHTML =
    'Raum zuweisen <i class="fa-regular fa-square-plus" style="margin-left: 0.3vw; color: #4f46e5; scale: 1.3"></i>';

  const overviewBtn = document.createElement("button");
  overviewBtn.className = "action-btn";
  overviewBtn.innerHTML =
    'Überblick <i class="fa-regular fa-eye" style="margin-left: 0.3vw; color: #4f46e5; scale: 1.2"></i>';

  overviewBtn.onclick = () => {
    openOverview(groupedClass, groupedClassesLength);
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
async function loadAndRenderClassSubjects(): Promise<void> {
  const noClassSubjectsElement = getElement<HTMLElement>("no-classSubjects");
  const classSubjectsContainer = getElement<HTMLElement>(
    "display-classSubjects",
  );

  if (!noClassSubjectsElement || !classSubjectsContainer) {
    return;
  }
  try {
    const [classSubjects, schoolClasses] = await Promise.all([
      fetchClassSubjects(),
      fetchSchoolClasses(),
    ]);

    console.log(classSubjects);
    const groupedClasses = groupClasses(classSubjects);

    // Raum/SchoolClass an jede gruppierte Klasse anhängen
    const classMap = new Map<string, SchoolClass>();
    for (const sc of schoolClasses) {
      classMap.set(sc.className.toLowerCase(), sc);
    }
    for (const gc of groupedClasses) {
      gc.schoolClass = classMap.get(gc.className.toLowerCase());
    }

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
      gridContainer.appendChild(
        createClassSubjectCard(groupedClass, count, groupedClassesLength),
      );
      count++;
    }

    classSubjectsContainer.append(gridContainer, br, br, br);
  } catch (error) {
    console.error("Fehler beim Laden der Fächer:", error);
  }
}

function initializeApp() {
  initNavbar();
  void loadAndRenderClassSubjects();
}

document.addEventListener("DOMContentLoaded", initializeApp);
