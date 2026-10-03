import { initAppShell } from "../components/appShell.js";
import { createPageHeader } from "../components/pageHeader.js";
import { fetchSubjects } from "../api/subjectApi.js";
import { fetchTeachers } from "../api/teacherApi.js";
import { fetchRooms } from "../api/roomApi.js";
import { fetchClassSubjects, fetchSchoolClasses } from "../api/classSubjectApi.js";
import { fetchIsAlgorithmRunning } from "../api/algorithmApi.js";
import { fetchAdminFeatures } from "../api/adminApi.js";
import { createAdminButtons } from "../features/adminActions.js";
import { aquireElement } from "../utils/elementHelpers.js";
const QUICK_ACTIONS = [
    { icon: "ti-calendar-week", title: "Stundenplan ansehen", text: "Pläne je Klasse, Lehrer oder Raum", path: "./timetable.html" },
    { icon: "ti-chart-line", title: "Optimierung", text: "Algorithmus starten und Verlauf ansehen", path: "./optimization.html" },
    { icon: "ti-upload", title: "Importieren", text: "Excel- oder Schuldaten-Dateien einlesen", path: "./importExport.html" },
    { icon: "ti-download", title: "Exportieren", text: "Stammdaten als Excel herunterladen", path: "./importExport.html" },
];
let tileGrid = null;
let adminActions = null;
let optimizationCard = null;
let summaryCard = null;
function createCardTitle(text) {
    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = text;
    return title;
}
function buildPage() {
    const page = aquireElement("page");
    const header = createPageHeader({
        kicker: "Planung",
        title: "Übersicht",
        actions: [],
    });
    tileGrid = document.createElement("div");
    tileGrid.className = "count-grid";
    const statusGrid = document.createElement("div");
    statusGrid.className = "status-grid";
    optimizationCard = document.createElement("section");
    optimizationCard.className = "card";
    summaryCard = document.createElement("section");
    summaryCard.className = "card";
    statusGrid.append(optimizationCard, summaryCard);
    page.replaceChildren(header, tileGrid, buildQuickActionsCard(), statusGrid);
}
function buildQuickActionsCard() {
    const card = document.createElement("section");
    card.className = "card";
    const grid = document.createElement("div");
    grid.className = "quick-grid";
    for (const action of QUICK_ACTIONS) {
        grid.appendChild(createQuickAction(action));
    }
    adminActions = document.createElement("div");
    adminActions.className = "page-actions hidden";
    card.append(createCardTitle("Schnellaktionen"), grid, adminActions);
    return card;
}
function createQuickAction(action) {
    const link = document.createElement("a");
    link.className = "quick-action";
    link.href = action.path;
    const top = document.createElement("span");
    top.className = "quick-action-top";
    top.innerHTML = `<i class="ti ${action.icon}"></i><i class="ti ti-arrow-right quick-action-arrow"></i>`;
    const title = document.createElement("span");
    title.className = "strong";
    title.textContent = action.title;
    const text = document.createElement("span");
    text.className = "muted";
    text.textContent = action.text;
    link.append(top, title, text);
    return link;
}
async function loadList(load, name) {
    try {
        return await load();
    }
    catch (error) {
        console.error(`Fehler beim Laden der ${name}:`, error);
        return [];
    }
}
async function loadAndRender() {
    const teachers = await loadList(fetchTeachers, "Lehrer");
    const schoolClasses = await loadList(fetchSchoolClasses, "Klassen");
    const rooms = await loadList(fetchRooms, "Räume");
    const subjects = await loadList(fetchSubjects, "Fächer");
    const classSubjects = await loadList(fetchClassSubjects, "Klassen-Fächer");
    renderTiles([
        { icon: "ti-users", label: "Lehrer", count: teachers.length, path: "./teacher.html" },
        { icon: "ti-school", label: "Klassen", count: schoolClasses.length, path: "./classes.html" },
        { icon: "ti-door", label: "Räume", count: rooms.length, path: "./rooms.html" },
        { icon: "ti-book-2", label: "Fächer", count: subjects.length, path: "./subjects.html" },
        { icon: "ti-link", label: "Klassen-Fächer", count: classSubjects.length, path: "./classSubjects.html" },
    ]);
    renderSummary(teachers, classSubjects);
}
function renderTiles(tiles) {
    if (!tileGrid) {
        return;
    }
    tileGrid.replaceChildren();
    for (const tile of tiles) {
        const link = document.createElement("a");
        link.className = "count-tile";
        link.href = tile.path;
        const label = document.createElement("span");
        label.className = "count-label";
        label.innerHTML = `<i class="ti ${tile.icon}"></i>`;
        label.append(tile.label);
        const count = document.createElement("span");
        count.className = "count-value";
        count.textContent = String(tile.count);
        link.append(label, count);
        tileGrid.appendChild(link);
    }
}
function createInfoRow(icon, text) {
    const row = document.createElement("div");
    row.className = "info-row";
    row.innerHTML = `<i class="ti ${icon} muted"></i>`;
    const label = document.createElement("span");
    label.textContent = text;
    row.appendChild(label);
    return row;
}
function renderSummary(teachers, classSubjects) {
    if (!summaryCard) {
        return;
    }
    let teachersWithAvailability = 0;
    for (const teacher of teachers) {
        if (teacher.teacherNonWorkingHours.length > 0 || teacher.teacherNonPreferredHours.length > 0) {
            teachersWithAvailability = teachersWithAvailability + 1;
        }
    }
    let weeklyHours = 0;
    for (const classSubject of classSubjects) {
        weeklyHours = weeklyHours + classSubject.weeklyHours;
    }
    summaryCard.replaceChildren(createCardTitle("Stammdaten"), createInfoRow("ti-calendar-off", `Verfügbarkeit für ${teachersWithAvailability} von ${teachers.length} Lehrern`), createInfoRow("ti-clock-hour-4", `Wochenstunden gesamt: ${weeklyHours}`));
}
async function loadAndRenderOptimizationStatus() {
    if (!optimizationCard) {
        return;
    }
    let running = false;
    try {
        running = await fetchIsAlgorithmRunning();
    }
    catch (error) {
        console.error("Fehler beim Laden des Optimierungsstatus:", error);
    }
    const header = document.createElement("div");
    header.className = "card-header";
    const badge = document.createElement("span");
    badge.className = "badge";
    if (running) {
        badge.innerHTML = `<span class="status-dot"></span>`;
        badge.append("Läuft");
    }
    else {
        badge.textContent = "Bereit";
    }
    header.append(createCardTitle("Optimierung"), badge);
    const link = document.createElement("a");
    link.className = "link-btn";
    link.href = "./optimization.html";
    link.innerHTML = `Zur Optimierung <i class="ti ti-arrow-right"></i>`;
    optimizationCard.replaceChildren(header, link);
}
async function loadAndRenderAdminActions() {
    if (!adminActions) {
        return;
    }
    const buttons = createAdminButtons(await fetchAdminFeatures(), handleAdminDataChanged);
    if (buttons.length === 0) {
        adminActions.classList.add("hidden");
        return;
    }
    adminActions.replaceChildren(...buttons);
    adminActions.classList.remove("hidden");
}
// Demo data or a reset change every number on this page.
function handleAdminDataChanged() {
    void loadAndRender();
}
function initializeApp() {
    initAppShell("overview");
    buildPage();
    void loadAndRender();
    void loadAndRenderOptimizationStatus();
    void loadAndRenderAdminActions();
}
document.addEventListener("DOMContentLoaded", initializeApp);
