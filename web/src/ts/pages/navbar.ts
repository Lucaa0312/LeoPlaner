
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
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path opacity="0.6" d="M8.5 0C6.81886 0 5.17547 0.498516 3.77766 1.43251C2.37984 2.3665 1.29037 3.69402 0.647028 5.24719C0.00368292 6.80036 -0.164645 8.50943 0.163329 10.1583C0.491303 11.8071 1.30085 13.3217 2.4896 14.5104C3.67834 15.6992 5.1929 16.5087 6.84173 16.8367C8.49057 17.1646 10.1996 16.9963 11.7528 16.353C13.306 15.7096 14.6335 14.6202 15.5675 13.2223C16.5015 11.8245 17 10.1811 17 8.5C16.9976 6.24639 16.1013 4.08576 14.5078 2.49222C12.9142 0.898677 10.7536 0.00237985 8.5 0ZM8.5 15.6923C7.0775 15.6923 5.68694 15.2705 4.50417 14.4802C3.3214 13.6899 2.39955 12.5666 1.85518 11.2524C1.31081 9.93815 1.16838 8.49202 1.44589 7.09685C1.72341 5.70168 2.40841 4.42013 3.41427 3.41427C4.42014 2.40841 5.70168 1.72341 7.09685 1.44589C8.49202 1.16837 9.93816 1.31081 11.2524 1.85517C12.5666 2.39954 13.6899 3.3214 14.4802 4.50417C15.2705 5.68694 15.6923 7.07749 15.6923 8.5C15.6901 10.4069 14.9317 12.235 13.5833 13.5833C12.235 14.9317 10.4069 15.6901 8.5 15.6923ZM9.80769 12.4231C9.80769 12.5965 9.73881 12.7628 9.61619 12.8854C9.49357 13.008 9.32726 13.0769 9.15385 13.0769C8.80703 13.0769 8.47441 12.9391 8.22917 12.6939C7.98393 12.4487 7.84616 12.116 7.84616 11.7692V8.5C7.67275 8.5 7.50644 8.43111 7.38382 8.30849C7.2612 8.18587 7.19231 8.01956 7.19231 7.84615C7.19231 7.67274 7.2612 7.50643 7.38382 7.38381C7.50644 7.26119 7.67275 7.19231 7.84616 7.19231C8.19298 7.19231 8.52559 7.33008 8.77083 7.57532C9.01607 7.82056 9.15385 8.15318 9.15385 8.5V11.7692C9.32726 11.7692 9.49357 11.8381 9.61619 11.9607C9.73881 12.0834 9.80769 12.2497 9.80769 12.4231ZM7.19231 4.90385C7.19231 4.70987 7.24983 4.52025 7.3576 4.35896C7.46537 4.19767 7.61854 4.07196 7.79775 3.99773C7.97697 3.9235 8.17417 3.90408 8.36442 3.94192C8.55467 3.97976 8.72942 4.07317 8.86659 4.21034C9.00375 4.3475 9.09716 4.52226 9.135 4.71251C9.17285 4.90276 9.15342 5.09996 9.07919 5.27917C9.00496 5.45838 8.87925 5.61156 8.71797 5.71933C8.55668 5.82709 8.36706 5.88461 8.17308 5.88461C7.91296 5.88461 7.6635 5.78128 7.47957 5.59735C7.29564 5.41342 7.19231 5.16396 7.19231 4.90385Z" fill="black"/>
        </svg>
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
