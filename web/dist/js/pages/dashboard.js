import initNavbar from "./navbar.js";
const statsData = [
    { id: "stat-card-teachers", label: "Gesamte<br>Lehrer:", value: 0 },
    { id: "stat-card-subjects", label: "Gesamte<br>Fächer:", value: 0 },
    { id: "stat-card-rooms", label: "Verfügbare<br>Räume:", value: 0 },
    { id: "stat-card-timetable", label: "Zum<br>Stundenplan:", value: 0 },
];
//Gemerates welcome text based on time of day
function generateWelcomeText() {
    const welcomeTextElement = document.getElementById("welcome-text");
    if (!welcomeTextElement)
        return;
    const hour = new Date().getHours();
    let greeting;
    if (hour >= 5 && hour < 12) {
        greeting = "Guten Morgen";
    }
    else if (hour < 18) {
        greeting = "Guten Nachmittag";
    }
    else {
        greeting = "Guten Abend";
    }
    welcomeTextElement.textContent = `${greeting}, Admin`;
}
//Fetches last update time from GitHub API and displays it
function showLastUpdateTime() {
    const statusCardTextElement = document.getElementById("status-card-text");
    if (!statusCardTextElement)
        return;
    statusCardTextElement.textContent = "Wird geladen...";
}
// Generates dashboard statistics cards
function generateDashboardStats() {
    const statsContainer = document.getElementById("stat-card-container");
    if (!statsContainer)
        return;
    statsContainer.replaceChildren();
    statsData.forEach((stat) => {
        const card = document.createElement("div");
        card.className = "stat-card";
        card.id = stat.id;
        const content = document.createElement("div");
        content.className = "stat-content";
        const label = document.createElement("h2");
        label.className = "stat-text";
        label.innerHTML = stat.label;
        const numb = document.createElement("h1");
        numb.className = "stat-number";
        if (stat.id === "stat-card-timetable") {
        }
        else {
            numb.textContent = String(stat.value);
        }
        content.appendChild(label);
        content.appendChild(numb);
        const arrowIcon = document.createElement("i");
        arrowIcon.className = "fa-solid fa-angle-down stat-arrow-icon";
        card.appendChild(content);
        card.appendChild(arrowIcon);
        statsContainer.appendChild(card);
    });
}
// Initialize the dashboard application
async function initializeApp() {
    initNavbar();
    generateWelcomeText();
    showLastUpdateTime();
    try {
        const [teachers, subjects, rooms] = await Promise.all([
            fetch("http://localhost:8080/api/teachers/getTeacherCount").then(r => r.json()),
            fetch("http://localhost:8080/api/subjects/getSubjectCount").then(r => r.json()),
            fetch("http://localhost:8080/api/rooms/getRoomCount").then(r => r.json()),
        ]);
        statsData[0].value = Number(teachers ?? 0);
        statsData[1].value = Number(subjects ?? 0);
        statsData[2].value = Number(rooms ?? 0);
    }
    catch (e) {
        console.error("Fehler beim Laden:", e);
    }
    generateDashboardStats();
}
document.addEventListener("DOMContentLoaded", initializeApp);
