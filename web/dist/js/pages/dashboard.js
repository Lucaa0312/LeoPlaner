import initNavbar from "./navbar.js";
import { initImportButton } from "../features/importButton.js";
import { initExportButton } from "../features/exportButton.js";
import { fetchSchoolClasses } from "../api/classSubjectApi.js";
const API_BASE_URL = "http://localhost:8080/api";
// Fetches a single count endpoint, returning 0 on failure.
async function fetchCount(path) {
    try {
        const res = await fetch(`${API_BASE_URL}${path}`);
        if (!res.ok)
            return 0;
        return Number((await res.json()) ?? 0);
    }
    catch {
        return 0;
    }
}
// Loads the four dashboard counts. Klassen has no count endpoint, so it is
// derived from the length of the class list.
async function loadStats() {
    const [teachers, classes, rooms, subjects] = await Promise.all([
        fetchCount("/teachers/getTeacherCount"),
        fetchSchoolClasses()
            .then((list) => list.length)
            .catch(() => 0),
        fetchCount("/rooms/getRoomCount"),
        fetchCount("/subjects/getSubjectCount"),
    ]);
    return [
        { id: "stat-teachers", icon: "fa-solid fa-users", label: "Lehrer", value: teachers },
        { id: "stat-classes", icon: "fa-solid fa-school", label: "Klassen", value: classes },
        { id: "stat-rooms", icon: "fa-solid fa-building", label: "Räume", value: rooms },
        { id: "stat-subjects", icon: "fa-solid fa-book-open", label: "Fächer", value: subjects },
    ];
}
// Builds an icon container <div><i class="..."></i></div>.
function iconBox(iconClass, boxClass) {
    const box = document.createElement("div");
    box.className = boxClass;
    const i = document.createElement("i");
    i.className = iconClass;
    i.setAttribute("aria-hidden", "true");
    box.appendChild(i);
    return box;
}
// Renders the four statistics cards.
function renderStats(stats) {
    const grid = document.getElementById("stats-grid");
    if (!grid)
        return;
    grid.replaceChildren();
    stats.forEach((stat) => {
        const card = document.createElement("div");
        card.className = "stat-card";
        card.id = stat.id;
        card.appendChild(iconBox(stat.icon, "stat-icon"));
        const value = document.createElement("span");
        value.className = "stat-value";
        value.textContent = String(stat.value);
        const label = document.createElement("span");
        label.className = "stat-label";
        label.textContent = stat.label;
        card.appendChild(value);
        card.appendChild(label);
        grid.appendChild(card);
    });
}
// Builds the shared quick-action card shell (icon box, arrow, title, text).
function quickActionCard(icon, title, description) {
    const card = document.createElement("div");
    card.className = "quick-action";
    const top = document.createElement("div");
    top.className = "quick-action-top";
    top.appendChild(iconBox(icon, "action-icon"));
    const arrow = document.createElement("i");
    arrow.className = "fa-solid fa-arrow-right action-arrow";
    arrow.setAttribute("aria-hidden", "true");
    top.appendChild(arrow);
    const h3 = document.createElement("h3");
    h3.className = "action-title";
    h3.textContent = title;
    const p = document.createElement("p");
    p.className = "action-description";
    p.textContent = description;
    card.appendChild(top);
    card.appendChild(h3);
    card.appendChild(p);
    return card;
}
// Renders the three quick actions: import, export, view timetable.
function renderQuickActions() {
    const grid = document.getElementById("quick-actions");
    if (!grid)
        return;
    grid.replaceChildren();
    // Import (reuses importButton.ts which binds #excel-upload)
    const importCard = quickActionCard("fa-solid fa-upload", "Excel importieren", "Importieren Sie Ihre Schuldaten aus einer Excel-Datei");
    const input = document.createElement("input");
    input.type = "file";
    input.id = "excel-upload";
    input.accept = ".xlsx,.xls";
    input.hidden = true;
    const importName = document.createElement("p");
    importName.id = "import-file-name";
    importName.className = "action-status";
    const importError = document.createElement("p");
    importError.id = "import-error";
    importError.className = "action-error";
    importCard.append(input, importName, importError);
    importCard.addEventListener("click", () => input.click());
    // Export (reuses exportButton.ts which binds #excel-export)
    const exportCard = quickActionCard("fa-solid fa-download", "Daten exportieren", "Exportieren Sie Ihre Daten und Stundenpläne als Excel");
    const exportButton = document.createElement("button");
    exportButton.id = "excel-export";
    exportButton.hidden = true;
    const exportError = document.createElement("p");
    exportError.id = "export-error";
    exportError.className = "action-error";
    exportCard.append(exportButton, exportError);
    exportCard.addEventListener("click", () => exportButton.click());
    // View timetable (navigation)
    const timetableCard = quickActionCard("fa-solid fa-table", "Stundenplan anzeigen", "Sehen Sie den aktuellen Stundenplan ein");
    timetableCard.addEventListener("click", () => {
        window.location.href = "timetable.html";
    });
    grid.append(importCard, exportCard, timetableCard);
    initImportButton();
    initExportButton();
}
const dataLinks = [
    { href: "teacher.html", icon: "fa-solid fa-users", title: "Lehrer" },
    { href: "classSubjects.html", icon: "fa-solid fa-school", title: "Klassen" },
    { href: "rooms.html", icon: "fa-solid fa-building", title: "Räume" },
    { href: "subjects.html", icon: "fa-solid fa-book-open", title: "Fächer" },
];
// Renders the four data-management navigation links.
function renderDataManagement() {
    const grid = document.getElementById("data-management");
    if (!grid)
        return;
    grid.replaceChildren();
    dataLinks.forEach((link) => {
        const a = document.createElement("a");
        a.className = "data-link";
        a.href = link.href;
        const i = document.createElement("i");
        i.className = `${link.icon} data-link-icon`;
        i.setAttribute("aria-hidden", "true");
        const title = document.createElement("span");
        title.className = "data-link-title";
        title.textContent = link.title;
        const sub = document.createElement("span");
        sub.className = "data-link-sub";
        sub.textContent = "Verwalten";
        a.append(i, title, sub);
        grid.appendChild(a);
    });
}
// Initialize the dashboard application.
export async function initializeApp() {
    initNavbar();
    const stats = await loadStats();
    renderStats(stats);
    renderQuickActions();
    renderDataManagement();
}
document.addEventListener("DOMContentLoaded", initializeApp);
