import { renderEmptyState, toggleEmptyState, } from "../components/emptyState.js";
import { clearSkeleton, renderSkeleton } from "../components/skeleton.js";
import { formatName, getElement, smartCase } from "../utils/elementHelpers.js";
import initNavbar from "./navbar.js";
import { fetchClassSubjects } from "../api/classSubjectApi.js";
import { fetchSchoolClasses } from "../api/classSubjectApi.js";
import { applySearch, bindSearch } from "../features/searchElement.js";
const SEARCH = {
    inputId: "input-field",
    rowSelector: ".class-row",
    values: [".class-name", ".class-room"],
    noResultsEl: null,
};
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
let openOverviewClass = null;
/**
 * Closes the overview panel.
 */
function closeOverview() {
    const workspace = getElement("class-workspace");
    const overviewBox = getElement("overview-box");
    workspace?.classList.remove("workspace--panel-open");
    if (overviewBox) {
        overviewBox.hidden = true;
        overviewBox.replaceChildren();
    }
    document
        .querySelectorAll(".class-row.is-selected")
        .forEach((row) => row.classList.remove("is-selected"));
    openOverviewClass = null;
}
function subjectColor(cs) {
    const c = cs.subject?.subjectColor;
    if (!c)
        return "var(--color-border-strong)";
    return `rgb(${c.red}, ${c.green}, ${c.blue})`;
}
/**
 * Opens the overview panel for the given class.
 */
function openOverview(groupedClass) {
    const workspace = getElement("class-workspace");
    const overviewBox = getElement("overview-box");
    if (!workspace || !overviewBox)
        return;
    // clicking the open class again closes the panel
    if (openOverviewClass === groupedClass.className) {
        closeOverview();
        return;
    }
    openOverviewClass = groupedClass.className;
    workspace.classList.add("workspace--panel-open");
    overviewBox.hidden = false;
    document.querySelectorAll(".class-row").forEach((row) => {
        row.classList.toggle("is-selected", row.dataset.className === groupedClass.className);
    });
    // --- title bar ---------------------------------------------------------
    const titleBar = document.createElement("div");
    titleBar.className = "side-panel__header";
    titleBar.id = "overview-title-bar";
    const heading = document.createElement("div");
    heading.className = "side-panel__heading";
    const eyebrow = document.createElement("span");
    eyebrow.className = "side-panel__eyebrow";
    eyebrow.textContent = "Überblick";
    const title = document.createElement("h2");
    title.className = "side-panel__title";
    title.id = "overview-title";
    title.textContent = groupedClass.className.toUpperCase();
    heading.append(eyebrow, title);
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "icon-btn";
    closeButton.id = "close-overview-box";
    closeButton.setAttribute("aria-label", "Überblick schließen");
    closeButton.innerHTML = `<i class="ti ti-x" aria-hidden="true"></i>`;
    closeButton.addEventListener("click", closeOverview);
    titleBar.append(heading, closeButton);
    // --- summary -----------------------------------------------------------
    const summary = document.createElement("div");
    summary.className = "side-panel__summary";
    summary.innerHTML = `
    <div class="summary-tile">
      <span class="summary-tile__value">${groupedClass.subjectCount}</span>
      <span class="summary-tile__label">Fächer</span>
    </div>
    <div class="summary-tile">
      <span class="summary-tile__value">${groupedClass.weeklyHours}</span>
      <span class="summary-tile__label">Wochenstunden</span>
    </div>`;
    // --- search ------------------------------------------------------------
    const searchBox = document.createElement("label");
    searchBox.className = "search-field side-panel__search";
    searchBox.id = "overview-search-box";
    const searchIcon = document.createElement("i");
    searchIcon.className = "ti ti-search";
    searchIcon.id = "overview-search-icon";
    searchIcon.setAttribute("aria-hidden", "true");
    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.className = "input";
    searchInput.placeholder = "Fach suchen";
    searchInput.id = "overview-search-input";
    searchInput.autocomplete = "off";
    searchInput.setAttribute("aria-label", "Fach in dieser Klasse suchen");
    searchBox.append(searchIcon, searchInput);
    // --- scrollable content ------------------------------------------------
    const content = document.createElement("div");
    content.className = "side-panel__body";
    content.id = "overview-content";
    // subjects
    const subjectsHeader = document.createElement("p");
    subjectsHeader.className = "form-section__title overview-section-header";
    subjectsHeader.textContent = "Fächer";
    content.appendChild(subjectsHeader);
    const list = document.createElement("ul");
    list.className = "overview-list";
    const sorted = [...groupedClass.subjects].sort((a, b) => b.weeklyHours - a.weeklyHours);
    for (const cs of sorted) {
        const item = document.createElement("li");
        item.className = "overview-item";
        item.style.setProperty("--item-color", subjectColor(cs));
        const teachers = (cs.teacher ?? [])
            .map((t) => t.nameSymbol || t.teacherName)
            .filter(Boolean)
            .join(", ");
        const flags = [];
        if (cs.requiresDoublePeriod)
            flags.push("Doppelstunde");
        else if (cs.isBetterDoublePeriod)
            flags.push("Doppelstunde bevorzugt");
        item.innerHTML = `
      <span class="overview-item__color" aria-hidden="true"></span>
      <span class="overview-item__text">
        <span class="overview-item__title">${formatName(cs.subject?.subjectName ?? "(unbekannt)")}</span>
        <span class="overview-item__sub">${[teachers || "Kein Lehrer zugewiesen", ...flags].join(" · ")}</span>
      </span>
      <span class="overview-item__hours" title="Wochenstunden">${cs.weeklyHours}<small>h</small></span>`;
        list.appendChild(item);
    }
    content.appendChild(list);
    // room
    const room = groupedClass.schoolClass?.classRoom;
    const roomHeader = document.createElement("p");
    roomHeader.className = "form-section__title overview-section-header";
    roomHeader.textContent = "Klassenraum";
    content.appendChild(roomHeader);
    const roomItem = document.createElement("div");
    roomItem.className = "overview-room";
    if (room) {
        roomItem.innerHTML = `
      <span class="entity-card__icon" aria-hidden="true"><i class="ti ti-door"></i></span>
      <span class="overview-item__text">
        <span class="overview-item__title">${smartCase(room.roomName)}</span>
        <span class="overview-item__sub">${room.nameShort}${room.roomNumber ? ` · Nr. ${room.roomNumber}` : ""}</span>
      </span>`;
    }
    else {
        roomItem.innerHTML = `<span class="badge badge--outline"><i class="ti ti-door" aria-hidden="true"></i>Kein Klassenraum zugewiesen</span>`;
    }
    content.appendChild(roomItem);
    // live search within the panel
    searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        list.querySelectorAll(".overview-item").forEach((item) => {
            const text = item.textContent?.toLowerCase() ?? "";
            item.hidden = !text.includes(q);
        });
    });
    overviewBox.replaceChildren(titleBar, summary, searchBox, content);
    closeButton.focus();
}
/**
 * Creates a table row for the given grouped class.
 */
function createClassSubjectRow(groupedClass) {
    const row = document.createElement("tr");
    row.className = "class-row";
    row.dataset.className = groupedClass.className;
    // class name + room
    const nameCell = document.createElement("td");
    const primary = document.createElement("div");
    primary.className = "cell-primary class-main";
    const badge = document.createElement("span");
    badge.className = "class-badge";
    badge.setAttribute("aria-hidden", "true");
    badge.textContent = groupedClass.className.slice(0, 2).toUpperCase();
    const text = document.createElement("div");
    text.className = "cell-primary__text";
    const classTitle = document.createElement("span");
    classTitle.className = "cell-primary__title class-name class-title";
    classTitle.textContent = groupedClass.className.toUpperCase();
    const room = groupedClass.schoolClass?.classRoom;
    const sub = document.createElement("span");
    sub.className = "cell-primary__sub class-room";
    sub.textContent = room
        ? `Raum ${room.nameShort}`
        : "Kein Klassenraum";
    text.append(classTitle, sub);
    primary.append(badge, text);
    nameCell.appendChild(primary);
    // subject count
    const subjectCountCell = document.createElement("td");
    subjectCountCell.className = "is-num info-box";
    const subjectCount = document.createElement("span");
    subjectCount.className = "badge badge--primary";
    subjectCount.textContent = `${groupedClass.subjectCount} ${groupedClass.subjectCount === 1 ? "Fach" : "Fächer"}`;
    subjectCountCell.appendChild(subjectCount);
    // weekly hours
    const hoursCell = document.createElement("td");
    hoursCell.className = "is-num info-box";
    const hours = document.createElement("span");
    hours.className = "class-hours";
    hours.innerHTML = `${groupedClass.weeklyHours}<small>h</small>`;
    hoursCell.appendChild(hours);
    // actions
    const actionsCell = document.createElement("td");
    actionsCell.className = "is-actions";
    const actions = document.createElement("div");
    actions.className = "class-actions";
    const subjectsBtn = document.createElement("button");
    subjectsBtn.type = "button";
    subjectsBtn.className = "btn btn--sm btn--ghost action-btn";
    subjectsBtn.disabled = true;
    subjectsBtn.title = "Fächer zuweisen – in Arbeit";
    subjectsBtn.innerHTML = `<i class="ti ti-square-plus" aria-hidden="true"></i><span>Fächer</span>`;
    const roomBtn = document.createElement("button");
    roomBtn.type = "button";
    roomBtn.className = "btn btn--sm btn--ghost action-btn";
    roomBtn.disabled = true;
    roomBtn.title = "Raum zuweisen – in Arbeit";
    roomBtn.innerHTML = `<i class="ti ti-door" aria-hidden="true"></i><span>Raum</span>`;
    const overviewBtn = document.createElement("button");
    overviewBtn.type = "button";
    overviewBtn.className = "btn btn--sm btn--soft action-btn";
    overviewBtn.innerHTML = `<i class="ti ti-eye" aria-hidden="true"></i><span>Überblick</span>`;
    overviewBtn.addEventListener("click", () => openOverview(groupedClass));
    actions.append(subjectsBtn, roomBtn, overviewBtn);
    actionsCell.appendChild(actions);
    row.append(nameCell, subjectCountCell, hoursCell, actionsCell);
    return row;
}
let firstLoad = true;
/**
 * Loads and renders the class subjects on the page.
 */
async function loadAndRenderClassSubjects() {
    const noClassSubjectsElement = getElement("no-classSubjects");
    const classSubjectsContainer = getElement("display-classSubjects");
    if (!noClassSubjectsElement || !classSubjectsContainer) {
        return;
    }
    if (firstLoad)
        renderSkeleton(classSubjectsContainer, 6, "row");
    try {
        const [classSubjects, schoolClasses] = await Promise.all([
            fetchClassSubjects(),
            fetchSchoolClasses(),
        ]);
        firstLoad = false;
        const groupedClasses = groupClasses(classSubjects).sort((a, b) => a.className.localeCompare(b.className, "de", { numeric: true }));
        // attach room / school class to every grouped class
        const classMap = new Map();
        for (const sc of schoolClasses) {
            classMap.set(sc.className.toLowerCase(), sc);
        }
        for (const gc of groupedClasses) {
            gc.schoolClass = classMap.get(gc.className.toLowerCase());
        }
        clearSkeleton(classSubjectsContainer);
        classSubjectsContainer.replaceChildren();
        toggleEmptyState(noClassSubjectsElement, classSubjects.length > 0);
        if (SEARCH.noResultsEl)
            SEARCH.noResultsEl.hidden = true;
        closeOverview();
        const workspace = getElement("class-workspace");
        if (workspace)
            workspace.hidden = classSubjects.length === 0;
        if (classSubjects.length === 0) {
            return;
        }
        const wrap = document.createElement("div");
        wrap.className = "table-wrap rise-in";
        const table = document.createElement("table");
        table.className = "data-table class-table";
        table.innerHTML = `
      <thead>
        <tr class="class-header-row">
          <th scope="col" class="header-main">Klasse</th>
          <th scope="col" class="is-num header-box" id="header-subject-count-box">Fächer</th>
          <th scope="col" class="is-num header-box" id="header-hours-box">Wochenstunden</th>
          <th scope="col" class="is-actions"><span class="visually-hidden">Aktionen</span></th>
        </tr>
      </thead>`;
        const tbody = document.createElement("tbody");
        for (const groupedClass of groupedClasses) {
            tbody.appendChild(createClassSubjectRow(groupedClass));
        }
        table.appendChild(tbody);
        wrap.appendChild(table);
        classSubjectsContainer.appendChild(wrap);
        applySearch(SEARCH);
    }
    catch (error) {
        firstLoad = false;
        clearSkeleton(classSubjectsContainer);
        console.error("Fehler beim Laden der Klassen:", error);
    }
}
function initializeApp() {
    initNavbar();
    const noClasses = getElement("no-classSubjects");
    if (noClasses) {
        renderEmptyState(noClasses, {
            illustration: "classes",
            title: "Noch keine Klassen",
            hint: "Klassen und ihre Fächerzuteilung werden über den Excel-Import auf dem Dashboard angelegt.",
            ctaLabel: "Zum Dashboard",
            ctaIcon: "ti ti-upload",
            onCta: () => {
                window.location.href = "./dashboard.html";
            },
        });
    }
    const noResults = getElement("no-results");
    if (noResults) {
        renderEmptyState(noResults, {
            illustration: "search",
            title: "Keine Treffer",
            hint: "Keine Klasse passt zu Ihrer Suche.",
            compact: true,
        });
        noResults.hidden = true;
        SEARCH.noResultsEl = noResults;
    }
    bindSearch(SEARCH);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && openOverviewClass)
            closeOverview();
    });
    void loadAndRenderClassSubjects();
}
document.addEventListener("DOMContentLoaded", initializeApp);
