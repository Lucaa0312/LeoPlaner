

let allSubjects = [];        // all Subjects from DB
let selectedSubjects = [];  // selected Subjects

//load subjects from DB
function loadSubjects() {
    fetch("http://localhost:8080/api/subjects")
        .then(res => res.json())
        .then(data => {
            allSubjects = data;
        })
        .catch(err => console.error(err));
}


// Initialize subject search functionality
function initSubjectSearch() {
    const input = document.getElementById("subject-input");
    const dropdown = document.getElementById("subject-dropdown");

    input.addEventListener("input", () => {
        const query = input.value.toLowerCase();
        dropdown.innerHTML = "";

        if (!query) return;

        const matches = allSubjects.filter(s =>
            s.subjectName.toLowerCase().includes(query) &&
            !selectedSubjects.some(sel => sel.id === s.id)
        );

        if (matches.length === 0) {
            dropdown.innerHTML = `<div class="dropdown-item">No subjects found</div>`;
        }

        matches.forEach(subject => {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.textContent = subject.subjectName;

            item.onclick = () => {
                addSubject(subject);
                dropdown.innerHTML = "";
                input.value = "";
            };

            dropdown.appendChild(item);
        });
    });
}

// Add subject to selected list

function addSubject(subject) {
    selectedSubjects.push(subject);

    const container = document.getElementById("selected-subjects");

    const chip = document.createElement("div");
    chip.className = "subject-chip";
    chip.innerHTML = `
        ${subject.subjectName}
        <span class="remove-chip">×</span>
    `;

    chip.onclick = () => {
        selectedSubjects = selectedSubjects.filter(s => s.id !== subject.id);
        chip.remove();
    };

    container.appendChild(chip);
}


//add subjec to DB
function addSubjec() {
    const subjectData = {
        subjectName: document.getElementById("first-name-input").value + " " + document.getElementById("last-name-input").value,
        nameSymbol: document.getElementById("initials-input").value,
        teachingSubject: selectedSubjects.map(s => ({ id: s.id }))
    };

    fetch("http://localhost:8080/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectData)
    });
}


function loadAddSubjectForm() {

    const subjectOverlay = document.getElementById("subject-overlay");
    const addSubjectScreen = document.getElementById("add-subject-screen");

    subjectOverlay.classList.remove("hide");

    //Header
    const headerContainer = document.createElement("div");
    headerContainer.id = "add-subject-header-container";
    headerContainer.innerHTML = `
      <h1 id="add-subject-header">Ein neues Fach hinzufügen</h1>`;

    //Close btn
    const closeScreenButton = document.createElement("div");
    closeScreenButton.id = "close-add-subject-screen-btn";
    closeScreenButton.innerHTML = `<i class="fa-regular fa-circle-xmark"></i>`;

    closeScreenButton.onclick = () => {
        subjectOverlay.classList.add("hide");
    };

    //Form
    const formContainer = document.createElement("div");
    formContainer.id = "form-container";
    formContainer.innerHTML = `
      <form id="add-subject-form">
        <input type="text" id="name-input" name="name" required placeholder="Name">
        <br>
        <input type="text" id="short-input" name="short" required placeholder="Abkürzung">
      </form>

      <div id="add-rooms-container">
        <div id="room-input-container">
            <input type="text" id="room-input" placeholder="Benötigter Raum Typ"/>
            <img id="add-room-img" src="../assets/img/magnifyingGlass.png" alt="add Room"/>
        </div>

        <div id="room-dropdown"></div>
        <div id="selected-rooms"></div>
      </div>
    `;

    const colorContainer = document.createElement("div");
    colorContainer.id = "color-container";
    colorContainer.innerHTML = `
        <div id="color-header">
            Wähle eine Farbe aus
        </div>
        //COLOR PICKER
            <div id="color-picker">
                <form>
                    <label for="h">
                        Hue:
                        <input id="picker" type="range" value="1" min="0" max="1" step="0.01" name="h" id="h-color">
                    </form>
                    <div id="color-output">
                </div>
            </div>
        </div>
    `;

    const submitButton = document.createElement("div");
    submitButton.id = "submit-subject-btn";
    submitButton.textContent = "Bestätigen";
    submitButton.onclick = () => {
        {
            addSubject();
            subjectOverlay.classList.add("hide")
            setTimeout(() => { displaySubjects(); }, 80);
        }
    };

    headerContainer.appendChild(closeScreenButton);

    addSubjectScreen.replaceChildren(headerContainer, formContainer, colorContainer, submitButton);

    initAvailabilityDays();
    imagePreview();
    loadSubjects();
    initSubjectSearch();
}

function initPicker() {
    const picker = document.getElementById('color-picker');

    const slider = document.getElementById('picker');

    picker.style.setProperty(`--${slider.name}`, slider.value);
}

function displaySubjects() {
    fetch("http://localhost:8080/api/subjects")
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById("display-subjects");
            container.innerHTML = "";

            data.forEach(subject => {
                const card = document.createElement("div");
                card.className = "subject-row";

                // Subjects anzeigen (max 2 + rest als +X)
                const subjects = subject.teachingSubject || [];
                const visibleSubjects = subjects.slice(0, 2);
                const remaining = subjects.length - visibleSubjects.length;

                const subjectsHTML = `
                    ${visibleSubjects.map(s =>
                    `<span class="subject-chip">${s.subjectName}</span>`
                ).join("")}
                    ${remaining > 0 ? `<span class="subject-chip extra">+${remaining}</span>` : ""}
                `;

                card.innerHTML = `
                    <div class="subject-left">
                        <div class="avatar-placeholder">👤</div>
                        <div class="subject-info">
                            <div class="subject-name">${subject.subjectName}</div>
                            <div class="subject-email muted">example@mail.com</div>
                        </div>
                    </div>

                    <div class="subject-initials">${subject.nameSymbol}</div>

                    <div class="subject-subjects">
                        ${subjectsHTML}
                    </div>

                    <div class="subject-workload">
                        ${subject.workload || "—"}
                    </div>

                    <div class="subject-edit">✏️</div>
                `;

                container.appendChild(card);
            });
        })
        .catch(err => console.error(err));
}

function initializeApp() {
    initPicker();
    initNavbar();
}

document.addEventListener("DOMContentLoaded", initializeApp);