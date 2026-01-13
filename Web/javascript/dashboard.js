//Dashboard id and Label mapping
const statsData = [
    { id: "stat-card-teachers", label: "Total<br>Teachers:", value: 0 },
    { id: "stat-card-subjects", label: "Total<br>Subjects:", value: 0 },
    { id: "stat-card-rooms", label: "Available<br>Rooms:", value: 0 },
    { id: "stat-card-conflicts", label: "Conflicts:", value: 0 },
];


//load stats from Backend API
function loadSubjects() {
    fetch("http://localhost:8080/api/teachers/getTeacherCount")
        .then(res => res.json())
        .then(data => {
            statsData.value = data;
        })
        .catch(err => console.error(err));
}



//Gemerates welcome text based on time of day
function generateWelcomeText() {
    const welcomeTextElement = document.getElementById("welcome-text");
    if (!welcomeTextElement) return;

    const hour = new Date().getHours();

    let greeting;
    if (hour >= 5 && hour < 12) {
        greeting = "Good morning";
    } else if (hour < 18) {
        greeting = "Good afternoon";
    } else {
        greeting = "Good evening";
    }

    welcomeTextElement.textContent = `${greeting}, Admin`;
}

//Fetches last update time from GitHub API and displays it
function showLastUpdateTime() {
    const statusCardTextElement = document.getElementById("status-card-text");
    if (!statusCardTextElement) return;

    statusCardTextElement.textContent = "Fetching...";
}



// Generates dashboard statistics cards
function generateDashboardStats() {
    const statsContainer = document.getElementById("stat-card-container");
    if (!statsContainer) return;

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

        const number = document.createElement("h1");
        number.className = "stat-number";
        number.textContent = stat.value;

        content.appendChild(label);
        content.appendChild(number);

        const arrowIcon = document.createElement("i");
        arrowIcon.className = "fa-solid fa-angle-down stat-arrow-icon";

        card.appendChild(content);
        card.appendChild(arrowIcon);

        statsContainer.appendChild(card);
    });
}



function initializeApp() {
    initNavbar();
    generateWelcomeText();
    showLastUpdateTime();
    generateDashboardStats();
    generateNavItems();
}

document.addEventListener("DOMContentLoaded", initializeApp);