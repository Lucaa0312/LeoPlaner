
// Nav items configuration
const navItems = [
    { id: "nav-item-dashboard", icon: "fa-regular fa-chart-bar", text: "Startseite", path: "./dashboard.html" },
    { id: "nav-item-teacher", icon: "fa-regular fa-address-card", text: "Lehrer", path: "./teacher.html" },
    { id: "nav-item-subjects", icon: "fa-regular fa-newspaper", text: "Fächer", path: "./subjects.html" },
    { id: "nav-item-rooms", icon: "fa-regular fa-compass", text: "Räume", path: "./rooms.html" },
    { id: "nav-item-timetable", icon: "fa-regular fa-calendar-days", text: "Stundenplan", path: "./timetable.html" },
];

// Initializes the navigation bar
export default function initNavbar() {
    const navBar = document.getElementById("nav-bar");
    if (!navBar) return;

    // 1. Create logo section
    const logoContainer = document.createElement("div");
    logoContainer.id = "logo-container";
    logoContainer.innerHTML = `<h2 id="logo-text">Logo</h2>`;
    
    // 2. Create nav item container
    const navItemContainer = document.createElement("div");
    navItemContainer.id = "nav-item-container";

    const currentUrl = window.location.pathname;

    navItems.forEach((item) => {
        const navItem = document.createElement("div");
        navItem.className = "nav-item";
        navItem.id = item.id;

        // Active State Check
        const searchString = item.path.replace("./", ""); 
        if (currentUrl.includes(searchString)) {
            navItem.style.backgroundColor = "#EEF2FF";
            navItem.style.color = "var(--leo-primary-color1)";
            navItem.style.borderLeftColor = "var(--leo-primary-color1)";
            navItem.style.borderLeftWidth = "0.25vw";
            navItem.style.borderLeftStyle = "solid";
        }

        navItem.onclick = () => window.location.href = item.path;

        navItem.innerHTML = `
            <p class="nav-text">${item.text}</p>
        `;
        
        navItemContainer.appendChild(navItem);
    });

    // 3,5 You need help section
    const helpSection = document.createElement("div");
    helpSection.id = "help-section";
    helpSection.innerHTML = `
        <p class="nav-text">Brauchen Sie Hilfe?</p>
    `;

    // 3. Create account info section
    const accountInfo = document.createElement("div");
    accountInfo.id = "account-info-box";
    accountInfo.innerHTML = `
        <div id="account-avatar-container">
            <img id="account-avatar" src="../assets/img/defaultAvatar.png" alt="Avatar">
        </div>
        <div id="account-text-container">
            <p id="account-username">Admin</p>
        </div>
    `;

    
    navBar.replaceChildren(logoContainer, navItemContainer, helpSection, accountInfo);
}
