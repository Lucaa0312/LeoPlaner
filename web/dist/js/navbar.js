
// Nav items configuration
const navItems = [
    { id: "nav-item-dashboard", icon: "fa-regular fa-chart-bar", text: "Startseite", path: "./dashboard.html" },
    { id: "nav-item-teacher", icon: "fa-regular fa-address-card", text: "Lehrer", path: "./teacher.html" },
    { id: "nav-item-subjects", icon: "fa-regular fa-newspaper", text: "Fächer", path: "./subjects.html" },
    { id: "nav-item-rooms", icon: "fa-regular fa-compass", text: "Räume", path: "./rooms.html" },
    { id: "nav-item-timetable", icon: "fa-regular fa-calendar-days", text: "Stundenplan", path: "./timetable.html" },
];

// Initializes the navigation bar
function initNavbar() {
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
            navItem.style.backgroundColor = "var(--leo-background-color)";
            navItem.style.color = "var(--leo-primary-color1)";
            navItem.style.borderRadius = "5vw";
        }

        navItem.onclick = () => window.location.href = item.path;

        navItem.innerHTML = `
            <i class="${item.icon}"></i>
            <p class="nav-text">${item.text}</p>
        `;
        
        navItemContainer.appendChild(navItem);
    });

    // 3. Create account info section
    const accountInfo = document.createElement("div");
    accountInfo.id = "account-info-box";
    accountInfo.innerHTML = `
        <img id="account-avatar" src="../assets/img/defaultAvatar.png" alt="Avatar">
        <div id="account-text-container">
            <p id="account-username">Admin</p>
        </div>
    `;

    
    navBar.replaceChildren(logoContainer, navItemContainer, accountInfo);
}
