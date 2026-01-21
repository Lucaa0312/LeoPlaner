

let allSubjects = [];        // all Subjects from DB
let selectedSubjects = [];  // selected Subjects for Teacher

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


//add teacher to DB
function addTeacher() {
    const teacherData = {
        teacherName: document.getElementById("first-name-input").value + " " + document.getElementById("last-name-input").value,
        nameSymbol: document.getElementById("initials-input").value,
        teachingSubject: selectedSubjects.map(s => ({ id: s.id }))
    };

    fetch("http://localhost:8080/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teacherData)
    });
}


// Initialize availability day selection
function initAvailabilityDays() {
    const days = document.querySelectorAll("#availability-grid .day");

    days.forEach(day => {
        day.addEventListener("click", () => {
            day.classList.toggle("active");
        });
    });
}

// Image Preview Function
function imagePreview() {
    const input = document.getElementById("teacher-image-input");
    const preview = document.getElementById("avatar-preview");

    input.addEventListener("change", () => {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
        preview.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}


function loadAddTeacherForm() {
    
    const disableOverlay = document.getElementById("disable-overlay");
    disableOverlay.style.display = "block";

    const addTeacherScreen = document.getElementById("add-teacher-screen");
    addTeacherScreen.style.display = "flex";
    addTeacherScreen.style.flexDirection = "column";
    if (!addTeacherScreen) return; 

    const headerContainer = document.createElement("div");
    headerContainer.id = "add-teacher-header-container";
    headerContainer.innerHTML = `
      <h1 id="add-teacher-header">Add new Teacher</h1>`;

    const closeScreenButton = document.createElement("div");
    closeScreenButton.id = "close-add-teacher-screen-btn";
    closeScreenButton.innerHTML = `<i class="fa-regular fa-circle-xmark"></i>`;

    closeScreenButton.onclick = () => {
        addTeacherScreen.style.display = "none";
        disableOverlay.style.display = "none";
    };

    const formContainer = document.createElement("div");
    formContainer.id = "form-container";
    formContainer.innerHTML = `
      <form id="add-teacher-form">
        
        <div class="avatar-upload">
            <input type="file" id="teacher-image-input" name="teacher-image" accept="image/*"/>
            <label for="teacher-image-input" class="avatar-label">
                <img id="avatar-preview" src="../assets/img/userPreview.svg" alt="Upload Photo"/>
            </label>
            <p>Upload Photo</p>
        </div>
        <br>
        <input type="text" id="first-name-input" name="first-name" required placeholder="First Name">
        <br>
        <input type="text" id="last-name-input" name="last-name" required placeholder="Last Name">
        <br>
        <input type="text" id="initials-input" name="initials" required placeholder="Initials">
        <br>
        <input type="email" id="email-input" name="email" required placeholder="Email">
      </form>

      <div id="add-subjects-container">
        <div id="subject-input-container">
            <input type="text" id="subject-input" placeholder="Add Subject"/>
            <img id="add-subject-img" src="../assets/img/magnifyingGlass.png" alt="Add Subject"/>
        </div>

        <div id="subject-dropdown"></div>
        <div id="selected-subjects"></div>
        <div id="workload-input-container">
            <input type="text" id="workload-input" name="workload" required placeholder="Workload (e.g., 22h)">
        </div>
      </div>
    `;

    const availabilityContainer = document.createElement("div");
    availabilityContainer.id = "availability-container";
    availabilityContainer.innerHTML = `
        <div id="availability-header">
            Set Availability
        </div>
        <div id="availability-grid">
            <div class="day active">Mo</div>
            <div class="day">Di</div>
            <div class="day">Mi</div>
            <div class="day">Do</div>
            <div class="day">Fr</div>
        </div>
    `;

    const submitButton = document.createElement("div");
    submitButton.id = "submit-teacher-btn";
    submitButton.textContent = "Submit";
    submitButton.onclick = () => { {
        addTeacher();
        addTeacherScreen.style.display = "none";
        disableOverlay.style.display = "none";
        setTimeout(() => {displayTeachers();}, 80);
    }};

    headerContainer.appendChild(closeScreenButton);

    addTeacherScreen.replaceChildren(headerContainer, formContainer, availabilityContainer, submitButton);

    initAvailabilityDays();
    imagePreview();
    loadSubjects();
    initSubjectSearch();
}





function displayTeachers() {
    fetch("http://localhost:8080/api/teachers")
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                console.log("No teachers found");
                return;
            }
            else {
                document.getElementById("no-teachers").style.display = "none";

                const container = document.getElementById("display-teachers");
                container.innerHTML = "";

                const tableInfo = document.createElement("div");
                tableInfo.id = "table-info";
                tableInfo.innerHTML = `
                    <p id="teacher-left-section">Name</p>
                    <p id="teacher-initials-section">K&uuml;rzel</p>
                    <p id="teacher-subjects-section">F&auml;cher</p>
                    <p id="teacher-workload-section">Arbeitslast</p>
                    <p id="teacher-edit-section">Bearbeiten</p>
                `;
                container.appendChild(tableInfo);
                
                

                data.forEach(teacher => {
                    const card = document.createElement("div");
                    card.className = "teacher-row";

                    // Subjects anzeigen (max 2 + rest als +X)
                    const subjects = teacher.teachingSubject || [];
                    const visibleSubjects = subjects.slice(0, 2);
                    const remaining = subjects.length - visibleSubjects.length;

                    const subjectsHTML = `
                        ${visibleSubjects.map(s =>
                            `<span class="subject-chip">${s.subjectName}</span>`
                        ).join("")}
                        ${remaining > 0 ? `<span class="subject-chip extra">+${remaining}</span>` : ""}
                    `;

                    card.innerHTML = `
                        <div class="teacher-left">
                            <div class="avatar-placeholder">👤</div>
                            <div class="teacher-info">
                                <div class="teacher-name">${teacher.teacherName}</div>
                            </div>
                        </div>

                        <div class="teacher-initials">${teacher.nameSymbol}</div>

                        <div class="teacher-subjects">
                            ${subjectsHTML}
                        </div>

                        <div class="teacher-workload">
                            ${teacher.workload || "—"}
                        </div>

                        <div class="teacher-edit">✏️</div>
                    `;

                    container.appendChild(card);
                });

                const breakDiv = document.createElement("div");
                breakDiv.style.height = "6vh";
                breakDiv.innerHTML = "&nbsp;";

                container.appendChild(breakDiv);
            }
        })
        .catch(err => {
            console.error(err);
            
        });
}

// Search functionality for teachers
function searchTeacher() {
    let query = document.getElementById("teacher-search").value.toLowerCase();
    let rows = document.querySelectorAll(".teacher-row");

    rows.forEach(function (row) {
        let name = row.querySelector(".teacher-name").textContent.toLowerCase();
        let initials = row.querySelector(".teacher-initials").textContent.toLowerCase();
        let subjects = row.querySelector(".teacher-subjects").textContent.toLowerCase();

        if (query === "" || name.includes(query) || initials.includes(query) || subjects.includes(query)) {
            row.style.display = "";
        } 
        else {
            row.style.display = "none";
        }
    });
}


function initializeApp() {
    displayTeachers();
    initNavbar();
}

document.addEventListener("DOMContentLoaded", initializeApp);
document.getElementById("teacher-search").addEventListener("input", searchTeacher);