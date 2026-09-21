import { cycleTheme, getThemeChoice, themeIcon, themeLabel, THEME_CHANGE_EVENT, } from "../components/theme.js";
const navSections = [
    {
        label: null,
        items: [
            {
                id: "nav-item-dashboard",
                icon: "ti ti-layout-dashboard",
                text: "Startseite",
                path: "./dashboard.html",
            },
        ],
    },
    {
        label: "Verwaltung",
        items: [
            {
                id: "nav-item-teacher",
                icon: "ti ti-users",
                text: "Lehrer",
                path: "./teacher.html",
            },
            {
                id: "nav-item-subjects",
                icon: "ti ti-book-2",
                text: "Fächer",
                path: "./subjects.html",
            },
            {
                id: "nav-item-rooms",
                icon: "ti ti-door",
                text: "Räume",
                path: "./rooms.html",
            },
            {
                id: "nav-item-classes",
                icon: "ti ti-school",
                text: "Klassen",
                path: "./classSubjects.html",
            },
        ],
    },
    {
        label: "Planung",
        items: [
            {
                id: "nav-item-timetable",
                icon: "ti ti-calendar-week",
                text: "Stundenplan",
                path: "./timetable.html",
            },
        ],
    },
];
const SIDEBAR_KEY = "leo.sidebar";
const HELP_URL = "https://github.com/Lucaa0312/LeoPlaner#readme";
// A compact brand mark: white "L" with an amber dot – matches the wordmark.
const BRAND_MARK_SVG = `
  <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <rect x="8" y="6" width="5.5" height="20" rx="2.75" fill="#fff"/>
    <rect x="8" y="20.5" width="16" height="5.5" rx="2.75" fill="#fff"/>
    <circle cx="22.5" cy="10.5" r="3.25" fill="var(--color-sidebar-accent)"/>
  </svg>`;
function isActive(path) {
    const current = window.location.pathname;
    const target = path.replace("./", "");
    return current.endsWith("/" + target) || current.endsWith(target);
}
function isCollapsed() {
    return document.documentElement.dataset.sidebar === "collapsed";
}
function setCollapsed(collapsed) {
    const root = document.documentElement;
    if (collapsed)
        root.dataset.sidebar = "collapsed";
    else
        delete root.dataset.sidebar;
    try {
        if (collapsed)
            localStorage.setItem(SIDEBAR_KEY, "collapsed");
        else
            localStorage.removeItem(SIDEBAR_KEY);
    }
    catch {
        /* ignore storage failures */
    }
}
function setDrawerOpen(open) {
    const root = document.documentElement;
    if (open)
        root.dataset.drawer = "open";
    else
        delete root.dataset.drawer;
}
function createNavLink(item) {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.className = "sidebar__item";
    link.id = item.id;
    link.href = item.path;
    link.title = item.text;
    if (isActive(item.path)) {
        link.setAttribute("aria-current", "page");
    }
    const icon = document.createElement("i");
    icon.className = item.icon;
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "sidebar__label";
    label.textContent = item.text;
    link.append(icon, label);
    li.appendChild(link);
    return li;
}
function createBrand() {
    const brand = document.createElement("div");
    brand.className = "sidebar__brand";
    const logo = document.createElement("a");
    logo.className = "sidebar__logo";
    logo.href = "./dashboard.html";
    logo.setAttribute("aria-label", "LeoPlaner – zur Startseite");
    const mark = document.createElement("span");
    mark.className = "sidebar__mark";
    mark.innerHTML = BRAND_MARK_SVG;
    const wordmark = document.createElement("img");
    wordmark.className = "sidebar__wordmark";
    wordmark.src = "../assets/img/LeoPlanerWordmark.svg";
    wordmark.alt = "LeoPlaner";
    logo.append(mark, wordmark);
    brand.appendChild(logo);
    return brand;
}
function createToggle() {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "sidebar__toggle";
    toggle.id = "sidebar-toggle";
    toggle.innerHTML = `<i class="ti ti-chevron-left" aria-hidden="true"></i>`;
    const sync = () => {
        const collapsed = isCollapsed();
        toggle.setAttribute("aria-expanded", String(!collapsed));
        toggle.setAttribute("aria-label", collapsed ? "Seitenleiste ausklappen" : "Seitenleiste einklappen");
    };
    toggle.addEventListener("click", () => {
        setCollapsed(!isCollapsed());
        sync();
    });
    sync();
    return toggle;
}
function createNav() {
    const nav = document.createElement("div");
    nav.className = "sidebar__nav";
    navSections.forEach((section) => {
        const group = document.createElement("div");
        group.className = "sidebar__section";
        if (section.label) {
            const label = document.createElement("div");
            label.className = "sidebar__section-label";
            label.textContent = section.label;
            group.appendChild(label);
        }
        const list = document.createElement("ul");
        section.items.forEach((item) => list.appendChild(createNavLink(item)));
        group.appendChild(list);
        nav.appendChild(group);
    });
    return nav;
}
function createThemeToggle() {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "theme-toggle";
    button.className = "sidebar__item";
    const icon = document.createElement("i");
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "sidebar__label";
    const sync = () => {
        const choice = getThemeChoice();
        icon.className = themeIcon(choice);
        label.textContent = `Design: ${themeLabel(choice)}`;
        button.title = `Design: ${themeLabel(choice)} – klicken zum Wechseln`;
        button.setAttribute("aria-label", button.title);
    };
    button.addEventListener("click", () => {
        cycleTheme();
        sync();
    });
    document.addEventListener(THEME_CHANGE_EVENT, sync);
    button.append(icon, label);
    sync();
    return button;
}
function createFooter() {
    const footer = document.createElement("div");
    footer.className = "sidebar__footer";
    const help = document.createElement("a");
    help.className = "sidebar__item";
    help.id = "nav-item-help";
    help.href = HELP_URL;
    help.target = "_blank";
    help.rel = "noopener";
    help.title = "Hilfe";
    help.innerHTML = `
    <i class="ti ti-help-circle" aria-hidden="true"></i>
    <span class="sidebar__label">Hilfe</span>`;
    const account = document.createElement("div");
    account.className = "sidebar__account";
    account.id = "account-info-box";
    account.innerHTML = `
    <span class="avatar" aria-hidden="true">A</span>
    <span class="sidebar__account-text">
      <span class="sidebar__account-name" id="account-username">Admin</span>
      <span class="sidebar__account-role">Administrator</span>
    </span>`;
    footer.append(help, createThemeToggle(), account);
    return footer;
}
let globalHandlersBound = false;
function bindGlobalHandlers() {
    if (globalHandlersBound)
        return;
    globalHandlersBound = true;
    // Mobile drawer: any element with [data-drawer-toggle] opens it, the
    // backdrop and Escape close it.
    document.addEventListener("click", (event) => {
        const target = event.target;
        if (target?.closest("[data-drawer-toggle]")) {
            setDrawerOpen(document.documentElement.dataset.drawer !== "open");
        }
        else if (target?.closest(".drawer-backdrop")) {
            setDrawerOpen(false);
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape")
            setDrawerOpen(false);
    });
    // Close the drawer again when the viewport grows into desktop layout.
    window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => {
        if (e.matches)
            setDrawerOpen(false);
    });
}
// Initializes the navigation bar
export default function initNavbar() {
    const navBar = document.getElementById("nav-bar");
    if (!navBar)
        return;
    navBar.classList.add("sidebar");
    navBar.setAttribute("aria-label", "Hauptnavigation");
    navBar.replaceChildren(createBrand(), createToggle(), createNav(), createFooter());
    if (!document.querySelector(".drawer-backdrop")) {
        const backdrop = document.createElement("div");
        backdrop.className = "drawer-backdrop";
        backdrop.setAttribute("aria-hidden", "true");
        document.body.appendChild(backdrop);
    }
    bindGlobalHandlers();
}
