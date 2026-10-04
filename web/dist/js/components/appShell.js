import { fetchIsAlgorithmRunning } from "../api/algorithmApi.js";
import { getElement } from "../utils/elementHelpers.js";
import { readSetting, writeSetting } from "../utils/storage.js";
const navGroups = [
    {
        label: "Übersicht",
        items: [
            { id: "overview", icon: "ti-layout-dashboard", label: "Übersicht", path: "./overview.html" },
        ],
    },
    {
        label: "Stammdaten",
        items: [
            { id: "teachers", icon: "ti-users", label: "Lehrer", path: "./teacher.html" },
            { id: "classes", icon: "ti-school", label: "Klassen", path: "./classes.html" },
            { id: "rooms", icon: "ti-door", label: "Räume", path: "./rooms.html" },
            { id: "subjects", icon: "ti-book-2", label: "Fächer", path: "./subjects.html" },
            { id: "classSubjects", icon: "ti-link", label: "Klassen-Fächer", path: "./classSubjects.html" },
            { id: "availability", icon: "ti-calendar-off", label: "Verfügbarkeit", path: "./availability.html" },
        ],
    },
    {
        label: "Planung",
        items: [
            { id: "optimization", icon: "ti-chart-line", label: "Optimierung", path: "./optimization.html" },
            { id: "timetable", icon: "ti-calendar-week", label: "Stundenplan", path: "./timetable.html" },
        ],
    },
    {
        label: "Daten",
        items: [
            { id: "importExport", icon: "ti-file-spreadsheet", label: "Import / Export", path: "./importExport.html" },
        ],
    },
];
const COLLAPSED_KEY = "leoplaner-sidebar-collapsed";
const THEME_KEY = "leoplaner-theme";
let sidebar = null;
let activePageId = "";
// Draws the sidebar into <aside id="sidebar">. activeId is the id of the current page's entry.
export function initAppShell(activeId) {
    sidebar = getElement("sidebar");
    if (!sidebar) {
        return;
    }
    activePageId = activeId;
    if (readSetting(COLLAPSED_KEY) === "true") {
        sidebar.classList.add("collapsed");
    }
    renderSidebar();
    void showRunningDot();
}
function isCollapsed() {
    if (!sidebar) {
        return false;
    }
    return sidebar.classList.contains("collapsed");
}
function isDarkTheme() {
    return document.documentElement.dataset.theme === "dark";
}
function renderSidebar() {
    if (!sidebar) {
        return;
    }
    const collapsed = isCollapsed();
    const logo = document.createElement("a");
    logo.className = "sidebar-logo";
    logo.href = "./overview.html";
    logo.appendChild(createLogoMark());
    if (!collapsed) {
        const logoText = document.createElement("span");
        logoText.className = "logo-text";
        logoText.textContent = "LeoPlaner";
        logo.appendChild(logoText);
    }
    const nav = document.createElement("nav");
    nav.className = "sidebar-nav";
    for (let i = 0; i < navGroups.length; i++) {
        const group = navGroups[i];
        nav.appendChild(createNavGroup(group, i, collapsed));
    }
    const footer = document.createElement("div");
    footer.className = "sidebar-footer";
    let themeIcon = "ti-moon";
    let themeLabel = "Dunkles Design";
    if (isDarkTheme()) {
        themeIcon = "ti-sun";
        themeLabel = "Helles Design";
    }
    let collapseIcon = "ti-layout-sidebar-left-collapse";
    let collapseLabel = "Einklappen";
    if (collapsed) {
        collapseIcon = "ti-layout-sidebar-left-expand";
        collapseLabel = "Ausklappen";
    }
    const themeButton = createFooterButton(themeIcon, themeLabel, collapsed);
    themeButton.addEventListener("click", handleThemeClick);
    const collapseButton = createFooterButton(collapseIcon, collapseLabel, collapsed);
    collapseButton.addEventListener("click", handleCollapseClick);
    footer.append(themeButton, collapseButton);
    sidebar.replaceChildren(logo, nav, footer);
}
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
// The "L" drawn as clock hands inside a dial ring, its corner a little below and left of the centre (design.md decision 13).
function createLogoMark() {
    const logoMark = document.createElement("span");
    logoMark.className = "logo-mark";
    const svg = document.createElementNS(SVG_NAMESPACE, "svg");
    svg.setAttribute("viewBox", "0 0 30 30");
    svg.setAttribute("aria-hidden", "true");
    const ring = document.createElementNS(SVG_NAMESPACE, "circle");
    ring.setAttribute("cx", "15");
    ring.setAttribute("cy", "15");
    ring.setAttribute("r", "10.5");
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", "currentColor");
    ring.setAttribute("stroke-width", "2");
    svg.appendChild(ring);
    const hands = document.createElementNS(SVG_NAMESPACE, "path");
    hands.setAttribute("d", "M14 8 V17 H20.5");
    hands.setAttribute("fill", "none");
    hands.setAttribute("stroke", "currentColor");
    hands.setAttribute("stroke-width", "2.5");
    hands.setAttribute("stroke-linecap", "round");
    hands.setAttribute("stroke-linejoin", "round");
    svg.appendChild(hands);
    logoMark.appendChild(svg);
    return logoMark;
}
function createNavGroup(group, index, collapsed) {
    const groupElement = document.createElement("div");
    groupElement.className = "nav-group";
    if (!collapsed) {
        const label = document.createElement("span");
        label.className = "nav-group-label";
        label.textContent = group.label;
        groupElement.appendChild(label);
    }
    else if (index > 0) {
        const rule = document.createElement("div");
        rule.className = "nav-group-rule";
        groupElement.appendChild(rule);
    }
    for (const item of group.items) {
        groupElement.appendChild(createNavItem(item, collapsed));
    }
    return groupElement;
}
function createNavItem(item, collapsed) {
    const link = document.createElement("a");
    link.className = "nav-item";
    link.id = `nav-${item.id}`;
    link.href = item.path;
    link.title = item.label;
    if (item.id === activePageId) {
        link.classList.add("active");
    }
    const icon = document.createElement("i");
    icon.className = `ti ${item.icon}`;
    link.appendChild(icon);
    if (!collapsed) {
        const label = document.createElement("span");
        label.textContent = item.label;
        link.appendChild(label);
    }
    return link;
}
function createFooterButton(icon, label, collapsed) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-item";
    button.title = label;
    const iconElement = document.createElement("i");
    iconElement.className = `ti ${icon}`;
    button.appendChild(iconElement);
    if (!collapsed) {
        const text = document.createElement("span");
        text.textContent = label;
        button.appendChild(text);
    }
    return button;
}
function handleThemeClick() {
    let theme = "dark";
    if (isDarkTheme()) {
        theme = "light";
    }
    document.documentElement.dataset.theme = theme;
    writeSetting(THEME_KEY, theme);
    renderSidebar();
    void showRunningDot();
    document.dispatchEvent(new CustomEvent("themechange"));
}
function handleCollapseClick() {
    if (!sidebar) {
        return;
    }
    sidebar.classList.toggle("collapsed");
    writeSetting(COLLAPSED_KEY, String(isCollapsed()));
    renderSidebar();
    void showRunningDot();
}
// Shows or hides the small dot on "Optimierung". Pages that know the state better call this directly.
export function setRunningDot(running) {
    const optimizationItem = getElement("nav-optimization");
    if (!optimizationItem) {
        return;
    }
    const existingDot = optimizationItem.querySelector(".nav-dot");
    if (existingDot) {
        existingDot.remove();
    }
    if (running) {
        const dot = document.createElement("span");
        dot.className = "nav-dot";
        optimizationItem.appendChild(dot);
    }
}
async function showRunningDot() {
    try {
        const running = await fetchIsAlgorithmRunning();
        setRunningDot(running);
    }
    catch {
        setRunningDot(false);
    }
}
