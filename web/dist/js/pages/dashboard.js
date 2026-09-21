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
        {
            id: "stat-teachers",
            icon: "ti ti-users",
            label: "Lehrer",
            value: teachers,
            color: "var(--color-primary)",
        },
        {
            id: "stat-classes",
            icon: "ti ti-school",
            label: "Klassen",
            value: classes,
            color: "var(--color-accent)",
        },
        {
            id: "stat-rooms",
            icon: "ti ti-door",
            label: "Räume",
            value: rooms,
            color: "var(--color-success)",
        },
        {
            id: "stat-subjects",
            icon: "ti ti-book-2",
            label: "Fächer",
            value: subjects,
            color: "var(--color-primary-hover)",
        },
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
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Counts a number up from 0 over ~600 ms (skipped under reduced motion).
function animateCount(el, target) {
    if (prefersReducedMotion || target === 0) {
        el.textContent = String(target);
        return;
    }
    const duration = 600;
    const start = performance.now();
    const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = String(Math.round(target * eased));
        if (progress < 1)
            requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
// Renders the four statistics cards.
function renderStats(stats) {
    const grid = document.getElementById("stats-grid");
    if (!grid)
        return;
    grid.replaceChildren();
    stats.forEach((stat) => {
        const card = document.createElement("div");
        card.className = "stat-card card";
        card.id = stat.id;
        card.style.setProperty("--card-color", stat.color);
        card.appendChild(iconBox(stat.icon, "stat-icon"));
        const value = document.createElement("span");
        value.className = "stat-value";
        value.textContent = "0";
        const label = document.createElement("span");
        label.className = "stat-label";
        label.textContent = stat.label;
        card.appendChild(value);
        card.appendChild(label);
        grid.appendChild(card);
        animateCount(value, stat.value);
    });
}
// Builds the shared quick-action card shell (icon box, arrow, title, text).
function quickActionCard(icon, title, description, onActivate) {
    const card = document.createElement("div");
    card.className = "quick-action card card--interactive";
    card.setAttribute("role", "button");
    card.tabIndex = 0;
    const top = document.createElement("div");
    top.className = "quick-action-top";
    top.appendChild(iconBox(icon, "action-icon"));
    const arrow = document.createElement("i");
    arrow.className = "ti ti-arrow-right action-arrow";
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
    card.addEventListener("click", onActivate);
    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onActivate();
        }
    });
    return card;
}
// Renders the three quick actions: import, export, view timetable.
function renderQuickActions() {
    const grid = document.getElementById("quick-actions");
    if (!grid)
        return;
    grid.replaceChildren();
    // Import (reuses importButton.ts which binds #excel-upload)
    const input = document.createElement("input");
    input.type = "file";
    input.id = "excel-upload";
    input.accept = ".xlsx,.xls";
    input.hidden = true;
    const importCard = quickActionCard("ti ti-upload", "Excel importieren", "Importieren Sie Ihre Schuldaten aus einer Excel-Datei", () => input.click());
    const importName = document.createElement("p");
    importName.id = "import-file-name";
    importName.className = "action-status";
    const importError = document.createElement("p");
    importError.id = "import-error";
    importError.className = "action-error";
    importCard.append(input, importName, importError);
    // Export (reuses exportButton.ts which binds #excel-export)
    const exportButton = document.createElement("button");
    exportButton.id = "excel-export";
    exportButton.type = "button";
    exportButton.hidden = true;
    const exportCard = quickActionCard("ti ti-download", "Daten exportieren", "Exportieren Sie Ihre Daten und Stundenpläne als Excel", () => exportButton.click());
    const exportError = document.createElement("p");
    exportError.id = "export-error";
    exportError.className = "action-error";
    exportCard.append(exportButton, exportError);
    // View timetable (navigation)
    const timetableCard = quickActionCard("ti ti-calendar-week", "Stundenplan anzeigen", "Sehen Sie den aktuellen Stundenplan ein", () => {
        window.location.href = "timetable.html";
    });
    grid.append(importCard, exportCard, timetableCard);
    initImportButton();
    initExportButton();
}
const dataLinks = [
    { href: "teacher.html", icon: "ti ti-users", title: "Lehrer" },
    { href: "classSubjects.html", icon: "ti ti-school", title: "Klassen" },
    { href: "rooms.html", icon: "ti ti-door", title: "Räume" },
    { href: "subjects.html", icon: "ti ti-book-2", title: "Fächer" },
];
// Renders the four data-management navigation links.
function renderDataManagement() {
    const grid = document.getElementById("data-management");
    if (!grid)
        return;
    grid.replaceChildren();
    dataLinks.forEach((link) => {
        const a = document.createElement("a");
        a.className = "data-link card card--interactive";
        a.href = link.href;
        const i = document.createElement("i");
        i.className = `${link.icon} data-link-icon`;
        i.setAttribute("aria-hidden", "true");
        const title = document.createElement("span");
        title.className = "data-link-title";
        title.textContent = link.title;
        const sub = document.createElement("span");
        sub.className = "data-link-sub";
        sub.innerHTML = `Verwalten <i class="ti ti-arrow-right" aria-hidden="true"></i>`;
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
